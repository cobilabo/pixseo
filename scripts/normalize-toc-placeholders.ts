/**
 * Firestore 上の articles コレクションについて、content / content_ja / content_en /
 * content_zh / content_ko フィールドに残ったエディタ装飾付き目次プレースホルダー
 * （例: <div class="toc-placeholder not-prose" data-toc="auto" contenteditable="false">
 *     <div class="toc-placeholder-inner">...</div></div>）を、シンプルな
 * <div class="toc-placeholder" data-toc="auto"></div> に正規化する。
 *
 * Usage:
 *   npx tsx scripts/normalize-toc-placeholders.ts             # dry-run（差分表示のみ）
 *   npx tsx scripts/normalize-toc-placeholders.ts --apply     # 実際に Firestore を更新
 */
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import { normalizeInlineTocPlaceholder } from '../lib/cleanWordPressHtml';

function resolveServiceAccountPath(): string {
  const root = path.join(__dirname, '..');
  const candidates = [
    path.join(root, 'serviceAccountKey.json'),
    path.join(root, 'pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    'サービスアカウント JSON が見つかりません。' +
      'serviceAccountKey.json または pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json を配置してください。',
  );
}

const serviceAccountPath = resolveServiceAccountPath();
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id || 'pixseo-1eeef',
  });
}

const db = admin.firestore();

const CONTENT_FIELDS = [
  'content',
  'content_ja',
  'content_en',
  'content_zh',
  'content_ko',
] as const;

type ContentField = (typeof CONTENT_FIELDS)[number];

interface ChangeRecord {
  field: ContentField;
  before: string;
  after: string;
}

function detectChanges(data: FirebaseFirestore.DocumentData): ChangeRecord[] {
  const changes: ChangeRecord[] = [];
  for (const field of CONTENT_FIELDS) {
    const value = data[field];
    if (typeof value !== 'string' || value.length === 0) continue;
    if (!value.includes('toc-placeholder') && !value.includes('data-toc=')) continue;
    const normalized = normalizeInlineTocPlaceholder(value);
    if (normalized !== value) {
      changes.push({ field, before: value, after: normalized });
    }
  }
  return changes;
}

async function main() {
  const apply = process.argv.includes('--apply');
  console.log('='.repeat(72));
  console.log(`目次プレースホルダー正規化スクリプト (${apply ? 'APPLY' : 'DRY-RUN'})`);
  console.log('='.repeat(72));

  const snap = await db.collection('articles').get();
  console.log(`対象件数: ${snap.size}`);

  let affected = 0;
  let totalFieldChanges = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const changes = detectChanges(data);
    if (changes.length === 0) continue;

    affected++;
    totalFieldChanges += changes.length;

    console.log(
      `\n[${affected}] id=${doc.id} slug=${data.slug ?? '(なし)'} mediaId=${data.mediaId ?? '(なし)'}`,
    );
    console.log(`  title: ${data.title ?? ''}`);
    for (const c of changes) {
      const beforeLen = c.before.length;
      const afterLen = c.after.length;
      console.log(
        `    - ${c.field}: ${beforeLen} chars -> ${afterLen} chars (${afterLen - beforeLen >= 0 ? '+' : ''}${afterLen - beforeLen})`,
      );
      const beforeSnippet = c.before.slice(Math.max(0, c.before.indexOf('toc-placeholder') - 10), c.before.indexOf('toc-placeholder') + 180);
      console.log(`      before: ${beforeSnippet.replace(/\s+/g, ' ').slice(0, 160)}`);
    }

    if (apply) {
      const update: Record<string, string> = {};
      for (const c of changes) {
        update[c.field] = c.after;
      }
      await doc.ref.update(update);
      console.log(`    ✔ 更新しました`);
    }
  }

  console.log('\n' + '-'.repeat(72));
  console.log(`影響のある記事: ${affected} 件 / 変更フィールド合計: ${totalFieldChanges}`);
  console.log(apply ? '✔ Firestore を更新しました。' : '※ DRY-RUN モードです。実際に更新するには --apply を付けて再実行してください。');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

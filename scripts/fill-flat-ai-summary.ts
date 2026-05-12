/**
 * Flat の記事で `aiSummary_xx` だけが未翻訳の記事を補完する単発スクリプト。
 * `content_xx` を元に generateAISummary(content, lang) で生成し
 * Firestore + Algolia (差分が出るので念のため) を更新する。
 *
 * 実行: npx tsx scripts/fill-flat-ai-summary.ts [--dry-run]
 */
import dotenv from 'dotenv';
import path from 'path';
import * as admin from 'firebase-admin';
import { generateAISummary } from '../lib/openai/translate';
import type { Article } from '../types/article';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

const DRY = process.argv.includes('--dry-run');
const TARGET_LANGS = ['ja', 'en', 'zh', 'ko'] as const;
type Lang = (typeof TARGET_LANGS)[number];

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v !== 'string') return true;
  return v.trim() === '';
}

function convertToDate(value: unknown): Date | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const t = (value as { toDate?: () => Date }).toDate;
    if (typeof t === 'function') return t.call(value);
  }
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return undefined;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY missing');
    process.exit(1);
  }
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: 'pixseo-1eeef',
    });
  }
  const db = admin.firestore();

  const ts = await db.collection('mediaTenants').where('slug', '==', 'flat').limit(1).get();
  if (ts.empty) {
    console.error('flat tenant not found');
    process.exit(1);
  }
  const mediaId = ts.docs[0].id;

  const arts = await db
    .collection('articles')
    .where('mediaId', '==', mediaId)
    .where('isPublished', '==', true)
    .get();

  const canAlgolia =
    !DRY &&
    Boolean(process.env.ALGOLIA_ADMIN_KEY?.trim() && process.env.NEXT_PUBLIC_ALGOLIA_APP_ID?.trim());
  const syncArticleToAlgolia = canAlgolia
    ? (await import('../lib/algolia/sync')).syncArticleToAlgolia
    : null;

  let fixedDocs = 0;
  let totalSummaries = 0;

  for (const doc of arts.docs) {
    const d = doc.data();
    const upd: Record<string, string> = {};
    for (const lang of TARGET_LANGS) {
      const cur = d[`aiSummary_${lang}`];
      if (!isEmpty(cur)) continue;
      const content = d[`content_${lang}`];
      if (isEmpty(content)) continue;
      try {
        const summary = await generateAISummary(content as string, lang);
        if (summary && summary.trim()) {
          upd[`aiSummary_${lang}`] = summary;
        }
      } catch (e) {
        console.error(`  [error] generate aiSummary id=${doc.id} lang=${lang}:`, e);
      }
    }
    if (Object.keys(upd).length === 0) continue;

    const title = (d.title_ja || d.title || '(no title)') as string;
    console.log(`Filling aiSummary: ${title} (slug=${d.slug}, id=${doc.id})`);
    for (const k of Object.keys(upd)) console.log(`  + ${k}`);

    if (DRY) continue;

    await doc.ref.update(upd);
    fixedDocs++;
    totalSummaries += Object.keys(upd).length;

    if (syncArticleToAlgolia) {
      try {
        const fresh = await doc.ref.get();
        const fdata = fresh.data()!;
        const article: Article = {
          id: fresh.id,
          ...fdata,
          publishedAt: convertToDate(fdata.publishedAt) || new Date(),
          updatedAt: convertToDate(fdata.updatedAt) || new Date(),
        } as Article;
        await syncArticleToAlgolia(article);
      } catch (e) {
        console.error(`  [error] Algolia sync id=${doc.id}:`, e);
      }
    }
  }

  console.log(`\nDone. fixedDocs=${fixedDocs}, totalSummaries=${totalSummaries}${DRY ? ' (dry-run)' : ''}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
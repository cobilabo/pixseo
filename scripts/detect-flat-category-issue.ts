/**
 * Flat (the-ayumi.jp) のカテゴリーで name_en/zh/ko に日本語が混入していないか検出する。
 *
 * 実行: npx tsx scripts/detect-flat-category-issue.ts
 */
import dotenv from 'dotenv';
import path from 'path';
import * as admin from 'firebase-admin';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

const TARGET_LANGS = ['en', 'zh', 'ko'] as const;

const CJK_REGEX = /[\u3040-\u30ff\u4e00-\u9fff\uff66-\uff9f]/;

async function main() {
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
  console.log(`mediaId (flat): ${mediaId}\n`);

  const catSnap = await db.collection('categories').where('mediaId', '==', mediaId).get();
  console.log(`categories total: ${catSnap.size}\n`);

  console.log('| name | slug | name_ja | name_en | name_zh | name_ko |');
  console.log('|---|---|---|---|---|---|');
  for (const doc of catSnap.docs) {
    const d = doc.data();
    const cells = [
      d.name ?? '',
      d.slug ?? '',
      d.name_ja ?? '',
      d.name_en ?? '',
      d.name_zh ?? '',
      d.name_ko ?? '',
    ].map((v) => String(v).replace(/\|/g, '/'));
    console.log(`| ${cells.join(' | ')} |`);
  }
  console.log('');

  console.log('--- name_en/zh/ko に日本語(CJK)が混入しているカテゴリ ---');
  let issueCount = 0;
  for (const doc of catSnap.docs) {
    const d = doc.data();
    const issues: string[] = [];
    for (const lang of TARGET_LANGS) {
      const v = d[`name_${lang}`];
      if (typeof v === 'string' && v && CJK_REGEX.test(v)) {
        issues.push(`name_${lang}="${v}"`);
      }
    }
    if (issues.length) {
      issueCount++;
      console.log(`  ${d.name_ja || d.name} (slug=${d.slug}, id=${doc.id})`);
      for (const x of issues) console.log(`    - ${x}`);
    }
  }
  console.log(`\nTotal categories with CJK in non-ja name: ${issueCount}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
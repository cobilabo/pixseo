/**
 * Flat (the-ayumi.jp) の未翻訳フィールドを検出する read-only スクリプト
 *
 * 何もしない: Firestore の読み取り + サマリ出力のみ。
 * 結果を見て scripts/fill-flat-locale.ts (既存) で再翻訳する。
 *
 * 実行:
 *   npx tsx scripts/detect-untranslated-flat.ts
 *   npx tsx scripts/detect-untranslated-flat.ts --details
 */
import dotenv from 'dotenv';
import path from 'path';
import * as admin from 'firebase-admin';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

const SHOW_DETAILS = process.argv.includes('--details');
const TARGET_LANGS = ['en', 'zh', 'ko'] as const;
type TargetLang = (typeof TARGET_LANGS)[number];

const ARTICLE_FIELDS = [
  'title',
  'content',
  'excerpt',
  'metaTitle',
  'metaDescription',
  'aiSummary',
  'featuredImageAlt',
] as const;
type ArticleField = (typeof ARTICLE_FIELDS)[number];

const CATEGORY_FIELDS = ['name', 'description'] as const;
const TAG_FIELDS = ['name'] as const;

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v !== 'string') return true;
  return v.trim() === '';
}

interface MissingArticle {
  id: string;
  slug?: string;
  title?: string;
  isPublished?: boolean;
  missing: { lang: TargetLang; fields: ArticleField[] }[];
}

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
    console.error('[FATAL] flat tenant not found');
    process.exit(1);
  }
  const mediaId = ts.docs[0].id;
  console.log(`mediaId (flat): ${mediaId}\n`);

  const catSnap = await db.collection('categories').where('mediaId', '==', mediaId).get();
  const missingCategories: { id: string; name: string; missing: { lang: TargetLang; fields: string[] }[] }[] = [];
  for (const doc of catSnap.docs) {
    const d = doc.data();
    const missingPerLang: { lang: TargetLang; fields: string[] }[] = [];
    for (const lang of TARGET_LANGS) {
      const fields: string[] = [];
      for (const f of CATEGORY_FIELDS) {
        const baseHas = !isEmpty(d[`${f}_ja`]) || !isEmpty(d[f]);
        if (baseHas && isEmpty(d[`${f}_${lang}`])) fields.push(f);
      }
      if (fields.length) missingPerLang.push({ lang, fields });
    }
    if (missingPerLang.length) {
      missingCategories.push({
        id: doc.id,
        name: (d.name_ja || d.name || '(no name)') as string,
        missing: missingPerLang,
      });
    }
  }

  const tagSnap = await db.collection('tags').where('mediaId', '==', mediaId).get();
  const missingTags: { id: string; name: string; missing: { lang: TargetLang; fields: string[] }[] }[] = [];
  for (const doc of tagSnap.docs) {
    const d = doc.data();
    const missingPerLang: { lang: TargetLang; fields: string[] }[] = [];
    for (const lang of TARGET_LANGS) {
      const fields: string[] = [];
      for (const f of TAG_FIELDS) {
        const baseHas = !isEmpty(d[`${f}_ja`]) || !isEmpty(d[f]);
        if (baseHas && isEmpty(d[`${f}_${lang}`])) fields.push(f);
      }
      if (fields.length) missingPerLang.push({ lang, fields });
    }
    if (missingPerLang.length) {
      missingTags.push({
        id: doc.id,
        name: (d.name_ja || d.name || '(no name)') as string,
        missing: missingPerLang,
      });
    }
  }

  const arts = await db
    .collection('articles')
    .where('mediaId', '==', mediaId)
    .where('isPublished', '==', true)
    .get();

  const missingArticles: MissingArticle[] = [];
  for (const doc of arts.docs) {
    const d = doc.data();
    const missingPerLang: { lang: TargetLang; fields: ArticleField[] }[] = [];
    for (const lang of TARGET_LANGS) {
      const fields: ArticleField[] = [];
      for (const f of ARTICLE_FIELDS) {
        const baseHas = !isEmpty(d[`${f}_ja`]) || !isEmpty(d[f]);
        if (!baseHas) continue;
        if (isEmpty(d[`${f}_${lang}`])) fields.push(f);
      }
      if (fields.length) missingPerLang.push({ lang, fields });
    }
    if (missingPerLang.length) {
      missingArticles.push({
        id: doc.id,
        slug: d.slug,
        title: (d.title_ja || d.title || '(no title)') as string,
        isPublished: d.isPublished,
        missing: missingPerLang,
      });
    }
  }

  console.log('======================================');
  console.log(`Categories: total=${catSnap.size}, missing=${missingCategories.length}`);
  console.log(`Tags:       total=${tagSnap.size}, missing=${missingTags.length}`);
  console.log(`Articles:   total=${arts.size} (published), missing=${missingArticles.length}`);
  console.log('======================================\n');

  if (missingCategories.length) {
    console.log('--- Missing Categories ---');
    for (const c of missingCategories) {
      const langs = c.missing.map((m) => `${m.lang}:[${m.fields.join(',')}]`).join(' ');
      console.log(`  ${c.name}  (id=${c.id})  ${langs}`);
    }
    console.log('');
  }

  if (missingTags.length) {
    console.log('--- Missing Tags ---');
    for (const t of missingTags) {
      const langs = t.missing.map((m) => `${m.lang}:[${m.fields.join(',')}]`).join(' ');
      console.log(`  ${t.name}  (id=${t.id})  ${langs}`);
    }
    console.log('');
  }

  if (missingArticles.length) {
    console.log('--- Missing Articles (published) ---');
    if (SHOW_DETAILS) {
      for (const a of missingArticles) {
        const langs = a.missing.map((m) => `${m.lang}:[${m.fields.join(',')}]`).join(' ');
        console.log(`  ${a.title}  (slug=${a.slug ?? a.id})  ${langs}`);
      }
    } else {
      const perLang: Record<TargetLang, number> = { en: 0, zh: 0, ko: 0 };
      const perField: Record<ArticleField, number> = {
        title: 0,
        content: 0,
        excerpt: 0,
        metaTitle: 0,
        metaDescription: 0,
        aiSummary: 0,
        featuredImageAlt: 0,
      };
      for (const a of missingArticles) {
        for (const m of a.missing) {
          perLang[m.lang] = (perLang[m.lang] ?? 0) + 1;
          for (const f of m.fields) perField[f] = (perField[f] ?? 0) + 1;
        }
      }
      console.log('  by language:', perLang);
      console.log('  by field   :', perField);
      console.log('  (use --details for per-article output)');
      console.log('  first 20:');
      for (const a of missingArticles.slice(0, 20)) {
        const langs = a.missing.map((m) => `${m.lang}:[${m.fields.join(',')}]`).join(' ');
        console.log(`    ${a.title}  (slug=${a.slug ?? a.id})  ${langs}`);
      }
    }
    console.log('');
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
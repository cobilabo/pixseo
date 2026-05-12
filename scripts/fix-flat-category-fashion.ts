/**
 * カテゴリ「着る」(name_en/zh/ko が日本語のまま登録されている) を修正する単発スクリプト。
 *
 * 実行: npx tsx scripts/fix-flat-category-fashion.ts [--dry-run]
 */
import dotenv from 'dotenv';
import path from 'path';
import * as admin from 'firebase-admin';
import { translateText } from '../lib/openai/translate';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

const DRY = process.argv.includes('--dry-run');

const TARGET_LANGS = ['en', 'zh', 'ko'] as const;

const HIRAGANA_KATAKANA_REGEX = /[\u3040-\u30ff\uff66-\uff9f]/;

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

  const catSnap = await db.collection('categories').where('mediaId', '==', mediaId).get();

  let fixed = 0;
  for (const doc of catSnap.docs) {
    const d = doc.data();
    const baseName = (d.name_ja || d.name || '').trim();
    if (!baseName) continue;

    const upd: Record<string, string> = {};
    for (const lang of TARGET_LANGS) {
      const cur = d[`name_${lang}`];
      if (typeof cur === 'string' && cur && !HIRAGANA_KATAKANA_REGEX.test(cur)) continue;
      try {
        const translated = await translateText(baseName, lang, 'category name');
        if (translated && !HIRAGANA_KATAKANA_REGEX.test(translated)) {
          upd[`name_${lang}`] = translated;
        } else {
          console.warn(`  [warn] translation still contains JP: lang=${lang} val="${translated}"`);
        }
      } catch (e) {
        console.error(`  [error] translate lang=${lang}:`, e);
      }
    }
    if (Object.keys(upd).length) {
      console.log(`Fixing category "${baseName}" (slug=${d.slug}, id=${doc.id})`);
      for (const [k, v] of Object.entries(upd)) console.log(`  ${k} -> ${v}`);
      if (!DRY) {
        await doc.ref.update(upd);
        fixed++;
      }
    }
  }
  console.log(`\nFixed: ${fixed}${DRY ? ' (dry-run)' : ''}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
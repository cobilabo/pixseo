// Read-only: counts i18n coverage for mediaTenants slug=flat published articles.
import dotenv from 'dotenv';
import * as path from 'path';
import * as admin from 'firebase-admin';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

const TARGET = ['en', 'zh', 'ko'] as const;

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
    console.error('no flat tenant');
    process.exit(1);
  }
  const mediaId = ts.docs[0].id;
  const arts = await db.collection('articles').where('mediaId', '==', mediaId).where('isPublished', '==', true).get();

  let jaReady = 0;
  const perLang: Record<string, { title: number; content: number; both: number }> = {};
  for (const lang of TARGET) {
    perLang[lang] = { title: 0, content: 0, both: 0 };
  }

  for (const doc of arts.docs) {
    const d = doc.data();
    const jaT = (d.title_ja || d.title || '').trim();
    const jaC = (d.content_ja || d.content || '').trim();
    if (!jaT || !jaC) continue;
    jaReady++;

    for (const lang of TARGET) {
      const t = d[`title_${lang}`]?.toString().trim();
      const c = d[`content_${lang}`]?.toString().trim();
      if (t) perLang[lang].title++;
      if (c) perLang[lang].content++;
      if (t && c) perLang[lang].both++;
    }
  }

  console.log('flat mediaId:', mediaId);
  console.log('published articles:', arts.size);
  console.log('published with JA title+content (script processes these):', jaReady);
  for (const lang of TARGET) {
    const p = perLang[lang];
    console.log(
      `  [${lang}] title: ${p.title}/${jaReady}, content: ${p.content}/${jaReady}, both: ${p.both}/${jaReady}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

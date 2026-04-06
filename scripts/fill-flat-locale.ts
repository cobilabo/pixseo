// Fill missing i18n fields for mediaTenants slug=flat. Requires OPENAI_API_KEY (.env.local) and GOOGLE_APPLICATION_CREDENTIALS.
// Usage: npx tsx scripts/fill-flat-locale.ts [--dry-run]
import dotenv from 'dotenv';
import * as path from 'path';
import * as admin from 'firebase-admin';
import type { Lang } from '../types/lang';
import { translateText, translateArticle, generateAISummary } from '../lib/openai/translate';
import { generateTableOfContents } from '../lib/article-utils';
import type { Article } from '../types/article';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

const TARGET: Lang[] = ['en', 'zh', 'ko'];
const DRY = process.argv.includes('--dry-run');
const MAX_HTML = 8000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

function firestoreDocToArticle(doc: admin.firestore.DocumentSnapshot): Article {
  const data = doc.data();
  if (!data) throw new Error('missing doc');
  return {
    id: doc.id,
    ...data,
    publishedAt: convertToDate(data.publishedAt) || new Date(),
    updatedAt: convertToDate(data.updatedAt) || new Date(),
  } as Article;
}

async function mapNav(items: any[] | undefined, ctx: string): Promise<any[]> {
  if (!items?.length) return items || [];
  const out: any[] = [];
  for (const item of items) {
    const o = { ...item };
    const base = (o.label_ja || o.label || '').trim();
    if (base) {
      for (const lang of TARGET) {
        const k = `label_${lang}`;
        if (!o[k]?.trim()) {
          o[k] = await translateText(base, lang, ctx);
          await sleep(80);
        }
      }
    }
    out.push(o);
  }
  return out;
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
    console.error('no flat tenant');
    process.exit(1);
  }
  const mediaId = ts.docs[0].id;
  console.log('mediaId', mediaId, DRY ? '(dry-run)' : '');

  const tRef = db.collection('mediaTenants').doc(mediaId);
  const raw = (await tRef.get()).data() || {};
  const theme = JSON.parse(JSON.stringify(raw.theme || {}));
  const ms = { ...(theme.menuSettings || {}) };

  for (const key of ['topLabel', 'articlesLabel', 'searchLabel'] as const) {
    const base = ms[key];
    if (typeof base !== 'string' || !base.trim()) continue;
    for (const lang of TARGET) {
      const fk = `${key}_${lang}`;
      if (ms[fk]?.trim()) continue;
      ms[fk] = await translateText(base, lang, 'menu label');
      await sleep(100);
    }
  }
  ms.globalNavItems = await mapNav(ms.globalNavItems, 'navigation');
  ms.navigationItems = await mapNav(ms.navigationItems, 'menu');
  if (ms.customMenus?.length) {
    ms.customMenus = await mapNav(ms.customMenus, 'menu');
  }
  theme.menuSettings = ms;

  if (theme.sideContentItems?.length) {
    const arr: any[] = [];
    for (const it of theme.sideContentItems) {
      if (it.type !== 'html') {
        arr.push(it);
        continue;
      }
      const o = { ...it };
      if (o.title?.trim()) {
        for (const lang of TARGET) {
          const k = `title_${lang}`;
          if (!o[k]?.trim()) o[k] = await translateText(o.title, lang, 'heading');
          await sleep(80);
        }
      }
      const hc = o.htmlCode || '';
      if (hc.trim() && hc.length <= MAX_HTML) {
        for (const lang of TARGET) {
          const k = `htmlCode_${lang}`;
          if (!o[k]?.trim()) o[k] = await translateText(hc, lang, 'HTML keep tags');
          await sleep(200);
        }
      }
      arr.push(o);
    }
    theme.sideContentItems = arr;
  }

  if (!DRY) await tRef.update({ theme });
  console.log('theme OK');

  const pagesSnap = await db.collection('pages').where('mediaId', '==', mediaId).get();
  for (const doc of pagesSnap.docs) {
    const p = doc.data();
    const upd: Record<string, unknown> = {};
    const block = p.useBlockBuilder === true;
    const pairs: [string, string][] = [
      ['title_ja', 'title'],
      ['excerpt_ja', 'excerpt'],
      ['metaTitle_ja', 'metaTitle'],
      ['metaDescription_ja', 'metaDescription'],
      ['featuredImageAlt_ja', 'featuredImageAlt'],
    ];
    if (!block) pairs.push(['content_ja', 'content']);
    for (const [jaK, baseK] of pairs) {
      const base = String(p[jaK] ?? p[baseK] ?? '').trim();
      if (!base) continue;
      if (baseK === 'content' && base.length > 60000) continue;
      for (const lang of TARGET) {
        const fk = `${baseK}_${lang}`;
        if (p[fk]?.toString().trim()) continue;
        upd[fk] = await translateText(base, lang, 'static page');
        await sleep(100);
      }
    }
    if (Object.keys(upd).length && !DRY) await doc.ref.update(upd);
  }
  console.log('pages OK');

  const catSnap = await db.collection('categories').where('mediaId', '==', mediaId).get();
  for (const doc of catSnap.docs) {
    const c = doc.data();
    const upd: Record<string, unknown> = {};
    const nj = (c.name_ja || c.name || '').trim();
    if (nj) {
      for (const lang of TARGET) {
        const k = `name_${lang}`;
        if (!c[k]?.toString().trim()) {
          upd[k] = await translateText(nj, lang, 'category name');
          await sleep(80);
        }
      }
    }
    const dj = (c.description_ja || c.description || '').trim();
    if (dj) {
      for (const lang of TARGET) {
        const k = `description_${lang}`;
        if (!c[k]?.toString().trim()) {
          upd[k] = await translateText(dj, lang, 'category description');
          await sleep(80);
        }
      }
    }
    if (Object.keys(upd).length && !DRY) await doc.ref.update(upd);
  }
  console.log('categories OK');

  const arts = await db.collection('articles').where('mediaId', '==', mediaId).where('isPublished', '==', true).get();
  console.log('articles', arts.size);

  const canAlgolia =
    !DRY &&
    Boolean(process.env.ALGOLIA_ADMIN_KEY?.trim() && process.env.NEXT_PUBLIC_ALGOLIA_APP_ID?.trim());

  const syncArticleToAlgolia = canAlgolia
    ? (await import('../lib/algolia/sync')).syncArticleToAlgolia
    : null;

  let articleFirestoreUpdates = 0;
  let articleLoopErrors = 0;

  for (const doc of arts.docs) {
    try {
      const d = doc.data();
      const upd: Record<string, unknown> = {};
      const jaT = (d.title_ja || d.title || '').trim();
      const jaC = (d.content_ja || d.content || '').trim();
      const jaE = (d.excerpt_ja ?? d.excerpt ?? '') as string;
      const jaMT = (d.metaTitle_ja || d.metaTitle || jaT) as string;
      const jaMD = (d.metaDescription_ja || d.metaDescription || jaE) as string;
      if (!jaT || !jaC) {
        await sleep(400);
        continue;
      }

      for (const lang of TARGET) {
        if (d[`title_${lang}`]?.toString().trim() && d[`content_${lang}`]?.toString().trim()) continue;
        try {
          const tr = await translateArticle(
            {
              title: jaT,
              content: jaC,
              excerpt: jaE || jaT.slice(0, 200),
              metaTitle: jaMT,
              metaDescription: jaMD || jaE,
            },
            lang
          );
          upd[`title_${lang}`] = tr.title;
          upd[`content_${lang}`] = tr.content;
          upd[`excerpt_${lang}`] = tr.excerpt;
          upd[`metaTitle_${lang}`] = tr.metaTitle;
          upd[`metaDescription_${lang}`] = tr.metaDescription;
          upd[`tableOfContents_${lang}`] = generateTableOfContents(tr.content);
          try {
            upd[`aiSummary_${lang}`] = await generateAISummary(tr.content, lang);
          } catch {
            /* noop */
          }
        } catch (langErr) {
          console.error(`[fill-flat-locale] article ${doc.id} lang ${lang}:`, langErr);
        }
        await sleep(300);
      }

      const alt = (d.featuredImageAlt || '').trim();
      if (alt) {
        for (const lang of TARGET) {
          const k = `featuredImageAlt_${lang}`;
          if (d[k]?.toString().trim()) continue;
          try {
            upd[k] = await translateText(alt, lang, 'image alt');
          } catch (altErr) {
            console.error(`[fill-flat-locale] article ${doc.id} ${k}:`, altErr);
          }
          await sleep(80);
        }
      }

      if (Object.keys(upd).length && !DRY) {
        await doc.ref.update(upd);
        articleFirestoreUpdates++;
        if (syncArticleToAlgolia) {
          try {
            const fresh = await doc.ref.get();
            await syncArticleToAlgolia(firestoreDocToArticle(fresh));
          } catch (algErr) {
            console.error(`[fill-flat-locale] Algolia sync ${doc.id}:`, algErr);
          }
        }
      }
    } catch (e) {
      articleLoopErrors++;
      console.error(`[fill-flat-locale] article ${doc.id}:`, e);
    }
    await sleep(400);
  }

  console.log('articles summary', {
    total: arts.size,
    firestoreUpdates: articleFirestoreUpdates,
    loopErrors: articleLoopErrors,
    algoliaAfterEachUpdate: canAlgolia,
  });
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

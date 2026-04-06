/**
 * Replace the-ayumi.jp/wp-content/uploads URLs using mediaLibrary wpOriginalUrl -> url.
 * Usage: npx tsx scripts/rewrite-wp-content-from-media-library.ts [--apply] [--mediaId=id] [--collection=articles|pages|writers]
 */
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildWpMediaReplacementMapFromDocs,
  rewriteArticleWpMediaUrls,
  rewritePageWpMediaUrls,
  rewriteWpUploadUrlsInString,
  articleMayContainWpUploads,
  pageMayContainWpUploads,
  writerMayContainWpUploads,
} from '../lib/article-utils';
import type { Article } from '../types/article';
import type { Page } from '../types/page';
import type { Writer } from '../types/writer';

const serviceAccountPath = path.join(__dirname, '..', 'pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'pixseo-1eeef',
  });
}

const db = admin.firestore();

type Col = 'articles' | 'pages' | 'writers';

function parseCli() {
  let apply = false;
  let mediaId: string | null = null;
  let collection: Col | 'all' = 'all';
  for (const a of process.argv.slice(2)) {
    if (a === '--apply') apply = true;
    if (a.startsWith('--mediaId=')) mediaId = a.slice('--mediaId='.length);
    if (a.startsWith('--collection=')) {
      const v = a.slice('--collection='.length);
      if (v === 'articles' || v === 'pages' || v === 'writers') collection = v;
    }
  }
  return { apply, mediaId, collection };
}

const ARTICLE_PATCH_FIELDS = [
  'content',
  'content_ja',
  'content_en',
  'content_zh',
  'content_ko',
  'excerpt',
  'excerpt_ja',
  'excerpt_en',
  'excerpt_zh',
  'excerpt_ko',
  'featuredImage',
  'faqs',
  'faqs_ja',
  'faqs_en',
  'faqs_zh',
  'faqs_ko',
] as const;

const PAGE_PATCH_FIELDS = [
  'content',
  'content_ja',
  'content_en',
  'content_zh',
  'content_ko',
  'excerpt',
  'excerpt_ja',
  'excerpt_en',
  'excerpt_zh',
  'excerpt_ko',
  'featuredImage',
  'blocks',
] as const;

async function main() {
  const { apply, mediaId, collection } = parseCli();
  const mediaSnap = await db.collection('mediaLibrary').get();
  const map = buildWpMediaReplacementMapFromDocs(mediaSnap.docs);
  console.log('mediaLibrary map keys:', map.size, { apply, mediaId, collection });
  if (map.size === 0) return;

  let updatedArticles = 0;
  let updatedPages = 0;
  let updatedWriters = 0;

  if (collection === 'all' || collection === 'articles') {
    let q: admin.firestore.Query = db.collection('articles');
    if (mediaId) q = q.where('mediaId', '==', mediaId);
    const snap = await q.get();
    for (const doc of snap.docs) {
      const data = doc.data();
      const article = { id: doc.id, ...data } as Article;
      if (!articleMayContainWpUploads(article)) continue;
      rewriteArticleWpMediaUrls(article, map);
      const patch: Record<string, unknown> = {};
      for (const f of ARTICLE_PATCH_FIELDS) {
        const next = (article as Record<string, unknown>)[f];
        if (next !== undefined && JSON.stringify(next) !== JSON.stringify(data[f])) {
          patch[f] = next;
        }
      }
      if (Object.keys(patch).length === 0) continue;
      updatedArticles += 1;
      if (apply) {
        await doc.ref.update({
          ...patch,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }

  if (collection === 'all' || collection === 'pages') {
    let q: admin.firestore.Query = db.collection('pages');
    if (mediaId) q = q.where('mediaId', '==', mediaId);
    const snap = await q.get();
    for (const doc of snap.docs) {
      const data = doc.data();
      const page = {
        id: doc.id,
        ...data,
        publishedAt: data.publishedAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      } as Page;
      if (!pageMayContainWpUploads(page)) continue;
      rewritePageWpMediaUrls(page, map);
      const patch: Record<string, unknown> = {};
      for (const k of PAGE_PATCH_FIELDS) {
        const next = (page as Record<string, unknown>)[k];
        if (next !== undefined && JSON.stringify(next) !== JSON.stringify(data[k])) {
          patch[k] = next;
        }
      }
      if (Object.keys(patch).length === 0) continue;
      updatedPages += 1;
      if (apply) {
        await doc.ref.update({
          ...patch,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }

  if (collection === 'all' || collection === 'writers') {
    let q: admin.firestore.Query = db.collection('writers');
    if (mediaId) q = q.where('mediaId', '==', mediaId);
    const snap = await q.get();
    for (const doc of snap.docs) {
      const data = doc.data();
      const icon = (data.icon || data.iconUrl || '') as string;
      const backgroundImage = (data.backgroundImage || data.backgroundImageUrl || '') as string;
      const writer = {
        id: doc.id,
        handleName: data.handleName || '',
        icon: icon || undefined,
        backgroundImage: backgroundImage || undefined,
        mediaId: data.mediaId || '',
      } as Writer;
      if (!writerMayContainWpUploads(writer)) continue;
      const patch: Record<string, unknown> = {};
      const newIcon = icon ? rewriteWpUploadUrlsInString(icon, map) : '';
      const newBg = backgroundImage ? rewriteWpUploadUrlsInString(backgroundImage, map) : '';
      if (newIcon && newIcon !== icon) patch.icon = newIcon;
      if (newBg && newBg !== backgroundImage) patch.backgroundImage = newBg;
      if (Object.keys(patch).length === 0) continue;
      updatedWriters += 1;
      if (apply) {
        await doc.ref.update({
          ...patch,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }

  console.log('done', { updatedArticles, updatedPages, updatedWriters });
  if (!apply) console.log('Dry run. Use --apply to write Firestore.');
}

main().catch(console.error);

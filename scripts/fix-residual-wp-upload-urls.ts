/**
 * mediaLibrary にマッチしない残存 wp-content/uploads URL を修正する。
 *
 * Usage:
 *   npx tsx scripts/fix-residual-wp-upload-urls.ts           # dry-run
 *   npx tsx scripts/fix-residual-wp-upload-urls.ts --apply    # Firestore 書き込み
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import he from 'he';
import {
  buildWpMediaReplacementMapFromDocs,
  rewriteArticleWpMediaUrls,
  WP_UPLOAD_IMAGE_RE,
} from '../lib/article-utils';
import type { Article } from '../types/article';

const serviceAccountPath = path.join(
  __dirname,
  '..',
  'pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json'
);
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'pixseo-1eeef',
  });
}

const db = admin.firestore();

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

function parseApply(): boolean {
  return process.argv.slice(2).includes('--apply');
}

function normalizeWpUrlsInHtml(html: string, map: Map<string, string>): string {
  if (!html || !html.includes('wp-content')) return html;

  let out = he.decode(html);
  out = out.replace(WP_UPLOAD_IMAGE_RE, (match) => {
    const decoded = he.decode(match);
    for (const key of [match, decoded]) {
      const hit = map.get(key);
      if (hit) return hit;
    }
    return match;
  });

  if (!out.includes('wp-content/uploads')) return out;

  const $ = cheerio.load(out, { decodeEntities: false });
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (src.includes('wp-content/uploads')) {
      $(el).remove();
    }
  });
  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('wp-content/uploads')) {
      $(el).replaceWith($(el).html() || '');
    }
  });

  return $.root().html() || out;
}

function patchArticleFields(
  article: Article,
  data: Record<string, unknown>,
  map: Map<string, string>
): Record<string, unknown> {
  rewriteArticleWpMediaUrls(article, map);

  const a = article as unknown as Record<string, unknown>;
  for (const f of ARTICLE_PATCH_FIELDS) {
    if (typeof a[f] === 'string') {
      a[f] = normalizeWpUrlsInHtml(a[f] as string, map);
    }
  }

  const patch: Record<string, unknown> = {};
  for (const f of ARTICLE_PATCH_FIELDS) {
    const next = a[f];
    if (next !== undefined && JSON.stringify(next) !== JSON.stringify(data[f])) {
      patch[f] = next;
    }
  }
  return patch;
}

async function main(): Promise<void> {
  const apply = parseApply();
  console.log({ apply });

  const mediaSnap = await db.collection('mediaLibrary').get();
  const map = buildWpMediaReplacementMapFromDocs(mediaSnap.docs);
  console.log('mediaLibrary map keys:', map.size);

  const auditSummaryPath = path.join(__dirname, 'audit-wp-uploads-summary.csv');
  if (!fs.existsSync(auditSummaryPath)) {
    console.error('Run npm run audit:wp-uploads first.');
    process.exit(1);
  }

  const lines = fs.readFileSync(auditSummaryPath, 'utf-8').trim().split('\n').slice(1);
  const docIds = [...new Set(lines.map((l) => l.split(',')[1]).filter(Boolean))];
  console.log('target docIds:', docIds);

  let updated = 0;
  for (const docId of docIds) {
    const ref = db.collection('articles').doc(docId);
    const doc = await ref.get();
    if (!doc.exists) {
      console.warn('missing:', docId);
      continue;
    }
    const data = doc.data() as Record<string, unknown>;
    const article = { id: doc.id, ...data } as Article;
    const patch = patchArticleFields(article, data, map);
    if (Object.keys(patch).length === 0) {
      console.log('no change:', docId, data.slug);
      continue;
    }
    updated += 1;
    console.log('will update:', docId, data.slug, Object.keys(patch));
    if (apply) {
      await ref.update({
        ...patch,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  console.log('updated articles:', updated);
  if (!apply) console.log('Dry run. Use --apply to write Firestore.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
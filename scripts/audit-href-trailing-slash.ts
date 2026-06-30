/**
 * Firestore 内 href のうち、内部リンクで末尾スラッシュが欠けているものを棚卸しする（読み取り専用）。
 *
 * Usage:
 *   npx tsx scripts/audit-href-trailing-slash.ts
 *   npx tsx scripts/audit-href-trailing-slash.ts --mediaId=XXX
 */

import * as fs from 'fs';
import * as path from 'path';
import { initFirestoreAdmin } from './lib/firestore-bootstrap';
import { SUPPORTED_LANGS } from '../types/lang';

const DEFAULT_MEDIA_ID = 'vLXNATzVNoJc9dIGggPi';
const LANG_PATTERN = SUPPORTED_LANGS.join('|');
const AYUMI_HOST_RE = /^https?:\/\/(?:www\.)?the-ayumi\.jp/i;
const HREF_RE = /href=(["'])([^"']*)\1/gi;

type Col = 'articles' | 'pages' | 'writers';

type Finding = {
  collection: Col;
  docId: string;
  slug: string;
  field: string;
  href: string;
  pathOnly: string;
  pattern: string;
};

function parseCli() {
  const mediaId =
    process.argv.find((a) => a.startsWith('--mediaId='))?.slice('--mediaId='.length) ||
    DEFAULT_MEDIA_ID;
  return { mediaId };
}

function stripQueryHash(raw: string): string {
  return raw.split('#')[0].split('?')[0];
}

function isSkippableHref(href: string): boolean {
  const h = href.trim();
  if (!h || h.startsWith('#') || h.startsWith('mailto:') || h.startsWith('tel:') || h.startsWith('javascript:')) {
    return true;
  }
  if (h.includes('wp-content/') || h.includes('wp-admin/') || h.includes('wp-includes/')) {
    return true;
  }
  if (/\.(jpe?g|png|gif|webp|svg|pdf|zip|docx?|xlsx?|mp4|mov)(\?|#|$)/i.test(h)) {
    return true;
  }
  return false;
}

function toSitePath(href: string): string | null {
  const h = href.trim();
  if (isSkippableHref(h)) return null;

  if (AYUMI_HOST_RE.test(h)) {
    const p = h.replace(AYUMI_HOST_RE, '').replace(/^\/+/, '');
    return p ? `/${p}` : '/';
  }
  if (/^the-ayumi\.jp\//i.test(h)) {
    return `/${h.replace(/^the-ayumi\.jp\//i, '')}`;
  }
  if (h.startsWith('/')) {
    return h;
  }
  if (/^https?:\/\//i.test(h)) {
    return null;
  }
  return null;
}

function classifyPath(pathOnly: string): string {
  const p = pathOnly.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!p) return 'root';

  if (/^\d{4}\/\d{2}\/\d{2}\/[^/]+$/.test(p)) return 'wp-date-article';
  if (p.startsWith('category/')) return 'wp-category';
  if (p.startsWith('tag/')) return 'wp-tag';
  if (p.startsWith('author/')) return 'wp-author';
  if (p.startsWith('articles/')) return 'legacy-article';

  const langArticle = p.match(new RegExp(`^(${LANG_PATTERN})/articles/([^/]+)$`, 'i'));
  if (langArticle) return 'lang-article';

  const langCategory = p.match(new RegExp(`^(${LANG_PATTERN})/categories/([^/]+)$`, 'i'));
  if (langCategory) return 'lang-category';

  const langTag = p.match(new RegExp(`^(${LANG_PATTERN})/tags/([^/]+)$`, 'i'));
  if (langTag) return 'lang-tag';

  const langWriter = p.match(new RegExp(`^(${LANG_PATTERN})/writers/([^/]+)$`, 'i'));
  if (langWriter) return 'lang-writer';

  const langOnly = p.match(new RegExp(`^(${LANG_PATTERN})$`, 'i'));
  if (langOnly) return 'lang-home';

  const langSub = p.match(new RegExp(`^(${LANG_PATTERN})/([^/]+)$`, 'i'));
  if (langSub) return 'lang-fixed-page';

  const langNested = p.match(new RegExp(`^(${LANG_PATTERN})/`, 'i'));
  if (langNested) return 'lang-other';

  if (p.startsWith('categories/')) return 'legacy-category';
  if (p.startsWith('tags/')) return 'legacy-tag';
  if (p.startsWith('writers/')) return 'legacy-writer';

  if (/^[a-z0-9-]+$/i.test(p)) return 'root-fixed-page';

  return 'other-internal';
}

function isInternalRoutePath(sitePath: string): boolean {
  const pattern = classifyPath(stripQueryHash(sitePath));
  return pattern !== 'other-internal' || /^\/(?:ja|en|zh|ko)(?:\/|$)/i.test(sitePath);
}

function needsTrailingSlash(href: string): boolean {
  const sitePath = toSitePath(href);
  if (!sitePath) return false;

  const pathOnly = stripQueryHash(sitePath);
  if (pathOnly.endsWith('/')) return false;
  if (/\.(xml|json|txt)$/i.test(pathOnly)) return false;

  return isInternalRoutePath(pathOnly);
}

function scanHtml(
  html: string,
  collection: Col,
  docId: string,
  slug: string,
  field: string,
  out: Finding[]
): void {
  if (!html || typeof html !== 'string') return;
  HREF_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = HREF_RE.exec(html)) !== null) {
    const href = m[2];
    if (!needsTrailingSlash(href)) continue;
    const sitePath = toSitePath(href)!;
    const pathOnly = stripQueryHash(sitePath);
    out.push({
      collection,
      docId,
      slug,
      field,
      href,
      pathOnly,
      pattern: classifyPath(pathOnly),
    });
  }
}

function scanValueRecursive(
  value: unknown,
  fieldPath: string,
  collection: Col,
  docId: string,
  slug: string,
  out: Finding[]
): void {
  if (typeof value === 'string') {
    if (fieldPath.includes('html') || value.includes('href=')) {
      scanHtml(value, collection, docId, slug, fieldPath, out);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      scanValueRecursive(value[i], `${fieldPath}[${i}]`, collection, docId, slug, out);
    }
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const next = fieldPath ? `${fieldPath}.${k}` : k;
      scanValueRecursive(v, next, collection, docId, slug, out);
    }
  }
}

const TEXT_FIELDS = [
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
] as const;

async function scanCollection(
  db: FirebaseFirestore.Firestore,
  collection: Col,
  mediaId: string
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const snap = await db.collection(collection).where('mediaId', '==', mediaId).get();

  for (const doc of snap.docs) {
    const data = doc.data();
    const slug = (data.slug as string) || (data.title as string) || doc.id;

    if (collection === 'pages' || collection === 'writers') {
      scanValueRecursive(data, '', collection, doc.id, slug, findings);
      continue;
    }

    for (const field of TEXT_FIELDS) {
      const raw = data[field];
      if (typeof raw === 'string' && raw) {
        scanHtml(raw, collection, doc.id, slug, field, findings);
      }
    }
    if (Array.isArray(data.blocks)) {
      scanValueRecursive(data.blocks, 'blocks', collection, doc.id, slug, findings);
    }
  }

  return findings;
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const { mediaId } = parseCli();
  const db = initFirestoreAdmin();

  console.log('='.repeat(60));
  console.log('href 末尾スラッシュ欠落 棚卸し（読み取り専用）');
  console.log(`mediaId: ${mediaId}`);
  console.log('='.repeat(60));

  const all: Finding[] = [];
  for (const col of ['articles', 'pages', 'writers'] as Col[]) {
    const part = await scanCollection(db, col, mediaId);
    const docCount = new Set(part.map((f) => f.docId)).size;
    console.log(`\n${col}: ${part.length} 件の href（${docCount} ドキュメント）`);
    all.push(...part);
  }

  const uniqueHrefs = new Map<string, number>();
  const patternCounts = new Map<string, number>();
  const docKeys = new Set<string>();
  const fieldCounts = new Map<string, number>();

  for (const f of all) {
    uniqueHrefs.set(f.href, (uniqueHrefs.get(f.href) || 0) + 1);
    patternCounts.set(f.pattern, (patternCounts.get(f.pattern) || 0) + 1);
    docKeys.add(`${f.collection}:${f.docId}`);
    fieldCounts.set(f.field, (fieldCounts.get(f.field) || 0) + 1);
  }

  console.log('\n--- サマリ ---');
  console.log(`総 href 出現数: ${all.length}`);
  console.log(`ユニーク href 数: ${uniqueHrefs.size}`);
  console.log(`該当ドキュメント数: ${docKeys.size}`);

  console.log('\nパターン別:');
  for (const [pat, count] of [...patternCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${pat}: ${count}`);
  }

  console.log('\nフィールド別（上位10）:');
  for (const [field, count] of [...fieldCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${field}: ${count}`);
  }

  console.log('\n頻出 href（上位20）:');
  for (const [href, count] of [...uniqueHrefs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${count}x  ${href}`);
  }

  const outPath = path.join(__dirname, 'audit-href-trailing-slash.csv');
  const header = ['collection', 'docId', 'slug', 'field', 'pattern', 'href', 'pathOnly'].join(',');
  const rows = all.map((f) =>
    [f.collection, f.docId, f.slug, f.field, f.pattern, f.href, f.pathOnly].map(csvCell).join(',')
  );
  fs.writeFileSync(outPath, [header, ...rows].join('\n'), 'utf-8');
  console.log(`\n詳細 CSV: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

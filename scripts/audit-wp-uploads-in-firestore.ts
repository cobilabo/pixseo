/**
 * Firestore (articles / pages / writers) に残存している
 * https://the-ayumi.jp/wp-content/uploads/... の URL を棚卸しする読み取り専用スクリプト。
 *
 * 何のための作業か:
 *   WordPress 移行後、本文・抜粋・featuredImage 等に旧 WP の画像 URL が残っていると、
 *   現行サイトでは Vercel WAF が 403 で deny するため画像が表示されない。
 *   さらに Google Search Console にも「アクセス禁止 (403) が原因でブロックされました」として
 *   再クロールのたびに記録される。本スクリプトでまず実態を可視化する。
 *
 * 出力:
 *   - scripts/audit-wp-uploads-summary.csv: 1 行 = 1 ドキュメント。検出件数と置換可否を集計。
 *   - scripts/audit-wp-uploads-urls.csv:    1 行 = 1 URL 発見。collection / docId / field / url / 置換可否 / 置換先。
 *   - 標準出力に集計サマリ。
 *
 * Usage:
 *   npx tsx scripts/audit-wp-uploads-in-firestore.ts
 *   npx tsx scripts/audit-wp-uploads-in-firestore.ts --mediaId=XXX
 *   npx tsx scripts/audit-wp-uploads-in-firestore.ts --collection=articles
 *   npx tsx scripts/audit-wp-uploads-in-firestore.ts --limit=10
 *
 * このスクリプトは Firestore を **書き換えません**。
 * 置換を実行したい場合は、続けて scripts/rewrite-wp-content-from-media-library.ts を使う。
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildWpMediaReplacementMapFromDocs,
  WP_UPLOAD_IMAGE_RE,
} from '../lib/article-utils';

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

type Col = 'articles' | 'pages' | 'writers';

type Cli = {
  mediaId: string | null;
  collection: Col | 'all';
  limit: number | null;
  outDir: string;
};

function parseCli(): Cli {
  const out: Cli = {
    mediaId: null,
    collection: 'all',
    limit: null,
    outDir: path.join('scripts'),
  };
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--mediaId=')) out.mediaId = a.slice('--mediaId='.length);
    else if (a.startsWith('--collection=')) {
      const v = a.slice('--collection='.length);
      if (v === 'articles' || v === 'pages' || v === 'writers') out.collection = v;
    } else if (a.startsWith('--limit=')) {
      const n = parseInt(a.slice('--limit='.length), 10);
      if (Number.isFinite(n) && n > 0) out.limit = n;
    } else if (a.startsWith('--outDir=')) {
      out.outDir = a.slice('--outDir='.length);
    }
  }
  return out;
}

/**
 * 値 (string | object | array) を再帰的にスキャンし、含まれる WP upload URL を
 * field path (`content.ja` 等) 付きで列挙する。
 */
function findWpUrlsRecursive(
  value: unknown,
  fieldPath: string,
  out: { field: string; url: string }[]
): void {
  if (typeof value === 'string') {
    if (!value.includes('wp-content')) return;
    const matches = value.match(WP_UPLOAD_IMAGE_RE);
    if (!matches) return;
    for (const m of matches) {
      out.push({ field: fieldPath, url: m });
    }
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      findWpUrlsRecursive(value[i], `${fieldPath}[${i}]`, out);
    }
    return;
  }
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    for (const k of Object.keys(o)) {
      const next = fieldPath ? `${fieldPath}.${k}` : k;
      findWpUrlsRecursive(o[k], next, out);
    }
  }
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

type DocSummary = {
  collection: Col;
  docId: string;
  mediaId: string;
  slug: string;
  totalUrls: number;
  uniqueUrls: number;
  replaceable: number;
  unreplaceable: number;
};

type UrlRow = {
  collection: Col;
  docId: string;
  mediaId: string;
  slug: string;
  field: string;
  url: string;
  replaceable: boolean;
  replacementUrl: string;
};

function lookupReplacement(map: Map<string, string>, href: string): string | undefined {
  if (map.has(href)) return map.get(href);
  try {
    const u = new URL(href);
    let host = u.hostname.toLowerCase();
    if (host.startsWith('www.')) host = host.slice(4);
    const variants = [
      `https://${host}${decodeURI(u.pathname)}`,
      `https://${host}${u.pathname}`,
      `http://${host}${decodeURI(u.pathname)}`,
    ];
    for (const v of variants) {
      const hit = map.get(v);
      if (hit) return hit;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

async function processCollection(
  col: Col,
  cli: Cli,
  map: Map<string, string>,
  docRows: DocSummary[],
  urlRows: UrlRow[]
): Promise<void> {
  let q: admin.firestore.Query = db.collection(col);
  if (cli.mediaId) q = q.where('mediaId', '==', cli.mediaId);
  const snap = await q.get();
  let scanned = 0;
  for (const doc of snap.docs) {
    if (cli.limit !== null && docRows.length >= cli.limit) break;
    const data = doc.data() as Record<string, unknown>;
    const found: { field: string; url: string }[] = [];
    findWpUrlsRecursive(data, '', found);
    scanned += 1;
    if (found.length === 0) continue;

    const uniq = new Set<string>();
    let replaceable = 0;
    for (const f of found) {
      if (uniq.has(f.url)) continue;
      uniq.add(f.url);
      const rep = lookupReplacement(map, f.url);
      if (rep) replaceable += 1;
      urlRows.push({
        collection: col,
        docId: doc.id,
        mediaId: (data.mediaId as string) || '',
        slug: (data.slug as string) || '',
        field: f.field,
        url: f.url,
        replaceable: Boolean(rep),
        replacementUrl: rep || '',
      });
    }

    docRows.push({
      collection: col,
      docId: doc.id,
      mediaId: (data.mediaId as string) || '',
      slug: (data.slug as string) || '',
      totalUrls: found.length,
      uniqueUrls: uniq.size,
      replaceable,
      unreplaceable: uniq.size - replaceable,
    });
  }
  console.log(`[${col}] scanned=${scanned} hit=${docRows.filter((r) => r.collection === col).length}`);
}

async function main(): Promise<void> {
  const cli = parseCli();
  console.log('args:', cli);

  const mediaSnap = await db.collection('mediaLibrary').get();
  const map = buildWpMediaReplacementMapFromDocs(mediaSnap.docs);
  console.log('mediaLibrary lookup keys:', map.size);

  const docRows: DocSummary[] = [];
  const urlRows: UrlRow[] = [];

  const cols: Col[] =
    cli.collection === 'all' ? ['articles', 'pages', 'writers'] : [cli.collection];
  for (const col of cols) {
    await processCollection(col, cli, map, docRows, urlRows);
  }

  fs.mkdirSync(cli.outDir, { recursive: true });
  const summaryPath = path.join(cli.outDir, 'audit-wp-uploads-summary.csv');
  const urlsPath = path.join(cli.outDir, 'audit-wp-uploads-urls.csv');

  const summaryHeader = [
    'collection',
    'docId',
    'mediaId',
    'slug',
    'totalUrls',
    'uniqueUrls',
    'replaceable',
    'unreplaceable',
  ];
  const summaryLines = [summaryHeader.join(',')];
  for (const r of docRows) {
    summaryLines.push(
      [
        r.collection,
        r.docId,
        r.mediaId,
        r.slug,
        r.totalUrls,
        r.uniqueUrls,
        r.replaceable,
        r.unreplaceable,
      ]
        .map(csvCell)
        .join(',')
    );
  }
  fs.writeFileSync(summaryPath, summaryLines.join('\n') + '\n', 'utf-8');

  const urlsHeader = [
    'collection',
    'docId',
    'mediaId',
    'slug',
    'field',
    'url',
    'replaceable',
    'replacementUrl',
  ];
  const urlsLines = [urlsHeader.join(',')];
  for (const r of urlRows) {
    urlsLines.push(
      [
        r.collection,
        r.docId,
        r.mediaId,
        r.slug,
        r.field,
        r.url,
        r.replaceable ? 'yes' : 'no',
        r.replacementUrl,
      ]
        .map(csvCell)
        .join(',')
    );
  }
  fs.writeFileSync(urlsPath, urlsLines.join('\n') + '\n', 'utf-8');

  const totalDocs = docRows.length;
  const totalUrls = urlRows.length;
  const uniqueUrls = new Set(urlRows.map((r) => r.url)).size;
  const replaceableUrls = urlRows.filter((r) => r.replaceable).length;
  const unreplaceableUrls = totalUrls - replaceableUrls;

  console.log('---');
  console.log('docs with wp-content URLs:', totalDocs);
  console.log('total URL occurrences:', totalUrls);
  console.log('unique URLs:', uniqueUrls);
  console.log('replaceable (mediaLibrary hit):', replaceableUrls);
  console.log('unreplaceable (no mediaLibrary match):', unreplaceableUrls);
  console.log('summary csv:', summaryPath);
  console.log('urls csv   :', urlsPath);
  console.log('---');
  console.log('Next step:');
  console.log(
    '  npx tsx scripts/rewrite-wp-content-from-media-library.ts          # dry-run (replace those with mediaLibrary hit)'
  );
  console.log(
    '  npx tsx scripts/rewrite-wp-content-from-media-library.ts --apply  # actually write to Firestore'
  );
  console.log(
    'Then re-run this audit script to inspect the residual unreplaceable URLs and decide on a manual fix.'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

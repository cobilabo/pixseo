/**
 * Firestore の articles / pages を走査し、title・slug・metaTitle 系に %XX 形式が含まれるドキュメントを列挙する。
 * npx tsx scripts/report-url-encoded-fields.ts [--mediaId=...]
 */
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccountPath = path.join(__dirname, '..', 'pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'pixseo-1eeef',
  });
}

const db = admin.firestore();
const PCT_ENCODED = /%[0-9A-Fa-f]{2}/;
const FIELD_KEYS = [
  'title', 'slug', 'metaTitle',
  'title_ja', 'title_en', 'title_zh', 'title_ko',
  'metaTitle_ja', 'metaTitle_en', 'metaTitle_zh', 'metaTitle_ko',
] as const;

function parseArgs(): { mediaId: string | null } {
  let mediaId: string | null = null;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--mediaId=')) mediaId = arg.slice('--mediaId='.length);
  }
  return { mediaId };
}

function scanFields(data: Record<string, unknown>): { key: string; sample: string }[] {
  const hits: { key: string; sample: string }[] = [];
  for (const key of FIELD_KEYS) {
    const v = data[key];
    if (typeof v === 'string' && PCT_ENCODED.test(v)) {
      const m = v.match(PCT_ENCODED);
      hits.push({ key, sample: m ? m[0] : '%??' });
    }
  }
  return hits;
}

function tryDecode(s: string): string | null {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch {
    return null;
  }
}

async function scanCollection(name: 'articles' | 'pages', mediaId: string | null) {
  let q: admin.firestore.Query = db.collection(name);
  if (mediaId) q = q.where('mediaId', '==', mediaId);
  const snap = await q.get();
  console.log(`\n--- ${name} (docs: ${snap.size}) ---`);
  let count = 0;
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const hits = scanFields(data);
    if (hits.length === 0) continue;
    count++;
    console.log('id:', doc.id, 'wpMigrated:', data.wpMigrated === true, 'mediaId:', data.mediaId);
    for (const h of hits) {
      const str = typeof data[h.key] === 'string' ? (data[h.key] as string) : '';
      const dec = str ? tryDecode(str) : null;
      console.log(' ', h.key, '|', str.slice(0, 160));
      if (dec && dec !== str) console.log('  decoded:', dec.slice(0, 160));
    }
  }
  if (!count) console.log('(no %XX in scanned fields)');
}

async function main() {
  const { mediaId } = parseArgs();
  console.log('Scan title/slug/metaTitle* for percent-encoding');
  if (mediaId) console.log('mediaId:', mediaId);
  await scanCollection('articles', mediaId);
  await scanCollection('pages', mediaId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

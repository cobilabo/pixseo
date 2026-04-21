/**
 * wpMigrated + wpPermalink -> publishedAt (JST midnight, same as admin article form).
 * Default dry-run; use --apply to write.
 *
 * npx tsx scripts/restore-wp-published-at-from-wp-permalink.ts
 * npx tsx scripts/restore-wp-published-at-from-wp-permalink.ts --apply
 * npx tsx scripts/restore-wp-published-at-from-wp-permalink.ts --apply --mediaId=YOUR_MEDIA_ID
 */
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { formatYmdInJapan, toJsDate } from '../lib/utils/date';

function resolveServiceAccountPath(): string {
  const root = path.join(__dirname, '..');
  for (const p of [
    path.join(root, 'serviceAccountKey.json'),
    path.join(root, 'pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json'),
  ]) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    'Missing service account JSON (serviceAccountKey.json or pixseo-1eeef-firebase-adminsdk-*.json).',
  );
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  let mediaId: string | undefined;
  for (const a of argv) {
    if (a.startsWith('--mediaId=')) mediaId = a.slice('--mediaId='.length);
  }
  return { apply, mediaId };
}

// Parses wpPermalink path segments: year, month, day (see migrate-wordpress-full.ts).
function parsePermalinkCalendar(permalink: string): { y: number; m: number; d: number } | null {
  const m = String(permalink).trim().match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

function jstMidnightFirestoreTs(y: number, m: number, d: number): admin.firestore.Timestamp {
  const isoDay = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const date = new Date(`${isoDay}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${isoDay}`);
  return admin.firestore.Timestamp.fromDate(date);
}

function targetYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

async function main() {
  const { apply, mediaId } = parseArgs();
  const serviceAccount = JSON.parse(fs.readFileSync(resolveServiceAccountPath(), 'utf-8'));
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || 'pixseo-1eeef',
    });
  }
  const db = admin.firestore();
  const snap = await db.collection('articles').where('wpMigrated', '==', true).get();

  let examined = 0;
  let skippedNoPermalink = 0;
  let skippedBadPermalink = 0;
  let skippedAlreadyMatch = 0;
  let skippedMediaFilter = 0;
  let wouldUpdate = 0;
  let updated = 0;

  for (const doc of snap.docs) {
    examined++;
    const data = doc.data();
    if (mediaId && data.mediaId !== mediaId) {
      skippedMediaFilter++;
      continue;
    }
    const permalink = data.wpPermalink;
    if (!permalink || typeof permalink !== 'string') {
      skippedNoPermalink++;
      continue;
    }
    const cal = parsePermalinkCalendar(permalink);
    if (!cal) {
      skippedBadPermalink++;
      console.warn(`[skip bad permalink] ${doc.id} slug=${data.slug} wpPermalink=${permalink}`);
      continue;
    }
    const want = targetYmd(cal.y, cal.m, cal.d);
    const published = data.publishedAt;
    const currentYmd = published ? formatYmdInJapan(published) : '';
    if (currentYmd === want) {
      skippedAlreadyMatch++;
      continue;
    }
    const nextTs = jstMidnightFirestoreTs(cal.y, cal.m, cal.d);
    const prevIso = toJsDate(published as any)?.toISOString() ?? '(null)';
    wouldUpdate++;
    console.log(
      `[${apply ? 'APPLY' : 'dry-run'}] ${doc.id} slug=${data.slug} publishedAt ${prevIso} -> JST ${want} (${nextTs.toDate().toISOString()})`,
    );
    if (apply) {
      await doc.ref.update({
        publishedAt: nextTs,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      updated++;
    }
  }

  console.log('\n--- summary ---');
  console.log({
    examined,
    skippedMediaFilter: mediaId ? skippedMediaFilter : '(no mediaId filter)',
    skippedNoPermalink,
    skippedBadPermalink,
    skippedAlreadyMatch,
    wouldChange: wouldUpdate,
    appliedWrites: apply ? updated : 0,
    apply,
    mediaId: mediaId ?? null,
  });
  if (!apply && wouldUpdate > 0) {
    console.log('\nRe-run with --apply to write Firestore.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import * as admin from 'firebase-admin';
import { initFirestoreAdmin } from './lib/firestore-bootstrap';
import { buildWpSlugAliasMap, rewriteInternalLinksInHtml, type InternalLinkContext } from '../lib/fix-internal-links';

const DEFAULT_MEDIA_ID = 'vLXNATzVNoJc9dIGggPi';
const TEXT_FIELDS = ['content', 'content_ja', 'content_en', 'content_zh', 'content_ko', 'excerpt', 'excerpt_ja', 'excerpt_en', 'excerpt_zh', 'excerpt_ko'] as const;

async function main() {
  const apply = process.argv.includes('--apply');
  const mediaId = process.argv.find((a) => a.startsWith('--mediaId='))?.slice(10) || DEFAULT_MEDIA_ID;
  const db = initFirestoreAdmin();
  const snap = await db.collection('articles').where('mediaId', '==', mediaId).get();
  const meta = snap.docs.map((d) => ({ slug: d.data().slug as string, wpPermalink: d.data().wpPermalink as string }));
  const ctx: InternalLinkContext = {
    defaultLang: 'ja',
    articleSlugs: new Set(meta.map((m) => m.slug).filter(Boolean)),
    wpSlugAliases: buildWpSlugAliasMap(meta),
  };
  let changed = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const patch: Record<string, unknown> = {};
    for (const field of TEXT_FIELDS) {
      const raw = data[field];
      if (typeof raw !== 'string' || !raw) continue;
      const next = rewriteInternalLinksInHtml(raw, ctx);
      if (next !== raw) patch[field] = next;
    }
    if (Object.keys(patch).length === 0) continue;
    changed++;
    console.log('[change]', data.slug || doc.id, Object.keys(patch).join(','));
    if (apply) await doc.ref.update({ ...patch, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  }
  console.log('done', { total: snap.size, changed, apply });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
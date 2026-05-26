import { initFirestoreAdmin } from './lib/firestore-bootstrap';
import { ARTICLE_SLUG_REDIRECTS } from '../lib/wp-slug-redirects';
import { buildWpSlugAliasMap } from '../lib/fix-internal-links';

const MEDIA_ID = 'vLXNATzVNoJc9dIGggPi';

async function main() {
  const db = initFirestoreAdmin();
  const snap = await db.collection('articles').where('mediaId', '==', MEDIA_ID).get();
  const meta = snap.docs.map((d) => ({
    slug: d.data().slug as string,
    wpPermalink: d.data().wpPermalink as string,
  }));
  const aliases = buildWpSlugAliasMap(meta);
  const merged: Record<string, string> = { ...ARTICLE_SLUG_REDIRECTS };
  for (const [from, to] of aliases) merged[from] = to;
  console.log(JSON.stringify(merged, null, 2));
  console.log('count', Object.keys(merged).length, 'wp aliases', aliases.size);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
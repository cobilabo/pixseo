import * as fs from 'fs';
import * as path from 'path';
import { initFirestoreAdmin } from './lib/firestore-bootstrap';

const MEDIA_ID = 'vLXNATzVNoJc9dIGggPi';
const SLASH = String.fromCharCode(47);
const PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'wp_domain', re: new RegExp('https?:' + SLASH + SLASH + 'the-ayumi\\.jp', 'gi') },
  { name: 'embedded_ayumi', re: new RegExp(SLASH + 'articles' + SLASH + '[^"\'\\s]+' + SLASH + 'the-ayumi\\.jp' + SLASH, 'gi') },
  { name: 'embedded_external', re: new RegExp(SLASH + 'articles' + SLASH + '[^"\'\\s]+' + SLASH + '(?:instagram\\.com|www\\.)', 'gi') },
  { name: 'legacy_articles', re: new RegExp('href=["\']' + SLASH + 'articles' + SLASH, 'gi') },
  { name: 'wp_date', re: new RegExp(SLASH + '\\d{4}' + SLASH + '\\d{2}' + SLASH + '\\d{2}' + SLASH, 'g') },
];

async function main() {
  const db = initFirestoreAdmin();
  const snap = await db.collection('articles').where('mediaId', '==', MEDIA_ID).get();
  const counts = new Map<string, number>();
  for (const doc of snap.docs) {
    const d = doc.data();
    const text = [d.content, d.content_ja, d.excerpt]
      .filter((x) => typeof x === 'string')
      .join('\n');
    for (const p of PATTERNS) {
      const m = text.match(p.re);
      if (m) counts.set(p.name, (counts.get(p.name) || 0) + m.length);
    }
  }
  console.log('articles', snap.size);
  for (const [k, v] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(k, v);
  }
  const out = path.join(__dirname, 'audit-broken-internal-links-summary.txt');
  fs.writeFileSync(out, [...counts.entries()].map(([k, v]) => `${k}\t${v}`).join('\n'), 'utf8');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
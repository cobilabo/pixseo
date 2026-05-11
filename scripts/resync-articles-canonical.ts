/**
 * Algolia 全件再同期スクリプト (canonical / production parity)
 *
 * - 4言語の index を clear してから syncArticleToAlgolia (本流関数) で再投入。
 * - objectID 命名揺れ (`{id}` vs `{id}_{lang}`) の zombie レコードも一掃される。
 * - lib/algolia/sync.ts の ALGOLIA_MAX_RECORD_UTF8_BYTES を使うので、Grow プラン (100KB/rec) 化と同時に
 *   `npm run` した場合に切り捨てが解消される。
 *
 * Run:
 *   npx tsx scripts/resync-articles-canonical.ts
 *   npx tsx scripts/resync-articles-canonical.ts --dry-run        # clear/書き込みせず件数だけ
 *   npx tsx scripts/resync-articles-canonical.ts --skip-clear     # clear だけスキップ
 */
import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv();

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const SKIP_CLEAR = args.has("--skip-clear");

const SUPPORTED_LANGS = ["ja", "en", "zh", "ko"] as const;
type Lang = (typeof SUPPORTED_LANGS)[number];

async function main() {
  const { adminDb } = await import("../lib/firebase/admin");
  const { adminClient, getArticlesIndexName } = await import("../lib/algolia/client");
  const { syncArticleToAlgolia } = await import("../lib/algolia/sync");

  console.log("=== Algolia canonical resync ===");
  console.log(`mode: dryRun=${DRY_RUN}, skipClear=${SKIP_CLEAR}\n`);

  if (!adminClient) {
    console.error("[FATAL] adminClient is not initialized. Set ALGOLIA_ADMIN_KEY.");
    process.exit(1);
  }

  // 1) clear each language index (wipes zombie objectIDs from older sync schemes)
  if (!SKIP_CLEAR && !DRY_RUN) {
    for (const lang of SUPPORTED_LANGS) {
      const indexName = getArticlesIndexName(lang as Lang);
      console.log(`[clear] ${indexName} ...`);
      try {
        await adminClient.clearObjects({ indexName });
        console.log(`[clear] ${indexName} done`);
      } catch (e) {
        console.error(`[clear] ${indexName} FAILED:`, e);
        throw e;
      }
    }
    console.log("");
  }

  // 2) fetch all published articles
  const snap = await adminDb.collection("articles").where("isPublished", "==", true).get();
  console.log(`Published articles: ${snap.size}\n`);

  if (DRY_RUN) {
    console.log("(dry-run: skipping sync)");
    process.exit(0);
  }

  // 3) sync via canonical syncArticleToAlgolia (handles i18n cat/tag, content packing, all 4 langs)
  let ok = 0;
  let ng = 0;
  const failures: Array<{ id: string; err: string }> = [];

  // limit concurrency to avoid Algolia rate limits / Firestore concurrent reads
  const CONCURRENCY = 5;
  const docs = snap.docs;
  let cursor = 0;

  async function worker(workerId: number) {
    while (true) {
      const i = cursor++;
      if (i >= docs.length) return;
      const doc = docs[i];
      const data = doc.data() as any;
      const article = { id: doc.id, ...data };
      try {
        await syncArticleToAlgolia(article);
        ok++;
        if ((ok + ng) % 20 === 0 || ok + ng === docs.length) {
          console.log(`  progress: ${ok + ng}/${docs.length}  (ok=${ok}, ng=${ng})`);
        }
      } catch (e: any) {
        ng++;
        failures.push({ id: doc.id, err: e?.message || String(e) });
        console.error(`  [NG] ${doc.id} (worker=${workerId}):`, e?.message || e);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

  console.log(`\n=== done: ok=${ok}, ng=${ng} ===`);
  if (failures.length) {
    console.log("Failures:");
    failures.slice(0, 30).forEach((f, i) => console.log(`  ${i + 1}. ${f.id}: ${f.err}`));
  }

  process.exit(ng === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
/**
 * Algolia 4言語インデックスの searchableAttributes に contentTextChunks を追加する。
 * 既存の優先度を変えず、`contentText` と同じ枠 (`unordered(contentText,contentTextChunks)`) に含める。
 *
 * 使用方法:
 *   npx tsx scripts/algolia-add-contentTextChunks.ts --dry-run
 *   npx tsx scripts/algolia-add-contentTextChunks.ts
 */
import { config as loadEnv } from "dotenv";
import path from "path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv();

const DRY = process.argv.includes("--dry-run");
const SUPPORTED_LANGS = ["ja", "en", "zh", "ko"] as const;

function expand(attrs: string[]): string[] {
  return attrs.map((a) => {
    if (!a.includes("contentText")) return a;
    if (a.includes("contentTextChunks")) return a;
    return a.replace(/contentText\b/, "contentText,contentTextChunks");
  });
}

async function main() {
  const { adminClient, getArticlesIndexName } = await import("../lib/algolia/client");
  if (!adminClient) throw new Error("adminClient missing");

  console.log(`mode: ${DRY ? "DRY-RUN" : "APPLY"}\n`);

  for (const lang of SUPPORTED_LANGS) {
    const indexName = getArticlesIndexName(lang);
    const cur: any = await adminClient.getSettings({ indexName });
    const before = (cur.searchableAttributes || []) as string[];
    const after = expand(before);
    const changed = JSON.stringify(before) !== JSON.stringify(after);
    console.log(`[${indexName}]`);
    console.log(`  before: ${JSON.stringify(before)}`);
    console.log(`  after : ${JSON.stringify(after)}`);
    console.log(`  change: ${changed ? "YES" : "no-op"}`);

    if (changed && !DRY) {
      const res: any = await adminClient.setSettings({
        indexName,
        indexSettings: { searchableAttributes: after },
      });
      console.log(`  setSettings taskID=${res.taskID}`);
      await adminClient.waitForTask({ indexName, taskID: res.taskID });
      console.log(`  ok: applied`);
    }
    console.log("");
  }

  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
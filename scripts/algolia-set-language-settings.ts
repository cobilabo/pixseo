/**
 * Algolia 各言語 index に indexLanguages / queryLanguages を適用するスクリプト。
 *
 * 背景: 設定が無い状態だと日本語クエリが unigram (1 文字) にトークン化されてしまい、
 * 例えば「ディズニー」が `デ`/`ィ`/`ズ`/`ニ`/`ー` に分解され、本文に偶然 5 文字が
 * 散在しているだけの無関係記事が大量にヒットしてしまっていた。
 * indexLanguages を設定するとインデックス時に各言語の形態素解析が動き、
 * 適切な単語境界でトークン化される。queryLanguages はクエリ側にも同じ正規化を適用する。
 *
 * Run: npx tsx scripts/algolia-set-language-settings.ts
 */
import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv();

type Lang = "ja" | "en" | "zh" | "ko";
const LANGS: Lang[] = ["ja", "en", "zh", "ko"];
// Algolia の SupportedLanguage は ISO-639-1。zh は 'zh' でなく 'zh' OK。
const INDEX_BASE = "pixseo_articles_production";

async function main() {
  const { algoliasearch } = await import("algoliasearch");
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!;
  const key = process.env.ALGOLIA_ADMIN_KEY!;
  if (!appId || !key) {
    console.error("ALGOLIA_APP_ID / ALGOLIA_ADMIN_KEY が未設定");
    process.exit(1);
  }
  const client = algoliasearch(appId, key);

  for (const lang of LANGS) {
    const indexName = `${INDEX_BASE}_${lang}`;
    console.log(`[${indexName}] applying indexLanguages=[${lang}], queryLanguages=[${lang}] ...`);
    const res = await client.setSettings({
      indexName,
      indexSettings: {
        indexLanguages: [lang],
        queryLanguages: [lang],
      } as any,
    });
    console.log(`  taskID=${res.taskID}`);
    // タスク完了を待つ (再 tokenization が走るため)
    await client.waitForTask({ indexName, taskID: res.taskID });
    console.log(`  done.`);
  }
  console.log("\nAll indexes updated.");
}
main().catch((e) => { console.error(e); process.exit(1); });
import { config as loadEnv } from "dotenv";
import path from "path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv();

async function main() {
  const { adminClient, getArticlesIndexName } = await import("../lib/algolia/client");
  if (!adminClient) throw new Error("adminClient missing");
  const indexName = getArticlesIndexName("ja");
  const KW = "高速道路";

  console.log(`=== index: ${indexName} / kw: "${KW}" ===\n`);

  // 1) settings (searchableAttributes etc.)
  try {
    const settings: any = await adminClient.getSettings({ indexName });
    console.log("[settings] searchableAttributes:", settings.searchableAttributes);
    console.log("[settings] attributesForFaceting:", settings.attributesForFaceting);
    console.log("[settings] queryLanguages:", settings.queryLanguages);
    console.log("[settings] indexLanguages:", settings.indexLanguages);
    console.log("");
  } catch (e: any) {
    console.log("[settings] ERROR:", e?.message || e);
  }

  // 2) raw search (no filter)
  const raw: any = await adminClient.searchSingleIndex({
    indexName,
    searchParams: { query: KW, hitsPerPage: 30 },
  });
  console.log(`[raw search no-filter] nbHits=${raw.nbHits}`);
  raw.hits.slice(0, 5).forEach((h: any, i: number) => {
    console.log(`  ${i + 1}. ${h.objectID} mediaId=${h.mediaId} isPublished=${h.isPublished} title="${(h.title || "").slice(0, 50)}"`);
  });
  console.log("");

  // 3) with isPublished filter
  const f1: any = await adminClient.searchSingleIndex({
    indexName,
    searchParams: { query: KW, hitsPerPage: 5, filters: "isPublished:true" },
  });
  console.log(`[search isPublished:true] nbHits=${f1.nbHits}`);

  // 4) with restrictSearchableAttributes (mimics user-facing call)
  const f2: any = await adminClient.searchSingleIndex({
    indexName,
    searchParams: {
      query: KW,
      hitsPerPage: 5,
      filters: "isPublished:true",
      restrictSearchableAttributes: ["title", "contentText", "contentTextChunks"],
      queryLanguages: ["ja"],
    },
  });
  console.log(`[search restrictSearchable=title,contentText,contentTextChunks] nbHits=${f2.nbHits}`);

  // 5) restrictSearchableAttributes only title+contentText (no chunks)
  const f3: any = await adminClient.searchSingleIndex({
    indexName,
    searchParams: {
      query: KW,
      hitsPerPage: 5,
      filters: "isPublished:true",
      restrictSearchableAttributes: ["title", "contentText"],
      queryLanguages: ["ja"],
    },
  });
  console.log(`[search restrictSearchable=title,contentText only] nbHits=${f3.nbHits}`);

  // 6) collect distinct mediaIds among raw hits
  const mediaIds = Array.from(new Set(raw.hits.map((h: any) => h.mediaId).filter(Boolean)));
  console.log(`\n[mediaIds present in raw hits]: ${JSON.stringify(mediaIds)}`);

  // 7) try with mediaId filter using the most common mediaId
  if (mediaIds.length > 0) {
    for (const mid of mediaIds) {
      const f4: any = await adminClient.searchSingleIndex({
        indexName,
        searchParams: {
          query: KW,
          hitsPerPage: 5,
          filters: `isPublished:true AND mediaId:${mid}`,
        },
      });
      console.log(`[search filters="isPublished:true AND mediaId:${mid}"] nbHits=${f4.nbHits}`);

      // also try quoted
      const f5: any = await adminClient.searchSingleIndex({
        indexName,
        searchParams: {
          query: KW,
          hitsPerPage: 5,
          filters: `isPublished:true AND mediaId:"${mid}"`,
        },
      });
      console.log(`[search filters=\"...\" quoted] nbHits=${f5.nbHits}`);
    }
  }

  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
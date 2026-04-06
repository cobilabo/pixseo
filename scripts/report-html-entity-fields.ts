/**
 * Firestore articles/pages: list docs where HTML entities remain in plain-text fields.
 * npx tsx scripts/report-html-entity-fields.ts [--mediaId=...] [--includeContent] [--summary]
 */
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

const serviceAccountPath = path.join(__dirname, "..", "pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "pixseo-1eeef",
  });
}

const db = admin.firestore();

const HTML_ENTITY_RE = /&(#\d{1,8}|#x[0-9A-Fa-f]{1,8}|[a-zA-Z][a-zA-Z0-9]{0,50});/g;

const PLAIN_FIELDS = [
  "title", "slug", "metaTitle", "metaDescription", "excerpt",
  "title_ja", "title_en", "title_zh", "title_ko",
  "metaTitle_ja", "metaTitle_en", "metaTitle_zh", "metaTitle_ko",
  "metaDescription_ja", "metaDescription_en", "metaDescription_zh", "metaDescription_ko",
  "excerpt_ja", "excerpt_en", "excerpt_zh", "excerpt_ko",
] as const;

const CONTENT_FIELDS = ["content", "content_ja", "content_en", "content_zh", "content_ko"] as const;

function parseArgs(): { mediaId: string | null; includeContent: boolean; summary: boolean } {
  let mediaId: string | null = null;
  let includeContent = false;
  let summary = false;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--mediaId=")) mediaId = arg.slice("--mediaId=".length);
    if (arg === "--includeContent") includeContent = true;
    if (arg === "--summary") summary = true;
  }
  return { mediaId, includeContent, summary };
}

function uniqueEntities(s: string): string[] {
  const found = new Set<string>();
  for (const m of s.matchAll(HTML_ENTITY_RE)) {
    found.add(m[0]);
  }
  return [...found];
}

function scanDoc(
  data: Record<string, unknown>,
  keys: readonly string[]
): { key: string; entities: string[]; preview: string }[] {
  const out: { key: string; entities: string[]; preview: string }[] = [];
  for (const key of keys) {
    const v = data[key];
    if (typeof v !== "string" || !v.includes("&")) continue;
    const entities = uniqueEntities(v);
    if (entities.length === 0) continue;
    out.push({
      key,
      entities,
      preview: v.replace(/\s+/g, " ").slice(0, 200),
    });
  }
  return out;
}

const HEADLINE_FIELDS = new Set(["title", "metaTitle", "slug"]);

async function scanCollection(
  name: "articles" | "pages",
  mediaId: string | null,
  includeContent: boolean,
  summary: boolean
) {
  const keys = includeContent ? [...PLAIN_FIELDS, ...CONTENT_FIELDS] : [...PLAIN_FIELDS];

  let q: admin.firestore.Query = db.collection(name);
  if (mediaId) q = q.where("mediaId", "==", mediaId);
  const snap = await q.get();

  console.log(`\n--- ${name} (docs: ${snap.size}) ---`);

  let docHits = 0;
  /** docId -> headline field had entity */
  const headlineDocIds = new Set<string>();
  const entityTotals = new Map<string, number>();

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const rows = scanDoc(data, keys);
    if (rows.length === 0) continue;
    docHits++;
    for (const r of rows) {
      for (const e of r.entities) {
        entityTotals.set(e, (entityTotals.get(e) ?? 0) + 1);
      }
      if (HEADLINE_FIELDS.has(r.key)) {
        headlineDocIds.add(doc.id);
      }
    }
    if (summary) continue;
    console.log(
      "id:",
      doc.id,
      "wpMigrated:",
      data.wpMigrated === true,
      "mediaId:",
      data.mediaId
    );
    for (const r of rows) {
      console.log(" ", r.key, "| entities:", r.entities.join(", "));
      console.log("   preview:", r.preview + (r.preview.length >= 200 ? "..." : ""));
    }
  }

  if (docHits === 0) {
    console.log("(no HTML entities in scanned fields)");
  } else {
    console.log(`\n> ${docHits} document(s) with entity match(es)`);
    console.log(`> ${headlineDocIds.size} document(s) with entity in title/metaTitle/slug`);
    if (summary && entityTotals.size > 0) {
      const sorted = [...entityTotals.entries()].sort((a, b) => b[1] - a[1]);
      console.log("Entity counts (field hits):");
      for (const [ent, c] of sorted.slice(0, 25)) {
        console.log(`  ${c}x ${ent}`);
      }
      if (sorted.length > 25) console.log(`  ... +${sorted.length - 25} more entity types`);
    }
  }
}

async function main() {
  const { mediaId, includeContent, summary } = parseArgs();
  console.log("HTML entity scan");
  if (mediaId) console.log("mediaId:", mediaId);
  console.log("includeContent:", includeContent, "| summary:", summary);

  await scanCollection("articles", mediaId, includeContent, summary);
  await scanCollection("pages", mediaId, includeContent, summary);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
/**
 * Firestore articles/pages: decode HTML entities in title & meta fields only.
 * Default dry-run; use --apply to write.
 *
 * npx tsx scripts/decode-title-meta-entities.ts
 * npx tsx scripts/decode-title-meta-entities.ts --apply
 * npx tsx scripts/decode-title-meta-entities.ts --mediaId=ID --apply
 * npx tsx scripts/decode-title-meta-entities.ts --docId=ID --collection=articles --apply
 * npx tsx scripts/decode-title-meta-entities.ts --apply --quiet
 *
 * --headlineOnly … title / metaTitle のみ（metaDescription は触らない）
 */
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import he from "he";

const serviceAccountPath = path.join(__dirname, "..", "pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "pixseo-1eeef",
  });
}

const db = admin.firestore();

const TITLE_META_TITLE_FIELDS = [
  "title",
  "title_ja",
  "title_en",
  "title_zh",
  "title_ko",
  "metaTitle",
  "metaTitle_ja",
  "metaTitle_en",
  "metaTitle_zh",
  "metaTitle_ko",
] as const;

const META_DESCRIPTION_FIELDS = [
  "metaDescription",
  "metaDescription_ja",
  "metaDescription_en",
  "metaDescription_zh",
  "metaDescription_ko",
] as const;

const ALL_TARGET_FIELDS = [...TITLE_META_TITLE_FIELDS, ...META_DESCRIPTION_FIELDS] as const;

type TargetField = (typeof ALL_TARGET_FIELDS)[number];
type CollectionName = "articles" | "pages";

function parseArgs(): {
  mediaId: string | null;
  apply: boolean;
  docId: string | null;
  collection: CollectionName | "both";
  quiet: boolean;
  headlineOnly: boolean;
} {
  let mediaId: string | null = null;
  let apply = false;
  let docId: string | null = null;
  let collection: CollectionName | "both" = "both";
  let quiet = false;
  let headlineOnly = false;

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--mediaId=")) mediaId = arg.slice("--mediaId=".length);
    if (arg.startsWith("--docId=")) docId = arg.slice("--docId=".length);
    if (arg.startsWith("--collection=")) {
      const v = arg.slice("--collection=".length);
      if (v === "articles" || v === "pages") collection = v;
    }
    if (arg === "--apply") apply = true;
    if (arg === "--quiet") quiet = true;
    if (arg === "--headlineOnly") headlineOnly = true;
  }
  return { mediaId, apply, docId, collection, quiet, headlineOnly };
}

function decodeField(value: string): string {
  if (!value.includes("&")) return value;
  return he.decode(value);
}

function targetFieldsForOptions(headlineOnly: boolean): readonly TargetField[] {
  return headlineOnly ? TITLE_META_TITLE_FIELDS : ALL_TARGET_FIELDS;
}

function collectPatches(
  data: Record<string, unknown>,
  fields: readonly TargetField[]
): Partial<Record<TargetField, string>> {
  const patch: Partial<Record<TargetField, string>> = {};
  for (const key of fields) {
    const raw = data[key];
    if (typeof raw !== "string") continue;
    const next = decodeField(raw);
    if (next !== raw) {
      patch[key] = next;
    }
  }
  return patch;
}

function preview(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

async function runCollection(
  name: CollectionName,
  mediaId: string | null,
  singleDocId: string | null,
  apply: boolean,
  quiet: boolean,
  headlineOnly: boolean
): Promise<{ scanned: number; changed: number; unchanged: number }> {
  const fields = targetFieldsForOptions(headlineOnly);
  const col = db.collection(name);

  const docs: admin.firestore.QueryDocumentSnapshot[] = [];
  if (singleDocId) {
    const d = await col.doc(singleDocId).get();
    if (!d.exists) {
      console.log(`\n=== ${name} (doc ${singleDocId} not found) ===`);
      return { scanned: 0, changed: 0, unchanged: 0 };
    }
    docs.push(d as admin.firestore.QueryDocumentSnapshot);
  } else {
    let q: admin.firestore.Query = col;
    if (mediaId) q = q.where("mediaId", "==", mediaId);
    const snap = await q.get();
    docs.push(...snap.docs);
  }

  console.log(`\n=== ${name} (${docs.length} docs) ===`);

  const BATCH_MAX = 450;
  let batch = db.batch();
  let batchOps = 0;
  let changed = 0;
  let unchanged = 0;

  for (const doc of docs) {
    const data = doc.data() as Record<string, unknown>;
    const patch = collectPatches(data, fields);
    const keys = Object.keys(patch) as TargetField[];
    if (keys.length === 0) {
      unchanged++;
      continue;
    }

    if (quiet) {
      console.log(`${doc.id}\t${keys.join(",")}`);
    } else {
      console.log(`\n${doc.id}  (${keys.join(", ")})`);
      for (const k of keys) {
        const before = data[k] as string;
        const after = patch[k]!;
        console.log(`  ${k}`);
        console.log(`    - ${preview(before, 100)}`);
        console.log(`    + ${preview(after, 100)}`);
      }
    }

    if (apply) {
      batch.update(doc.ref, patch);
      batchOps++;
      changed++;
      if (batchOps >= BATCH_MAX) {
        await batch.commit();
        batch = db.batch();
        batchOps = 0;
      }
    } else {
      changed++;
    }
  }

  if (apply && batchOps > 0) {
    await batch.commit();
  }

  return { scanned: docs.length, changed, unchanged };
}

async function main() {
  const { mediaId, apply, docId, collection, quiet, headlineOnly } = parseArgs();

  if (docId && collection === "both") {
    console.error("Error: --docId requires --collection=articles or --collection=pages");
    process.exit(1);
  }

  console.log("decode-title-meta-entities");
  console.log(
    "apply:",
    apply,
    "| mediaId:",
    mediaId ?? "(all)",
    "| docId:",
    docId ?? "(all)",
    "| quiet:",
    quiet,
    "| headlineOnly:",
    headlineOnly
  );
  if (!apply) {
    console.log("\n(Dry run — no writes. Pass --apply to update Firestore.)\n");
  }
  if (quiet) {
    console.log("(quiet: one line per doc = id<TAB>fields)\n");
  }

  if (collection === "both") {
    const a = await runCollection("articles", mediaId, null, apply, quiet, headlineOnly);
    const p = await runCollection("pages", mediaId, null, apply, quiet, headlineOnly);
    console.log(
      `\n[articles] scanned ${a.scanned}, ${apply ? "updated" : "would update"} ${a.changed}, unchanged ${a.unchanged}`
    );
    console.log(
      `[pages] scanned ${p.scanned}, ${apply ? "updated" : "would update"} ${p.changed}, unchanged ${p.unchanged}`
    );
    console.log(
      `\nDone. ${apply ? "Updated" : "Would update"} ${a.changed + p.changed} document(s) with at least one field.`
    );
  } else {
    const r = await runCollection(collection, mediaId, docId, apply, quiet, headlineOnly);
    console.log(
      `\n[${collection}] scanned ${r.scanned}, ${apply ? "updated" : "would update"} ${r.changed}, unchanged ${r.unchanged}`
    );
    console.log(`\nDone. ${apply ? "Updated" : "Would update"} ${r.changed} document(s) with at least one field.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
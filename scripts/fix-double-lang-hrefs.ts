/**
 * localizeHtmlLinks 由来の href="/ja/ja/" 等を一括修正する。
 *
 * Usage: npx tsx scripts/fix-double-lang-hrefs.ts [--dryRun]
 */
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

const CONTENT_FIELDS = [
  "content",
  "content_ja",
  "content_en",
  "content_zh",
  "content_ko",
] as const;

const DOUBLE_LANG_HREF =
  /href=(["'])\/(ja|en|zh|ko)\/\2(?:\/([^"']*))?\1/g;

function resolveServiceAccountPath(): string {
  const root = path.join(__dirname, "..");
  for (const name of [
    "serviceAccountKey.json",
    "pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json",
  ]) {
    const p = path.join(root, name);
    if (fs.existsSync(p)) return p;
  }
  throw new Error("service account json not found");
}

function fixDoubleLangHrefs(html: string): string | null {
  if (!DOUBLE_LANG_HREF.test(html)) return null;
  DOUBLE_LANG_HREF.lastIndex = 0;
  const fixed = html.replace(
    DOUBLE_LANG_HREF,
    (_m, quote: string, lang: string, rest?: string) =>
      rest
        ? `href=${quote}/${lang}/${rest}${quote}`
        : `href=${quote}/${lang}/${quote}`
  );
  return fixed !== html ? fixed : null;
}

async function main() {
  const dryRun = process.argv.includes("--dryRun");
  const sa = JSON.parse(fs.readFileSync(resolveServiceAccountPath(), "utf-8"));
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(sa),
      projectId: sa.project_id || "pixseo-1eeef",
    });
  }

  const db = admin.firestore();
  const snapshot = await db.collection("articles").get();
  let updated = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates: Record<string, string> = {};

    for (const field of CONTENT_FIELDS) {
      const value = data[field];
      if (typeof value !== "string" || !value.includes("/ja/ja")) continue;
      const fixed = fixDoubleLangHrefs(value);
      if (fixed) updates[field] = fixed;
    }

    if (Object.keys(updates).length === 0) continue;

    console.log(
      `${dryRun ? "[dryRun] " : ""}${doc.id} (${data.slug || "?"}): ${Object.keys(updates).join(", ")}`
    );
    if (!dryRun) {
      await doc.ref.update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    updated++;
  }

  console.log(`Done. ${updated} article(s) ${dryRun ? "would be " : ""}updated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

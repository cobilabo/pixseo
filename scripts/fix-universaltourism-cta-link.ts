/**
 * universaltourism 記事の無料相談CTA画像に /contact リンクを復元する。
 * 日本語ページは content_ja を参照するため、全言語フィールドを更新する。
 *
 * Usage: npx tsx scripts/fix-universaltourism-cta-link.ts
 */
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const ARTICLE_ID = "MURFWxMHs3VaY2UuRnjp";
const CONTENT_FIELDS = ["content", "content_ja", "content_en", "content_zh", "content_ko"] as const;

const ORPHAN_PATTERN = /<div\s*>\s*(<img[^>]*450-x-110[^>]*>)\s*<\/div>/i;
const LINKED_REPLACEMENT =
  '<div class="aligncenter size-full"><a href="/contact" target="_blank" rel="noopener noreferrer">$1</a></div>';

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

function applyCtaLinkFix(html: string): string | null {
  if (!ORPHAN_PATTERN.test(html)) return null;
  return html.replace(ORPHAN_PATTERN, LINKED_REPLACEMENT);
}

async function main() {
  const sa = JSON.parse(fs.readFileSync(resolveServiceAccountPath(), "utf-8"));
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(sa),
      projectId: sa.project_id || "pixseo-1eeef",
    });
  }

  const ref = admin.firestore().collection("articles").doc(ARTICLE_ID);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("article not found");

  const data = doc.data() || {};
  const updates: Record<string, string> = {};

  for (const field of CONTENT_FIELDS) {
    const value = data[field];
    if (typeof value !== "string" || !value) continue;
    const fixed = applyCtaLinkFix(value);
    if (fixed) {
      updates[field] = fixed;
      console.log(`Will update ${field}`);
    } else {
      const hasCta = value.includes("450-x-110");
      const hasLink = /<a[^>]+href=["']\/contact["'][^>]*>[\s\S]*450-x-110/i.test(value);
      console.log(`${field}: cta=${hasCta} linked=${hasLink}`);
    }
  }

  if (Object.keys(updates).length === 0) {
    console.log("No fields needed updating.");
    return;
  }

  await ref.update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log("Firestore updated:", Object.keys(updates).join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

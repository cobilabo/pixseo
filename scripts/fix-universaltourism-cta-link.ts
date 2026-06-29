/**
 * universaltourism 記事の無料相談CTA画像に /contact リンクを復元する。
 * Usage: npx tsx scripts/fix-universaltourism-cta-link.ts
 */
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const ARTICLE_ID = "MURFWxMHs3VaY2UuRnjp";

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

  const content = doc.data()?.content;
  if (typeof content !== "string") throw new Error("unexpected content shape");

  const orphanPattern =
    /<div\s*>\s*(<img[^>]*450-x-110[^>]*>)\s*<\/div>/i;
  if (!orphanPattern.test(content)) {
    console.log("No orphan CTA image found — already fixed or pattern changed.");
    return;
  }

  const updated = content.replace(
    orphanPattern,
    '<div class="aligncenter size-full"><a href="/contact" target="_blank" rel="noopener noreferrer">$1</a></div>'
  );

  await ref.update({
    content: updated,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log("Updated article content with CTA link.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

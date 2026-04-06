/**
 * List writers still pointing at the-ayumi.jp/wp-content (WP closed = re-upload in admin).
 * npx tsx scripts/report-writers-wp-icons.ts
 */
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

const p = path.join(__dirname, "..", "pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json");
const sa = JSON.parse(fs.readFileSync(p, "utf-8"));
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: "pixseo-1eeef" });
}
const db = admin.firestore();
const DEAD = /the-ayumi\.jp\/wp-content\//i;

async function main() {
  const snap = await db.collection("writers").get();
  let n = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    const icon = String(d.icon || d.iconUrl || "");
    const bg = String(d.backgroundImage || d.backgroundImageUrl || "");
    if (!DEAD.test(icon) && !DEAD.test(bg)) continue;
    n++;
    console.log("---");
    console.log("id:", doc.id, "handleName:", d.handleName);
    if (DEAD.test(icon)) console.log("icon:", icon);
    if (DEAD.test(bg)) console.log("backgroundImage:", bg);
  }
  console.log("\nTotal:", n);
}
main().catch(console.error);

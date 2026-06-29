import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const PAGE_ID = "2RX6mQDZ6WlSAm3nZ8wJ";
const DOCS = path.join(process.cwd(), "docs", "about-flat-html-blocks.html");

function extractBlock(html: string, blockNumber: 1 | 2 | 3): string {
  const startMarker = `<!-- ============================================================\n     HTMLブロック ${blockNumber}`;
  const nextMarker =
    blockNumber < 3
      ? `<!-- ============================================================\n     HTMLブロック ${blockNumber + 1}`
      : "";
  const start = html.indexOf(startMarker);
  if (start < 0) throw new Error(`block ${blockNumber} start marker not found`);
  const end = nextMarker ? html.indexOf(nextMarker, start + 1) : html.length;
  if (blockNumber < 3 && end < 0) throw new Error(`block ${blockNumber} end marker not found`);
  return html.slice(start, end > start ? end : undefined).trim();
}

async function main() {
  const p = path.join(process.cwd(), "pixseo-1eeef-firebase-adminsdk-fbsvc-7b2fe59f30.json");
  const sa = JSON.parse(fs.readFileSync(p, "utf-8"));
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), projectId: sa.project_id });

  const source = fs.readFileSync(DOCS, "utf-8");
  const ref = admin.firestore().collection("pages").doc(PAGE_ID);
  const doc = await ref.get();
  const blocks = [...(doc.data()?.blocks || [])];

  for (const blockNumber of [1, 2, 3] as const) {
    const newHtml = extractBlock(source, blockNumber);
    const idx = blocks.findIndex((b: { type: string; order: number }) => b.type === "html" && b.order === blockNumber);
    if (idx < 0) throw new Error(`html block ${blockNumber} not found`);
    blocks[idx] = { ...blocks[idx], config: { ...blocks[idx].config, html: newHtml } };
    console.log(`block ${blockNumber} updated, html length ${newHtml.length}`);
  }

  await ref.update({ blocks, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  console.log("Firestore updated");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

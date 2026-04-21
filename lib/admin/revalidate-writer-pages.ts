import { revalidatePath, revalidateTag } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { CACHE_TAGS } from "@/lib/firebase/cached";

const LANGS = ["ja", "en", "zh", "ko"] as const;

export async function revalidateWriterPublicPages(writerId: string): Promise<void> {
  try {
    revalidateTag(CACHE_TAGS.WRITERS);
    revalidateTag(CACHE_TAGS.ARTICLES);
  } catch (error) {
    console.warn("[revalidateWriterPublicPages] revalidateTag failed:", error);
  }

  for (const lang of LANGS) {
    revalidatePath(`/${lang}/writers/${writerId}`);
  }

  const snap = await adminDb.collection("articles").where("writerId", "==", writerId).get();
  for (const doc of snap.docs) {
    const slug = doc.data()?.slug as string | undefined;
    if (!slug) continue;
    for (const lang of LANGS) {
      revalidatePath(`/${lang}/articles/${slug}`);
    }
  }
}
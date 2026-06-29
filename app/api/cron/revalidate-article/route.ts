import { NextRequest, NextResponse } from "next/server";
import { revalidateArticle } from "@/lib/cache-manager";

export const dynamic = "force-dynamic";

const NOINDEX_HEADERS = { "X-Robots-Tag": "noindex, nofollow" } as const;

/**
 * Revalidate article ISR / data cache after direct Firestore updates.
 * Authorization: Bearer ${CRON_SECRET}
 * Body: { "slug": "universaltourism" }
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NOINDEX_HEADERS });
  }

  let slug: string | undefined;
  try {
    const body = await request.json();
    slug = typeof body?.slug === "string" ? body.slug : undefined;
  } catch {
    slug = undefined;
  }

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400, headers: NOINDEX_HEADERS });
  }

  revalidateArticle(slug);
  return NextResponse.json({ revalidated: true, slug }, { headers: NOINDEX_HEADERS });
}
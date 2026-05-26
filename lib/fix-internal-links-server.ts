import { adminDb } from '@/lib/firebase/admin';
import {
  buildWpSlugAliasMap,
  rewriteInternalLinksInHtml,
  type InternalLinkContext,
} from '@/lib/fix-internal-links';

export async function buildInternalLinkContextForMedia(mediaId: string): Promise<InternalLinkContext> {
  const snap = await adminDb
    .collection('articles')
    .where('mediaId', '==', mediaId)
    .select('slug', 'wpPermalink')
    .get();
  const meta = snap.docs.map((d) => {
    const data = d.data();
    return {
      slug: data.slug as string | undefined,
      wpPermalink: data.wpPermalink as string | undefined,
    };
  });
  return {
    defaultLang: 'ja',
    articleSlugs: new Set(meta.map((m) => m.slug).filter((s): s is string => Boolean(s))),
    wpSlugAliases: buildWpSlugAliasMap(meta),
  };
}

export async function rewriteArticleHtmlFields(
  fields: Record<string, unknown>,
  mediaId: string
): Promise<Record<string, unknown>> {
  const ctx = await buildInternalLinkContextForMedia(mediaId);
  const out: Record<string, unknown> = {};
  for (const key of [
    'content',
    'content_ja',
    'content_en',
    'content_zh',
    'content_ko',
    'excerpt',
    'excerpt_ja',
    'excerpt_en',
    'excerpt_zh',
    'excerpt_ko',
  ] as const) {
    const raw = fields[key];
    if (typeof raw === 'string' && raw) {
      out[key] = rewriteInternalLinksInHtml(raw, ctx);
    }
  }
  return out;
}
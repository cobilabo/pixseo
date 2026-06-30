import { adminDb } from '@/lib/firebase/admin';
import {
  buildWpSlugAliasMap,
  normalizeInternalHref,
  rewriteInternalLinksInHtml,
  type InternalLinkContext,
} from '@/lib/fix-internal-links';

const ARTICLE_HTML_FIELDS = [
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
] as const;

const PAGE_HTML_FIELDS = [
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
] as const;

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

function rewriteHtmlInValue(value: unknown, ctx: InternalLinkContext): unknown {
  if (typeof value === 'string') {
    if (!value.includes('href=') && !value.startsWith('/')) return value;
    return rewriteInternalLinksInHtml(value, ctx);
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteHtmlInValue(item, ctx));
  }
  if (value && typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(input)) {
      if (key === 'url' && typeof v === 'string' && v.startsWith('/')) {
        out[key] = normalizeInternalHref(v, ctx);
      } else if (key.startsWith('html') && typeof v === 'string') {
        out[key] = rewriteInternalLinksInHtml(v, ctx);
      } else {
        out[key] = rewriteHtmlInValue(v, ctx);
      }
    }
    return out;
  }
  return value;
}

function rewriteStringHtmlFields(
  fields: Record<string, unknown>,
  keys: readonly string[],
  ctx: InternalLinkContext
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const raw = fields[key];
    if (typeof raw === 'string' && raw) {
      out[key] = rewriteInternalLinksInHtml(raw, ctx);
    }
  }
  return out;
}

export async function rewriteArticleHtmlFields(
  fields: Record<string, unknown>,
  mediaId: string
): Promise<Record<string, unknown>> {
  const ctx = await buildInternalLinkContextForMedia(mediaId);
  return rewriteStringHtmlFields(fields, ARTICLE_HTML_FIELDS, ctx);
}

export async function rewritePageHtmlFields(
  fields: Record<string, unknown>,
  mediaId: string
): Promise<Record<string, unknown>> {
  const ctx = await buildInternalLinkContextForMedia(mediaId);
  const out = rewriteStringHtmlFields(fields, PAGE_HTML_FIELDS, ctx);
  if (Array.isArray(fields.blocks)) {
    out.blocks = rewriteHtmlInValue(fields.blocks, ctx);
  }
  return out;
}
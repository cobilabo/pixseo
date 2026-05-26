import { DEFAULT_LANG, SUPPORTED_LANGS, type Lang } from '@/types/lang';
import { ARTICLE_SLUG_REDIRECTS } from '@/lib/wp-slug-redirects';

export type InternalLinkContext = {
  defaultLang?: Lang;
  articleSlugs: Set<string>;
  categorySlugs?: Set<string>;
  tagSlugs?: Set<string>;
  writerSlugs?: Set<string>;
  /** 旧 WP スラッグ → 現行 Firestore slug */
  wpSlugAliases?: Map<string, string>;
};

const LANG_PATTERN = SUPPORTED_LANGS.join('|');
const AYUMI_HOST_RE = /https?:\/\/(?:www\.)?the-ayumi\.jp/i;

function resolveArticleSlug(rawSlug: string, ctx: InternalLinkContext): string {
  const normalized = rawSlug.replace(/\/+$/, '');
  const aliased = ctx.wpSlugAliases?.get(normalized) ?? normalized;
  return ARTICLE_SLUG_REDIRECTS[aliased] ?? aliased;
}

function articlePath(slug: string, ctx: InternalLinkContext, lang?: string): string {
  const l = lang || ctx.defaultLang || DEFAULT_LANG;
  return `/${l}/articles/${resolveArticleSlug(slug, ctx)}/`;
}

/** the-ayumi.jp 以降のパスを新サイトのパスへ */
export function resolveAyumiSitePath(pathAfterHost: string, ctx: InternalLinkContext): string {
  const lang = ctx.defaultLang || DEFAULT_LANG;
  let rest = pathAfterHost.replace(/^\/+/, '').replace(/\/+$/, '');

  if (!rest || rest === 'URL') {
    return `/${lang}/`;
  }

  const dateArticle = rest.match(/^(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)$/);
  if (dateArticle) {
    return articlePath(dateArticle[4], ctx, lang);
  }

  if (rest.startsWith('category/')) {
    const slug = rest.replace(/^category\/(?:.+\/)?/, '').split('/')[0];
    return `/${lang}/categories/${slug}/`;
  }
  if (rest.startsWith('tag/')) {
    const slug = rest.replace(/^tag\//, '').split('/')[0];
    return `/${lang}/tags/${encodeURIComponent(slug)}/`;
  }
  if (rest.startsWith('author/')) {
    const slug = rest.replace(/^author\//, '').split('/')[0];
    return `/${lang}/writers/${slug}/`;
  }
  if (rest.startsWith('articles/')) {
    const slug = rest.replace(/^articles\//, '').split('/')[0];
    return articlePath(slug, ctx, lang);
  }
  if (rest.startsWith('categories/')) {
    const slug = rest.replace(/^categories\//, '').split('/')[0];
    return `/${lang}/categories/${slug}/`;
  }
  if (rest.startsWith('tags/')) {
    const slug = rest.replace(/^tags\//, '').split('/')[0];
    return `/${lang}/tags/${slug}/`;
  }
  if (rest.startsWith('writers/')) {
    const slug = rest.replace(/^writers\//, '').split('/')[0];
    return `/${lang}/writers/${slug}/`;
  }

  if (['category', 'tag', 'author', 'wp-content', 'wp-admin', 'wp-includes', 'feed', 'page'].includes(rest.split('/')[0])) {
    return `/${lang}/`;
  }

  return `/${lang}/${rest.split('/')[0]}/`;
}

/** 単一 href を正規化（相対・絶対・壊れた埋め込み） */
export function normalizeInternalHref(href: string, ctx: InternalLinkContext): string {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return href;
  }

  let h = href.trim();

  // 記事パス内に外部ドメインが誤って連結されている
  const extInArticle = h.match(
    new RegExp(`^\\/?(?:${LANG_PATTERN}\\/)?articles\\/[^/]+\\/((?:instagram\\.com|www\\.[^/]+).+)$`, 'i')
  );
  if (extInArticle) {
    const tail = extInArticle[1].replace(/\/+$/, '');
    return tail.startsWith('http') ? tail : `https://${tail}`;
  }

  // /ja/articles/foo/the-ayumi.jp/2024/... 形式
  const embeddedSite = h.match(
    new RegExp(`^\\/?(?:${LANG_PATTERN}\\/)?articles\\/[^/]+\\/the-ayumi\\.jp\\/(.+)$`, 'i')
  );
  if (embeddedSite) {
    return resolveAyumiSitePath(embeddedSite[1], ctx);
  }

  if (AYUMI_HOST_RE.test(h)) {
    const path = h.replace(AYUMI_HOST_RE, '').replace(/^\/+/, '');
    return resolveAyumiSitePath(path, ctx);
  }

  // プロトコルなし the-ayumi.jp/...
  if (/^the-ayumi\.jp\//i.test(h)) {
    return resolveAyumiSitePath(h.replace(/^the-ayumi\.jp\//i, ''), ctx);
  }

  // instagram.com / www.example.com（プロトコルなし外部）
  if (/^(?:instagram\.com|www\.)/i.test(h)) {
    return h.startsWith('http') ? h : `https://${h}`;
  }

  if (/\/URL\/?$/i.test(h)) {
    return `/${ctx.defaultLang || DEFAULT_LANG}/`;
  }

  // 言語なし /articles/slug
  const legacyArticle = h.match(/^\/articles\/([^/?#]+)\/?/);
  if (legacyArticle) {
    return articlePath(legacyArticle[1], ctx);
  }

  const legacyCategory = h.match(/^\/categories\/([^/?#]+)\/?/);
  if (legacyCategory) {
    const lang = ctx.defaultLang || DEFAULT_LANG;
    return `/${lang}/categories/${legacyCategory[1]}/`;
  }

  const legacyTag = h.match(/^\/tags\/([^/?#]+)\/?/);
  if (legacyTag) {
    const lang = ctx.defaultLang || DEFAULT_LANG;
    return `/${lang}/tags/${legacyTag[1]}/`;
  }

  // 旧 WP 相対パス
  const wpDate = h.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/?#]+)\/?/);
  if (wpDate) {
    return articlePath(wpDate[4], ctx);
  }

  const wpCategory = h.match(/^\/category\/(?:.+\/)?([^/?#]+)\/?/);
  if (wpCategory) {
    const lang = ctx.defaultLang || DEFAULT_LANG;
    return `/${lang}/categories/${wpCategory[1]}/`;
  }

  const wpTag = h.match(/^\/tag\/([^/?#]+)\/?/);
  if (wpTag) {
    const lang = ctx.defaultLang || DEFAULT_LANG;
    return `/${lang}/tags/${encodeURIComponent(wpTag[1])}/`;
  }

  const wpAuthor = h.match(/^\/author\/([^/?#]+)\/?/);
  if (wpAuthor) {
    const lang = ctx.defaultLang || DEFAULT_LANG;
    return `/${lang}/writers/${wpAuthor[1]}/`;
  }

  return h;
}

/** HTML 本文内の href を一括修正 */
export function rewriteInternalLinksInHtml(html: string, ctx?: InternalLinkContext): string {
  if (!html) return html;

  const context: InternalLinkContext = ctx ?? {
    defaultLang: DEFAULT_LANG,
    articleSlugs: new Set(),
  };

  let out = html;

  // migrate-wordpress-full と同等の絶対 URL 置換
  out = out.replace(
    /https?:\/\/the-ayumi\.jp\/\d{4}\/\d{2}\/\d{2}\/([^/"<>\s]+)\/?/gi,
    (_, slug) => articlePath(slug, context)
  );
  out = out.replace(
    /https?:\/\/the-ayumi\.jp\/category\/([^/"<>\s]+)\/?/gi,
    (_, slug) => `/${context.defaultLang || DEFAULT_LANG}/categories/${slug}/`
  );
  out = out.replace(
    /https?:\/\/the-ayumi\.jp\/tag\/([^/"<>\s]+)\/?/gi,
    (_, slug) => `/${context.defaultLang || DEFAULT_LANG}/tags/${slug}/`
  );
  out = out.replace(
    /https?:\/\/the-ayumi\.jp\/author\/([^/"<>\s]+)\/?/gi,
    (_, slug) => `/${context.defaultLang || DEFAULT_LANG}/writers/${slug}/`
  );
  out = out.replace(/https?:\/\/the-ayumi\.jp\/?(?=["'<>\s]|$)/gi, `/${context.defaultLang || DEFAULT_LANG}/`);

  // href 属性を個別に正規化
  out = out.replace(/href=(["'])([^"']*)\1/gi, (match, quote, href) => {
    const fixed = normalizeInternalHref(href, context);
    if (fixed === href) return match;
    return `href=${quote}${fixed}${quote}`;
  });

  return out;
}

/** wpPermalink の末尾スラッグと現行 slug が異なる記事のエイリアスマップ */
export function buildWpSlugAliasMap(
  articles: Array<{ slug?: string; wpPermalink?: string }>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const a of articles) {
    if (!a.slug || !a.wpPermalink) continue;
    const parts = a.wpPermalink.replace(/\/+$/, '').split('/').filter(Boolean);
    const wpSlug = parts[parts.length - 1];
    if (wpSlug && wpSlug !== a.slug) {
      map.set(wpSlug, a.slug);
    }
  }
  return map;
}

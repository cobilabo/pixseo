import { Lang } from '@/types/lang';

/**
 * 多言語フィールドを持つオブジェクトから、指定言語のフィールドを抽出
 * 
 * @example
 * const article = {
 *   title_ja: '日本語タイトル',
 *   title_en: 'English Title',
 *   content_ja: '日本語本文',
 *   content_en: 'English Content',
 * };
 * 
 * const localized = localizeFields(article, 'en', ['title', 'content']);
 * // { title: 'English Title', content: 'English Content' }
 */
export function localizeFields<T extends Record<string, any>>(
  obj: T,
  lang: Lang,
  fields: string[]
): Partial<Record<string, any>> {
  const result: Record<string, any> = {};
  
  for (const field of fields) {
    const key = `${field}_${lang}`;
    if (obj[key] !== undefined) {
      result[field] = obj[key];
    }
  }
  
  return result;
}

/**
 * 記事オブジェクトをローカライズ
 */
export function localizeArticle(article: any, lang: Lang) {
  const multilangFields = [
    'title',
    'content',
    'excerpt',
    'metaTitle',
    'metaDescription',
    'aiSummary',
  ];
  
  const localized = localizeFields(article, lang, multilangFields);
  
  // FAQsも言語別に取得
  const faqsKey = `faqs_${lang}`;
  const faqs = article[faqsKey] || [];
  
  return {
    id: article.id,
    slug: article.slug,
    ...localized,
    faqs,
    // 共通フィールド
    writerId: article.writerId,
    categoryIds: article.categoryIds,
    tagIds: article.tagIds,
    relatedArticleIds: article.relatedArticleIds,
    featuredImage: article.featuredImage,
    featuredImageAlt: article.featuredImageAlt,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    isPublished: article.isPublished,
    isFeatured: article.isFeatured,
    viewCount: article.viewCount,
    likeCount: article.likeCount,
    mediaId: article.mediaId,
    tableOfContents: article.tableOfContents,
    readingTime: article.readingTime,
    googleMapsUrl: article.googleMapsUrl,
    reservationUrl: article.reservationUrl,
  };
}

/**
 * カテゴリーオブジェクトをローカライズ
 */
export function localizeCategory(category: any, lang: Lang) {
  const localized = localizeFields(category, lang, ['name', 'description']);
  
  return {
    id: category.id,
    slug: category.slug,
    ...localized,
    featuredImage: category.featuredImage,
    featuredImageAlt: category.featuredImageAlt,
    isRecommended: category.isRecommended,
    displayOrder: category.displayOrder,
    mediaId: category.mediaId,
  };
}

/**
 * タグオブジェクトをローカライズ
 */
export function localizeTag(tag: any, lang: Lang) {
  const localized = localizeFields(tag, lang, ['name']);
  
  return {
    id: tag.id,
    slug: tag.slug,
    ...localized,
    mediaId: tag.mediaId,
  };
}

/**
 * ライターオブジェクトをローカライズ
 */
export function localizeWriter(writer: any, lang: Lang) {
  const localized = localizeFields(writer, lang, ['handleName', 'bio']);
  
  return {
    id: writer.id,
    ...localized,
    icon: writer.icon,
    iconAlt: writer.iconAlt,
    backgroundImage: writer.backgroundImage,
    backgroundImageAlt: writer.backgroundImageAlt,
    mediaId: writer.mediaId,
  };
}

/**
 * 固定ページをローカライズ
 */
export function localizePage(page: any, lang: Lang) {
  const localized = localizeFields(page, lang, [
    'title',
    'content',
    'metaTitle',
    'metaDescription',
  ]);
  
  return {
    id: page.id,
    slug: page.slug,
    ...localized,
    featuredImage: page.featuredImage,
    featuredImageAlt: page.featuredImageAlt,
    isPublished: page.isPublished,
    publishedAt: page.publishedAt,
    updatedAt: page.updatedAt,
    mediaId: page.mediaId,
    parentId: page.parentId,
  };
}

/**
 * サイト情報をローカライズ
 */
export function localizeSiteInfo(siteInfo: any, lang: Lang) {
  const localized = localizeFields(siteInfo, lang, ['name', 'siteDescription']);
  
  return {
    ...siteInfo,
    ...localized,
  };
}

/**
 * テーマ設定をローカライズ
 */
export function localizeTheme(theme: any, lang: Lang) {
  const localized = { ...theme };
  
  // FVテキスト
  const fvFields = localizeFields(theme, lang, ['fvCatchphrase', 'fvDescription']);
  Object.assign(localized, fvFields);
  
  // フッターコンテンツ
  if (theme.footerContents) {
    localized.footerContents = theme.footerContents.map((content: any) => ({
      ...content,
      ...localizeFields(content, lang, ['title', 'description']),
    }));
  }
  
  // フッターテキストリンクセクション
  if (theme.footerTextLinkSections) {
    localized.footerTextLinkSections = theme.footerTextLinkSections.map((section: any) => ({
      ...section,
      ...localizeFields(section, lang, ['title']),
      links: section.links?.map((link: any) => ({
        ...link,
        ...localizeFields(link, lang, ['text']),
      })) || [],
    }));
  }
  
  // メニュー
  if (theme.menu?.additionalMenus) {
    localized.menu = {
      ...theme.menu,
      additionalMenus: theme.menu.additionalMenus.map((menu: any) => ({
        ...menu,
        ...localizeFields(menu, lang, ['text']),
      })),
    };
  }
  
  return localized;
}


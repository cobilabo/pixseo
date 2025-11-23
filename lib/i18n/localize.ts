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
  
  // 目次も言語別に取得
  const tableOfContentsKey = `tableOfContents_${lang}`;
  const tableOfContents = article[tableOfContentsKey] || article.tableOfContents || [];
  
  return {
    id: article.id,
    slug: article.slug,
    title: localized.title || article.title || '',
    content: localized.content || article.content || '',
    excerpt: localized.excerpt || article.excerpt || '',
    metaTitle: localized.metaTitle || article.metaTitle || localized.title || article.title || '',
    metaDescription: localized.metaDescription || article.metaDescription || localized.excerpt || article.excerpt || '',
    aiSummary: localized.aiSummary || article.aiSummary || '',
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
    tableOfContents,
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
    name: localized.name || category.name || '',
    description: localized.description || category.description || '',
    imageUrl: category.imageUrl,
    imageAlt: category.imageAlt,
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
    name: localized.name || tag.name || '',
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
    handleName: localized.handleName || writer.handleName || '',
    bio: localized.bio || writer.bio || '',
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
    'excerpt',
    'metaTitle',
    'metaDescription',
  ]);
  
  return {
    id: page.id,
    slug: page.slug,
    title: localized.title || page.title || '',
    content: localized.content || page.content || '',
    excerpt: localized.excerpt || page.excerpt || '',
    metaTitle: localized.metaTitle || page.metaTitle || localized.title || page.title || '',
    metaDescription: localized.metaDescription || page.metaDescription || localized.excerpt || page.excerpt || '',
    featuredImage: page.featuredImage,
    featuredImageAlt: page.featuredImageAlt,
    isPublished: page.isPublished,
    publishedAt: page.publishedAt,
    updatedAt: page.updatedAt,
    mediaId: page.mediaId,
    parentId: page.parentId,
    useBlockBuilder: page.useBlockBuilder || false,
    blocks: page.blocks || [],
  };
}

/**
 * サイト情報をローカライズ
 */
export function localizeSiteInfo(siteInfo: any, lang: Lang) {
  const localized = localizeFields(siteInfo, lang, ['name', 'description']);
  
  return {
    ...siteInfo,
    name: localized.name || siteInfo.name || '',
    description: localized.description || siteInfo.description || '',
  };
}

/**
 * テーマ設定をローカライズ
 */
export function localizeTheme(theme: any, lang: Lang) {
  const localized = { ...theme };
  
  // FV設定
  if (theme.firstView) {
    const fvFields = localizeFields(theme.firstView, lang, ['catchphrase', 'description']);
    localized.firstView = {
      ...theme.firstView,
      catchphrase: fvFields.catchphrase || theme.firstView.catchphrase || '',
      description: fvFields.description || theme.firstView.description || '',
    };
  }
  
  // フッターコンテンツ
  if (theme.footerContents) {
    localized.footerContents = theme.footerContents.map((content: any) => {
      const contentFields = localizeFields(content, lang, ['title', 'description']);
      return {
        ...content,
        title: contentFields.title || content.title || '',
        description: contentFields.description || content.description || '',
      };
    });
  }
  
  // フッターテキストリンクセクション
  if (theme.footerTextLinkSections) {
    localized.footerTextLinkSections = theme.footerTextLinkSections.map((section: any) => {
      const sectionFields = localizeFields(section, lang, ['title']);
      return {
        ...section,
        title: sectionFields.title || section.title || '',
        links: section.links?.map((link: any) => {
          const linkFields = localizeFields(link, lang, ['text']);
          return {
            ...link,
            text: linkFields.text || link.text || '',
          };
        }) || [],
      };
    });
  }
  
  // メニュー設定
  if (theme.menuSettings) {
    const menuFields = localizeFields(theme.menuSettings, lang, ['topLabel', 'articlesLabel', 'searchLabel']);
    localized.menuSettings = {
      ...theme.menuSettings,
      topLabel: menuFields.topLabel || theme.menuSettings.topLabel || 'トップ',
      articlesLabel: menuFields.articlesLabel || theme.menuSettings.articlesLabel || '記事一覧',
      searchLabel: menuFields.searchLabel || theme.menuSettings.searchLabel || '検索',
      customMenus: theme.menuSettings.customMenus?.map((menu: any) => {
        const customMenuFields = localizeFields(menu, lang, ['label']);
        return {
          ...menu,
          label: customMenuFields.label || menu.label || '',
        };
      }) || [],
    };
  }
  
  return localized;
}


import { Lang } from '@/types/lang';

// UIテキストの多言語化
export const translations: Record<Lang, Record<string, string>> = {
  ja: {
    // 共通
    'common.loading': '読み込み中...',
    'common.noResults': '結果がありません',
    'common.readMore': '続きを読む',
    'common.search': '検索',
    'common.close': '閉じる',
    'common.menu': 'メニュー',
    'common.articles': '記事',
    'common.allRightsReserved': 'All rights reserved.',
    'common.follow': 'をフォロー',
    'common.copy': 'コピー',
    'common.copied': 'コピーしました',
    
    // ナビゲーション
    'nav.top': 'トップ',
    'nav.articles': '記事一覧',
    'nav.search': '検索',
    'nav.categories': 'カテゴリー',
    'nav.tags': 'タグ',
    
    // 記事
    'article.published': '公開',
    'article.updated': '更新',
    'article.publishedAt': '公開日',
    'article.updatedAt': '更新日',
    'article.views': '閲覧数',
    'article.readingTime': 'この記事は約{minutes}分で読めます',
    'article.share': 'この記事をシェア',
    'article.toc': '目次',
    'article.relatedArticles': '関連記事',
    'article.previousArticle': '前の記事',
    'article.nextArticle': '次の記事',
    'article.noPreviousArticle': '前の記事はありません',
    'article.noNextArticle': '次の記事はありません',
    'article.category': 'カテゴリー',
    'article.tags': 'タグ',
    'article.writer': 'ライター',
    
    // セクション
    'section.recentArticles': '新着記事',
    'section.recentArticlesEn': 'Recent Articles',
    'section.popularArticles': '人気記事',
    'section.popularArticlesEn': 'Popular Articles',
    'section.recommendedArticles': 'おすすめ記事',
    'section.recommendedArticlesEn': 'Recommended Articles',
    'section.categories': 'カテゴリー',
    'section.categoriesEn': 'Categories',
    'section.searchResults': '件の記事が見つかりました',
    'section.searchResultsEn': 'Search Results',
    
    // 検索
    'search.keywordPlaceholder': 'キーワードで検索',
    'search.tagSearch': 'タグで検索',
    'search.selectTag': 'タグを選択',
    'search.noTags': 'タグがありません',
    'search.tagSearchResults': 'タグ検索結果',
    'search.categorySearchResults': 'カテゴリー検索結果',
    
    // メッセージ
    'message.noArticles': '記事がまだありません',
    'message.noCategoryArticles': 'このカテゴリーの記事はまだありません',
    'message.noTagArticles': 'このタグの記事はまだありません',
    'message.noWriterArticles': 'このライターの記事はまだありません',
    'message.noSearchResults': '記事が見つかりませんでした',
    'message.enterSearchKeyword': '検索キーワードを入力してください',
    'message.notFound': 'ページが見つかりません',
    
    // メタ
    'meta.articleList': '記事一覧',
    'meta.articles': 'ARTICLES',
    'meta.search': '検索',
    'meta.searchMeta': 'SEARCH',
    'meta.category': 'CATEGORY',
    'meta.tag': 'TAG',
    'meta.writer': 'WRITER',
    'meta.articlesCount': '{count}件の記事',
  },
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.noResults': 'No results',
    'common.readMore': 'Read more',
    'common.search': 'Search',
    'common.close': 'Close',
    'common.menu': 'Menu',
    'common.articles': 'Articles',
    'common.allRightsReserved': 'All rights reserved.',
    'common.follow': 'Follow',
    'common.copy': 'Copy',
    'common.copied': 'Copied',
    
    // Navigation
    'nav.top': 'Top',
    'nav.articles': 'Articles',
    'nav.search': 'Search',
    'nav.categories': 'Categories',
    'nav.tags': 'Tags',
    
    // Article
    'article.published': 'Published',
    'article.updated': 'Updated',
    'article.publishedAt': 'Published',
    'article.updatedAt': 'Updated',
    'article.views': 'Views',
    'article.readingTime': 'About {minutes} min read',
    'article.share': 'Share this article',
    'article.toc': 'Table of Contents',
    'article.relatedArticles': 'Related Articles',
    'article.previousArticle': 'Previous Article',
    'article.nextArticle': 'Next Article',
    'article.noPreviousArticle': 'No previous article',
    'article.noNextArticle': 'No next article',
    'article.category': 'Category',
    'article.tags': 'Tags',
    'article.writer': 'Writer',
    
    // Sections
    'section.recentArticles': 'Recent Articles',
    'section.recentArticlesEn': 'Recent Articles',
    'section.popularArticles': 'Popular Articles',
    'section.popularArticlesEn': 'Popular Articles',
    'section.recommendedArticles': 'Recommended Articles',
    'section.recommendedArticlesEn': 'Recommended Articles',
    'section.categories': 'Categories',
    'section.categoriesEn': 'Categories',
    'section.searchResults': ' articles found',
    'section.searchResultsEn': 'Search Results',
    
    // Search
    'search.keywordPlaceholder': 'Search by keyword',
    'search.tagSearch': 'Search by tag',
    'search.selectTag': 'Select a tag',
    'search.noTags': 'No tags available',
    'search.tagSearchResults': 'Tag search results',
    'search.categorySearchResults': 'Category search results',
    
    // Messages
    'message.noArticles': 'No articles yet',
    'message.noCategoryArticles': 'No articles in this category yet',
    'message.noTagArticles': 'No articles with this tag yet',
    'message.noWriterArticles': 'No articles by this writer yet',
    'message.noSearchResults': 'No articles found',
    'message.enterSearchKeyword': 'Enter search keyword',
    'message.notFound': 'Page not found',
    
    // Meta
    'meta.articleList': 'Article List',
    'meta.articles': 'ARTICLES',
    'meta.search': 'Search',
    'meta.searchMeta': 'SEARCH',
    'meta.category': 'CATEGORY',
    'meta.tag': 'TAG',
    'meta.writer': 'WRITER',
    'meta.articlesCount': '{count} articles',
  },
  zh: {
    // 共通
    'common.loading': '加载中...',
    'common.noResults': '无结果',
    'common.readMore': '阅读更多',
    'common.search': '搜索',
    'common.close': '关闭',
    'common.menu': '菜单',
    'common.articles': '文章',
    'common.allRightsReserved': '版权所有。',
    'common.follow': '关注',
    'common.copy': '复制',
    'common.copied': '已复制',
    
    // 导航
    'nav.top': '首页',
    'nav.articles': '文章列表',
    'nav.search': '搜索',
    'nav.categories': '分类',
    'nav.tags': '标签',
    
    // 文章
    'article.published': '发布',
    'article.updated': '更新',
    'article.publishedAt': '发布日期',
    'article.updatedAt': '更新日期',
    'article.views': '浏览量',
    'article.readingTime': '约{minutes}分钟阅读',
    'article.share': '分享这篇文章',
    'article.toc': '目录',
    'article.relatedArticles': '相关文章',
    'article.previousArticle': '上一篇文章',
    'article.nextArticle': '下一篇文章',
    'article.noPreviousArticle': '没有上一篇文章',
    'article.noNextArticle': '没有下一篇文章',
    'article.category': '分类',
    'article.tags': '标签',
    'article.writer': '作者',
    
    // 栏目
    'section.recentArticles': '最新文章',
    'section.recentArticlesEn': 'Recent Articles',
    'section.popularArticles': '热门文章',
    'section.popularArticlesEn': 'Popular Articles',
    'section.recommendedArticles': '推荐文章',
    'section.recommendedArticlesEn': 'Recommended Articles',
    'section.categories': '分类',
    'section.categoriesEn': 'Categories',
    'section.searchResults': '篇文章',
    'section.searchResultsEn': 'Search Results',
    
    // 搜索
    'search.keywordPlaceholder': '关键词搜索',
    'search.tagSearch': '标签搜索',
    'search.selectTag': '选择标签',
    'search.noTags': '暂无标签',
    'search.tagSearchResults': '标签搜索结果',
    'search.categorySearchResults': '分类搜索结果',
    
    // 消息
    'message.noArticles': '暂无文章',
    'message.noCategoryArticles': '此分类暂无文章',
    'message.noTagArticles': '此标签暂无文章',
    'message.noWriterArticles': '该作者暂无文章',
    'message.noSearchResults': '未找到文章',
    'message.enterSearchKeyword': '请输入搜索关键词',
    'message.notFound': '页面未找到',
    
    // 元数据
    'meta.articleList': '文章列表',
    'meta.articles': 'ARTICLES',
    'meta.search': '搜索',
    'meta.searchMeta': 'SEARCH',
    'meta.category': 'CATEGORY',
    'meta.tag': 'TAG',
    'meta.writer': 'WRITER',
    'meta.articlesCount': '{count}篇文章',
  },
  ko: {
    // 공통
    'common.loading': '로딩 중...',
    'common.noResults': '결과 없음',
    'common.readMore': '더 읽기',
    'common.search': '검색',
    'common.close': '닫기',
    'common.menu': '메뉴',
    'common.articles': '기사',
    'common.allRightsReserved': '모든 권리 보유.',
    'common.follow': '팔로우',
    'common.copy': '복사',
    'common.copied': '복사됨',
    
    // 내비게이션
    'nav.top': '홈',
    'nav.articles': '기사 목록',
    'nav.search': '검색',
    'nav.categories': '카테고리',
    'nav.tags': '태그',
    
    // 기사
    'article.published': '게시',
    'article.updated': '수정',
    'article.publishedAt': '게시일',
    'article.updatedAt': '수정일',
    'article.views': '조회수',
    'article.readingTime': '약 {minutes}분 소요',
    'article.share': '이 기사 공유',
    'article.toc': '목차',
    'article.relatedArticles': '관련 기사',
    'article.previousArticle': '이전 기사',
    'article.nextArticle': '다음 기사',
    'article.noPreviousArticle': '이전 기사 없음',
    'article.noNextArticle': '다음 기사 없음',
    'article.category': '카테고리',
    'article.tags': '태그',
    'article.writer': '작성자',
    
    // 섹션
    'section.recentArticles': '최신 기사',
    'section.recentArticlesEn': 'Recent Articles',
    'section.popularArticles': '인기 기사',
    'section.popularArticlesEn': 'Popular Articles',
    'section.recommendedArticles': '추천 기사',
    'section.recommendedArticlesEn': 'Recommended Articles',
    'section.categories': '카테고리',
    'section.categoriesEn': 'Categories',
    'section.searchResults': '개의 기사를 찾았습니다',
    'section.searchResultsEn': 'Search Results',
    
    // 검색
    'search.keywordPlaceholder': '키워드로 검색',
    'search.tagSearch': '태그로 검색',
    'search.selectTag': '태그 선택',
    'search.noTags': '태그가 없습니다',
    'search.tagSearchResults': '태그 검색 결과',
    'search.categorySearchResults': '카테고리 검색 결과',
    
    // 메시지
    'message.noArticles': '아직 기사가 없습니다',
    'message.noCategoryArticles': '이 카테고리에 기사가 없습니다',
    'message.noTagArticles': '이 태그에 기사가 없습니다',
    'message.noWriterArticles': '이 작성자의 기사가 없습니다',
    'message.noSearchResults': '기사를 찾을 수 없습니다',
    'message.enterSearchKeyword': '검색 키워드를 입력하세요',
    'message.notFound': '페이지를 찾을 수 없습니다',
    
    // 메타
    'meta.articleList': '기사 목록',
    'meta.articles': 'ARTICLES',
    'meta.search': '검색',
    'meta.searchMeta': 'SEARCH',
    'meta.category': 'CATEGORY',
    'meta.tag': 'TAG',
    'meta.writer': 'WRITER',
    'meta.articlesCount': '{count}개의 기사',
  },
};

export function t(key: string, lang: Lang = 'ja', params?: Record<string, string | number>): string {
  let text = translations[lang]?.[key] || translations.ja[key] || key;
  
  // パラメータ置換
  if (params) {
    Object.keys(params).forEach(paramKey => {
      text = text.replace(`{${paramKey}}`, String(params[paramKey]));
    });
  }
  
  return text;
}


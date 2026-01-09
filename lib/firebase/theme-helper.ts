import { adminDb } from './admin';
import { Theme, defaultTheme } from '@/types/theme';

// Themeキャッシュ（5分間）
const themeCache = new Map<string, { theme: Theme; timestamp: number }>();
const THEME_CACHE_TTL = 5 * 60 * 1000; // 5分

/**
 * テーマキャッシュをクリア
 */
export function clearThemeCache(mediaId?: string): void {
  if (mediaId) {
    themeCache.delete(mediaId);
  } else {
    themeCache.clear();
  }
}

/**
 * mediaIdからTheme情報を取得（キャッシュ付き）
 */
export async function getTheme(mediaId: string): Promise<Theme> {
  try {
    // mediaIdが空の場合はデフォルトテーマを返す
    if (!mediaId || mediaId.trim() === '') {
      console.warn('[getTheme] mediaId is empty, returning default theme');
      return defaultTheme;
    }

    // キャッシュチェック
    const cached = themeCache.get(mediaId);
    if (cached && Date.now() - cached.timestamp < THEME_CACHE_TTL) {
      return cached.theme;
    }

    // Firestoreから取得
    const tenantDoc = await adminDb.collection('mediaTenants').doc(mediaId).get();
    
    if (!tenantDoc.exists) {
      return defaultTheme;
    }

    const data = tenantDoc.data();
    const savedTheme = data?.theme || {};
    
    // searchSettingsを深くマージ
    const mergedSearchSettings = {
      ...defaultTheme.searchSettings,
      ...savedTheme.searchSettings,
      displayPages: {
        ...defaultTheme.searchSettings?.displayPages,
        ...savedTheme.searchSettings?.displayPages,
      },
      searchTypes: {
        ...defaultTheme.searchSettings?.searchTypes,
        ...savedTheme.searchSettings?.searchTypes,
      },
      popularTagsSettings: {
        ...defaultTheme.searchSettings?.popularTagsSettings,
        ...savedTheme.searchSettings?.popularTagsSettings,
      },
    };
    
    const theme: Theme = {
      ...defaultTheme,
      ...savedTheme,
      searchSettings: mergedSearchSettings,
    };

    // キャッシュに保存
    themeCache.set(mediaId, {
      theme,
      timestamp: Date.now(),
    });

    return theme;
  } catch (error) {
    console.error('[getTheme] Error:', error);
    return defaultTheme;
  }
}

/**
 * Themeからスタイル文字列を生成
 */
export function generateThemeStyles(theme: Theme): string {
  return `
    :root {
      --color-primary: ${theme.primaryColor};
      --primary-color: ${theme.primaryColor};
      --secondary-color: ${theme.secondaryColor};
      --accent-color: ${theme.accentColor};
      --background-color: ${theme.backgroundColor};
      --header-background-color: ${theme.headerBackgroundColor};
      --footer-background-color: ${theme.footerBackgroundColor};
      --block-background-color: ${theme.blockBackgroundColor};
      --menu-bg-color: ${theme.menuBackgroundColor};
      --menu-text-color: ${theme.menuTextColor};
      --link-color: ${theme.linkColor};
      --link-hover-color: ${theme.linkHoverColor};
      --border-color: ${theme.borderColor};
      --shadow-color: ${theme.shadowColor};
    }
  `;
}

/**
 * カスタムCSSとThemeスタイルを組み合わせる
 */
export function getCombinedStyles(theme: Theme): string {
  const themeStyles = generateThemeStyles(theme);
  const customCss = theme.customCss || '';
  
  return `
    ${themeStyles}
    ${customCss}
  `;
}


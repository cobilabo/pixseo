import type { FooterBlock, Theme } from '@/types/theme';

/** 画像URLが有効なバナーのみ残す（空・空白のみは除外） */
export function filterValidFooterBlocks(blocks: FooterBlock[] | undefined | null): FooterBlock[] {
  if (!blocks || !Array.isArray(blocks)) return [];
  return blocks.filter((b) => b && typeof b.imageUrl === 'string' && b.imageUrl.trim() !== '');
}

/**
 * 保存用：トップレベルと現在レイアウトの themeSettings の footerBlocks を同一の正規化結果に揃える。
 * 画像削除後に片方だけ古い URL が残る不整合を防ぐ。
 */
export function syncFooterBlocksInTheme(theme: Theme): Theme {
  const layout = theme.layoutTheme || 'cobi';
  const raw = theme.footerBlocks ?? theme.themeSettings?.[layout]?.footerBlocks;
  const valid = filterValidFooterBlocks(raw);

  const next: Theme = {
    ...theme,
    footerBlocks: valid,
  };

  const layoutSettings = theme.themeSettings?.[layout];
  if (theme.themeSettings) {
    next.themeSettings = {
      ...theme.themeSettings,
      [layout]: {
        ...(layoutSettings || {}),
        footerBlocks: valid,
      },
    };
  }

  return next;
}

/**
 * 取得用：トップレベルが無い場合は themeSettings から解決し、有効なブロックのみに絞る。
 */
export function resolveFooterBlocksForDisplay(theme: Theme): FooterBlock[] {
  const layout = theme.layoutTheme || 'cobi';
  const raw = theme.footerBlocks ?? theme.themeSettings?.[layout]?.footerBlocks;
  return filterValidFooterBlocks(raw);
}

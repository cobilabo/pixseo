/** 記事 FV / 一覧サムネイルの推奨比率（1200×630 = OGP 標準） */
export const FEATURED_IMAGE_WIDTH = 1200;
export const FEATURED_IMAGE_HEIGHT = 630;
export const FEATURED_IMAGE_ASPECT_RATIO = `${FEATURED_IMAGE_WIDTH} / ${FEATURED_IMAGE_HEIGHT}` as const;
/** 記事ヒーロー（メインカラム幅）。srcset は next.config の deviceSizes に従う */
export const FEATURED_IMAGE_SIZES = '(max-width: 1024px) 100vw, 800px' as const;

export const FEATURED_IMAGE_ASPECT_HINT =
  '※ 推奨サイズ: 1200 × 630 px（アスペクト比 1.91:1）。大きな写真は自動で縮小されます。';

export const WRITER_ICON_IMAGE_HINT =
  '※ 推奨サイズ: 800 × 800 px（正方形）。大きな写真は自動で縮小されます。';

export const WRITER_BACKGROUND_IMAGE_HINT =
  '※ 推奨サイズ: 1200 × 630 px（アスペクト比 1.91:1）。大きな写真は自動で縮小されます。';
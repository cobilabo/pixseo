/** 記事 FV / 一覧サムネイルの推奨比率（1200×630 = OGP 標準） */
export const FEATURED_IMAGE_WIDTH = 1200;
export const FEATURED_IMAGE_HEIGHT = 630;
export const FEATURED_IMAGE_ASPECT_RATIO = `${FEATURED_IMAGE_WIDTH} / ${FEATURED_IMAGE_HEIGHT}` as const;

export const FEATURED_IMAGE_ASPECT_HINT =
  '推奨サイズ: 1200 × 630 px（アスペクト比 1.91:1）。記事詳細のFVと一覧サムネイルで同じ比率を使用します。文字や被写体は中央付近に配置してください。';
/**
 * フィルターヘルパー関数
 * 画像ブロック用のフィルタースタイルを生成
 */

/**
 * HEXカラーをRGBAに変換
 */
function hexToRgba(hex: string, alpha: number): string {
  // # を削除
  hex = hex.replace(/^#/, '');
  
  // 3桁の場合は6桁に展開
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * フィルタースタイルを生成
 */
export function getFilterStyle(
  filterType: 'none' | 'full' | 'top' | 'bottom' | 'top-bottom' | 'all-direction' | undefined,
  filterColor: string | undefined,
  filterOpacity: number | undefined
): React.CSSProperties | null {
  // フィルタータイプまたはフィルターカラーが未設定の場合は null
  if (!filterType || filterType === 'none' || !filterColor) {
    return null;
  }
  
  // 透明度が未設定または0の場合は null
  if (filterOpacity === undefined || filterOpacity === 0) {
    return null;
  }
  
  // 透明度を0-1の範囲に変換（設定値は0-100）
  const opacity = filterOpacity / 100;
  
  // フィルターカラーをRGBAに変換
  const rgbaWithOpacity = hexToRgba(filterColor, opacity);
  const rgbaFull = hexToRgba(filterColor, 1); // 透明度0%（完全な色）
  
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  };
  
  switch (filterType) {
    case 'full':
      // 全面フィルタ
      return {
        ...baseStyle,
        backgroundColor: rgbaWithOpacity,
      };
      
    case 'top':
      // 上部グラデーションフィルタ
      // 上端（0%）: 完全な色（透明度0%）
      // 30%の位置: 設定透明度
      return {
        ...baseStyle,
        background: `linear-gradient(to bottom, ${rgbaFull} 0%, ${rgbaWithOpacity} 30%)`,
      };
      
    case 'bottom':
      // 下部グラデーションフィルタ
      // 下端（100%）: 完全な色（透明度0%）
      // 70%の位置（下から30%）: 設定透明度
      return {
        ...baseStyle,
        background: `linear-gradient(to bottom, ${rgbaWithOpacity} 70%, ${rgbaFull} 100%)`,
      };
      
    case 'top-bottom':
      // 上下グラデーションフィルタ
      // 上端（0%）: 完全な色
      // 30%の位置: 設定透明度
      // 70%の位置: 設定透明度
      // 下端（100%）: 完全な色
      return {
        ...baseStyle,
        background: `linear-gradient(to bottom, ${rgbaFull} 0%, ${rgbaWithOpacity} 30%, ${rgbaWithOpacity} 70%, ${rgbaFull} 100%)`,
      };
      
    case 'all-direction':
      // 全方位グラデーションフィルタ
      // 中心から外側に向かってグラデーション
      // 中心（0%）: 設定透明度
      // 外側（100%）: 完全な色
      return {
        ...baseStyle,
        background: `radial-gradient(ellipse at center, ${rgbaWithOpacity} 0%, ${rgbaWithOpacity} 30%, ${rgbaFull} 100%)`,
      };
      
    default:
      return null;
  }
}


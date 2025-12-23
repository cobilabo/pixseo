/**
 * WordPressから移行したHTMLをクリーニングする
 * - WordPressコメントタグを削除
 * - 不正なHTMLタグのネストを修正
 * - 空タグを削除
 * - HTMLを正規化
 * - スクリプトタグやiframeは保持（埋め込みコンテンツ用）
 */
export function cleanWordPressHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let cleaned = html;

  // 1. WordPressコメントタグを削除（スクリプトタグ内のコメントは除外）
  // スクリプトタグやiframe内のコメントは保持するため、先にそれらを一時的に置換
  const scriptPlaceholders: string[] = [];
  const iframePlaceholders: string[] = [];
  
  // スクリプトタグを一時的に置換
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, (match) => {
    scriptPlaceholders.push(match);
    return `__SCRIPT_PLACEHOLDER_${scriptPlaceholders.length - 1}__`;
  });
  
  // iframeタグを一時的に置換
  cleaned = cleaned.replace(/<iframe[\s\S]*?<\/iframe>/gi, (match) => {
    iframePlaceholders.push(match);
    return `__IFRAME_PLACEHOLDER_${iframePlaceholders.length - 1}__`;
  });

  // WordPressコメントタグを削除
  cleaned = cleaned.replace(/<!--\s*wp:.*?-->/g, '');
  cleaned = cleaned.replace(/<!--\s*\/wp:.*?-->/g, '');
  cleaned = cleaned.replace(/<!--\s*\/wp:.*?$/gm, '');

  // 2. 不要なHTMLコメントを削除（wp以外も、ただしスクリプト/iframe内は除外済み）
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // 3. WordPressクラス名を削除（instagram-mediaなどのSNS埋め込みは除外）
  cleaned = cleaned.replace(/class="(?!instagram-media|twitter-tweet)[^"]*wp-[^"]*"/g, '');
  
  // 4. <figure>を<div>に変換（Instagram埋め込みなどのblockquoteは除外）
  cleaned = cleaned.replace(/<figure(?![^>]*class="[^"]*instagram-media[^"]*")([^>]*)>/g, '<div$1>');
  cleaned = cleaned.replace(/<\/figure>/g, '</div>');
  
  // 5. <figcaption>を<p>に変換
  cleaned = cleaned.replace(/<figcaption([^>]*)>/g, '<p$1>');
  cleaned = cleaned.replace(/<\/figcaption>/g, '</p>');

  // 6. 空の<p>タグを削除
  cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');
  cleaned = cleaned.replace(/<p><br\s*\/?><\/p>/g, '');
  cleaned = cleaned.replace(/<p>&nbsp;<\/p>/g, '');
  cleaned = cleaned.replace(/<p><\/p>/g, '');

  // 7. 連続する<br>タグを2つまでに制限
  cleaned = cleaned.replace(/(<br\s*\/?>\s*){3,}/g, '<br><br>');

  // 8. 正規表現ベースの修正（サーバーサイドでも動作）
  // <p>内のブロック要素を外に出す
  const blockElementsRegex = /<p>(\s*(?:<h[1-6]|<div|<ul|<ol|<table|<blockquote)[^>]*>[\s\S]*?<\/(?:h[1-6]|div|ul|ol|table|blockquote)>\s*)<\/p>/gi;
  cleaned = cleaned.replace(blockElementsRegex, '$1');

  // 9. 不正な</p><p>パターンを修正
  cleaned = cleaned.replace(/<\/p>\s*<p>/g, '</p>\n<p>');

  // 10. 先頭と末尾の空白・改行を削除
  cleaned = cleaned.trim();

  // 11. 連続する空行を削除
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 12. 余分な空白を削除（スクリプト/iframe内は除外）
  cleaned = cleaned.replace(/>\s+</g, '><');

  // 13. スクリプトタグとiframeタグを復元
  scriptPlaceholders.forEach((script, index) => {
    cleaned = cleaned.replace(`__SCRIPT_PLACEHOLDER_${index}__`, script);
  });
  
  iframePlaceholders.forEach((iframe, index) => {
    cleaned = cleaned.replace(`__IFRAME_PLACEHOLDER_${index}__`, iframe);
  });

  return cleaned;
}


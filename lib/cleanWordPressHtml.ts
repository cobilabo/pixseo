/**
 * WordPressから移行したHTMLをクリーニングする
 * - WordPressコメントタグを削除
 * - 不正なHTMLタグのネストを修正
 * - 空タグを削除
 * - HTMLを正規化
 */
export function cleanWordPressHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let cleaned = html;

  // 1. すべてのHTMLコメントを削除（WordPressコメント、通常のコメント含む）
  // より積極的なマッチング
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // 2. WordPressクラス名を削除（instagram-mediaなどのSNS埋め込みは除外）
  cleaned = cleaned.replace(/class="(?!instagram-media|twitter-tweet|reference-link)[^"]*wp-[^"]*"/g, '');
  
  // 3. <figure>を<div>に変換（Instagram埋め込みなどのblockquoteは除外）
  cleaned = cleaned.replace(/<figure(?![^>]*class="[^"]*instagram-media[^"]*")([^>]*)>/gi, '<div$1>');
  cleaned = cleaned.replace(/<\/figure>/gi, '</div>');
  
  // 4. <figcaption>を<p>に変換
  cleaned = cleaned.replace(/<figcaption([^>]*)>/gi, '<p$1>');
  cleaned = cleaned.replace(/<\/figcaption>/gi, '</p>');

  // 5. 不正なネストを修正（<p>内の<h2>など）
  // <p>の直後に<h2>などのブロック要素がある場合、<p>を閉じる
  cleaned = cleaned.replace(/<p>(\s*)<(h[1-6]|div|ul|ol|table|blockquote)/gi, '<p>$1</p><$2');
  
  // 6. <p>内のブロック要素を外に出す（より強力）
  cleaned = cleaned.replace(/<p>(\s*<(h[1-6]|div|ul|ol|table|blockquote)[^>]*>[\s\S]*?<\/\2>\s*)<\/p>/gi, '$1');

  // 7. 直接ネストされているブロック要素を修正（<p><h2>のパターン）
  // 複数回実行して深いネストも修正
  for (let i = 0; i < 3; i++) {
    // <p>の直後にブロック要素が来る場合、<p>を削除
    cleaned = cleaned.replace(/<p>(\s*<(h[1-6]|div|ul|ol|table|blockquote)[^>]*>)/gi, '$1');
    // ブロック要素の直後に</p>が来る場合、</p>を削除
    cleaned = cleaned.replace(/(<\/(h[1-6]|div|ul|ol|table|blockquote)>\s*)<\/p>/gi, '$1');
  }

  // 8. 空の<p>タグを削除（複数パターン）
  cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');
  cleaned = cleaned.replace(/<p><br\s*\/?><\/p>/g, '');
  cleaned = cleaned.replace(/<p>&nbsp;<\/p>/g, '');
  cleaned = cleaned.replace(/<p><\/p>/g, '');
  cleaned = cleaned.replace(/<p>\s*<br\s*\/?>\s*<\/p>/g, '');

  // 9. 空の<div>タグを削除
  cleaned = cleaned.replace(/<div>\s*<\/div>/g, '');
  cleaned = cleaned.replace(/<div><\/div>/g, '');

  // 10. 連続する<br>タグを2つまでに制限
  cleaned = cleaned.replace(/(<br\s*\/?>\s*){3,}/g, '<br><br>');

  // 11. 不正な</p><p>パターンを修正
  cleaned = cleaned.replace(/<\/p>\s*<p>/g, '</p><p>');

  // 12. 先頭と末尾の空白・改行を削除
  cleaned = cleaned.trim();

  // 13. タグ間の余分な空白を削除（ただし改行は維持）
  cleaned = cleaned.replace(/>\s+</g, '><');

  // 14. 最後にもう一度空タグを削除（ネスト修正後に発生した空タグ）
  cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');
  cleaned = cleaned.replace(/<div>\s*<\/div>/g, '');

  return cleaned;
}


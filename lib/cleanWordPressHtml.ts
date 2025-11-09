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

  // 1. WordPressコメントタグを削除
  cleaned = cleaned.replace(/<!--\s*wp:.*?-->/g, '');
  cleaned = cleaned.replace(/<!--\s*\/wp:.*?-->/g, '');
  cleaned = cleaned.replace(/<!--\s*\/wp:.*?$/gm, '');

  // 2. 不要なHTMLコメントを削除（wp以外も）
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // 3. 空の<p>タグを削除
  cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');
  cleaned = cleaned.replace(/<p><br\s*\/?><\/p>/g, '');
  cleaned = cleaned.replace(/<p>&nbsp;<\/p>/g, '');

  // 4. 連続する<br>タグを1つに
  cleaned = cleaned.replace(/(<br\s*\/?>\s*){3,}/g, '<br><br>');

  // 5. DOMParserで不正なHTMLを修正
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(cleaned, 'text/html');
      
      // <p>タグの中にブロック要素がある場合は修正
      const paragraphs = doc.querySelectorAll('p');
      paragraphs.forEach(p => {
        const blockElements = p.querySelectorAll('h1, h2, h3, h4, h5, h6, div, figure, ul, ol, table, blockquote');
        if (blockElements.length > 0) {
          // ブロック要素を<p>の外に移動
          blockElements.forEach(block => {
            p.parentNode?.insertBefore(block, p.nextSibling);
          });
          // <p>が空になったら削除
          if (!p.textContent?.trim()) {
            p.remove();
          }
        }
      });

      // 空要素を削除
      const emptyElements = doc.querySelectorAll('p:empty, span:empty, div:empty');
      emptyElements.forEach(el => {
        if (!el.hasChildNodes() && !el.textContent?.trim()) {
          el.remove();
        }
      });

      // body.innerHTMLを取得
      cleaned = doc.body.innerHTML;
    } catch (error) {
      console.warn('[cleanWordPressHtml] DOMParser error:', error);
      // DOMParserが失敗した場合は正規表現ベースのクリーニングを継続
    }
  }

  // 6. 不正な</p><p>パターンを修正
  cleaned = cleaned.replace(/<\/p>\s*<p>/g, '</p>\n<p>');

  // 7. 先頭と末尾の空白・改行を削除
  cleaned = cleaned.trim();

  // 8. 連続する空行を削除
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned;
}


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
  // スクリプトタグ、iframe、HTMLブロック内のコメントは保持するため、先にそれらを一時的に置換
  const scriptPlaceholders: string[] = [];
  const iframePlaceholders: string[] = [];
  const htmlBlockPlaceholders: string[] = [];

  // 目次プレースホルダーをシンプルなマーカーに正規化（depth-countingでネストdivを正確にマッチ）
  cleaned = normalizeTocPlaceholder(cleaned);

  // 管理画面リッチテキストの画像ブロック（figure.image-figure）を保護（後続の figure→div / figcaption→p で壊れるのを防ぐ）
  const imageFigurePlaceholders: string[] = [];
  cleaned = cleaned.replace(
    /<figure[^>]*\bimage-figure\b[^>]*>[\s\S]*?<\/figure>/gi,
    (match) => {
      imageFigurePlaceholders.push(match);
      return `__IMAGE_FIGURE_PLACEHOLDER_${imageFigurePlaceholders.length - 1}__`;
    }
  );
  
  // HTMLブロック（カスタムエディタのHTMLブロック）を一時的に置換
  cleaned = cleaned.replace(/<div[^>]*class="html-block"[^>]*>[\s\S]*?<\/div>/gi, (match) => {
    htmlBlockPlaceholders.push(match);
    return `__HTML_BLOCK_PLACEHOLDER_${htmlBlockPlaceholders.length - 1}__`;
  });
  
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

  // 13. スクリプトタグ、iframeタグ、HTMLブロックを復元
  scriptPlaceholders.forEach((script, index) => {
    cleaned = cleaned.replace(`__SCRIPT_PLACEHOLDER_${index}__`, script);
  });
  
  iframePlaceholders.forEach((iframe, index) => {
    cleaned = cleaned.replace(`__IFRAME_PLACEHOLDER_${index}__`, iframe);
  });
  
  htmlBlockPlaceholders.forEach((htmlBlock, index) => {
    cleaned = cleaned.replace(`__HTML_BLOCK_PLACEHOLDER_${index}__`, htmlBlock);
  });

  imageFigurePlaceholders.forEach((block, index) => {
    cleaned = cleaned.replace(`__IMAGE_FIGURE_PLACEHOLDER_${index}__`, block);
  });

  return cleaned;
}

/**
 * 本文中に残った目次プレースホルダー（エディタ装飾チャンクを含む可能性あり）を
 * `<div class="toc-placeholder" data-toc="auto"></div>` 一本のシンプルな形に正規化する。
 *
 * 旧実装は class="toc-placeholder"（閉じクォート込み）でしか検出できず、
 * class="toc-placeholder not-prose" のようにクラスが追加されるとすり抜けて
 * エディタの装飾 HTML が Firestore に保存されていた。
 * ここでは「toc-placeholder をクラストークンに含む div」または「data-toc 属性を持つ div」の
 * どちらでもヒットするようにし、深さカウントで対応する </div> を検出して差し替える。
 */
function normalizeTocPlaceholder(html: string): string {
  const simple = '<div class="toc-placeholder" data-toc="auto"></div>';
  // 開始タグ全体（属性を含む）を捕捉する。属性値に `>` は含めない想定。
  const openTagRegex = /<div\b[^>]*>/gi;
  let result = html;
  let searchStart = 0;

  while (true) {
    openTagRegex.lastIndex = searchStart;
    const openMatch = openTagRegex.exec(result);
    if (!openMatch) break;

    const openTag = openMatch[0];
    const openTagStart = openMatch.index;
    const openTagEnd = openTagStart + openTag.length;

    // 目次プレースホルダー（外側コンテナ）の判定：
    //   - class のどこかに `toc-placeholder`（単語境界）
    //   - もしくは data-toc="auto" / data-toc 属性を持つ
    const classMatch = /class\s*=\s*"([^"]*)"/i.exec(openTag);
    const classTokens = classMatch ? classMatch[1].split(/\s+/) : [];
    const isTocContainer =
      classTokens.includes('toc-placeholder') || /\sdata-toc\s*=/.test(` ${openTag}`);

    if (!isTocContainer) {
      searchStart = openTagEnd;
      continue;
    }

    // 対応する閉じタグを深さカウントで探す
    let depth = 1;
    let pos = openTagEnd;
    let matched = false;

    while (depth > 0 && pos < result.length) {
      const nextOpen = result.indexOf('<div', pos);
      const nextClose = result.indexOf('</div>', pos);
      if (nextClose === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        const innerTagEnd = result.indexOf('>', nextOpen);
        if (innerTagEnd === -1) break;
        depth++;
        pos = innerTagEnd + 1;
      } else {
        depth--;
        if (depth === 0) {
          const endPos = nextClose + '</div>'.length;
          result = result.substring(0, openTagStart) + simple + result.substring(endPos);
          searchStart = openTagStart + simple.length;
          matched = true;
          break;
        }
        pos = nextClose + '</div>'.length;
      }
    }

    if (!matched) {
      searchStart = openTagEnd;
    }
  }

  return result;
}

/**
 * 外部（ArticleContent など）からも同じ正規化を呼び出せるよう公開するヘルパ。
 */
export function normalizeInlineTocPlaceholder(html: string): string {
  if (!html) return html ?? '';
  return normalizeTocPlaceholder(html);
}


const GUID_OPEN_RE =
  /<(span|font|b|strong|em|i)\b[^>]*\bid=["']docs-internal-guid-[^"']+["'][^>]*>/gi;

/**
 * Google ドキュメント貼り付けのラッパー
 * （span#docs-internal-guid-* が h2/p を包む不正 HTML）を外す。
 * ブラウザがタグを組み替えると React #418 / #422 になる。
 */
export function unwrapDocsInternalGuidWrappers(html: string): string {
  if (!html || !/docs-internal-guid/i.test(html)) return html;

  let result = '';
  let lastIndex = 0;
  const openRe = new RegExp(GUID_OPEN_RE.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = openRe.exec(html)) !== null) {
    const tag = match[1];
    const openStart = match.index;
    const openEnd = match.index + match[0].length;
    const closeStart = findMatchingCloseTag(html, tag, openEnd);
    if (closeStart < 0) {
      continue;
    }
    const closeEnd = closeStart + tag.length + 3; // </tag>

    result += html.slice(lastIndex, openStart);
    result += html.slice(openEnd, closeStart);
    lastIndex = closeEnd;
    openRe.lastIndex = lastIndex;
  }

  result += html.slice(lastIndex);
  return result;
}

function findMatchingCloseTag(html: string, tag: string, from: number): number {
  const openPat = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
  const closePat = new RegExp(`</${tag}\\s*>`, 'gi');
  let depth = 1;
  let i = from;

  while (i < html.length && depth > 0) {
    openPat.lastIndex = i;
    closePat.lastIndex = i;
    const nextOpen = openPat.exec(html);
    const nextClose = closePat.exec(html);
    if (!nextClose) return -1;

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth += 1;
      i = nextOpen.index + nextOpen[0].length;
    } else {
      depth -= 1;
      if (depth === 0) return nextClose.index;
      i = nextClose.index + nextClose[0].length;
    }
  }

  return -1;
}

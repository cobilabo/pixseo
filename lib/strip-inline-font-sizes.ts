/**
 * Remove font-size from inline style attributes so article body uses theme CSS.
 */
export function stripFontSizeFromCssText(cssText: string): string {
  if (!cssText?.trim()) return '';

  return cssText
    .split(';')
    .map((rule) => rule.trim())
    .filter((rule) => {
      if (!rule) return false;
      const colon = rule.indexOf(':');
      if (colon === -1) return true;
      const prop = rule.slice(0, colon).trim().toLowerCase();
      return prop !== 'font-size';
    })
    .join('; ')
    .trim();
}

/** Strip font-size from inline style attributes in HTML (SSR-safe). */
export function stripInlineFontSizesFromHtml(html: string): string {
  if (!html?.trim()) return html ?? '';

  return html.replace(
    /\sstyle\s*=\s*(["'])([\s\S]*?)\1/gi,
    (match, quote: string, style: string) => {
      const cleaned = stripFontSizeFromCssText(style);
      if (!cleaned) return '';
      return ` style=${quote}${cleaned}${quote}`;
    }
  );
}

/** Strip font-size from a parsed DOM tree (paste normalization on client). */
export function stripFontSizesFromElementTree(root: ParentNode): void {
  root.querySelectorAll('[style]').forEach((el) => {
    if (!(el instanceof HTMLElement)) return;

    const styleAttr = el.getAttribute('style');
    if (!styleAttr) return;

    const cleaned = stripFontSizeFromCssText(styleAttr);
    if (cleaned) el.setAttribute('style', cleaned);
    else el.removeAttribute('style');
  });
}
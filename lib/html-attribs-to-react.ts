import type { CSSProperties } from 'react';

/**
 * HTML の style 属性文字列を React の style オブジェクトに変換
 */
export function parseHtmlInlineStyle(cssText: string): CSSProperties {
  const out: Record<string, string> = {};
  if (!cssText || typeof cssText !== 'string') return out;

  cssText.split(';').forEach((rule) => {
    const colon = rule.indexOf(':');
    if (colon === -1) return;
    const key = rule.slice(0, colon).trim();
    const value = rule.slice(colon + 1).trim();
    if (!key || !value) return;
    const camel = key.replace(/-([a-z])/gi, (_, c: string) => c.toUpperCase());
    out[camel] = value;
  });

  return out as CSSProperties;
}

/**
 * html-react-parser の attribs（class / style が HTML 形式）を React 用 props に変換
 */
export function htmlAttribsToReactProps(
  attribs: Record<string, string | undefined> | undefined
): Record<string, unknown> {
  if (!attribs) return {};

  const { style, class: htmlClass, className: existingClassName, ...rest } =
    attribs;

  const props: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(rest)) {
    if (v === undefined) continue;
    props[k] = v;
  }

  const cls = htmlClass ?? existingClassName;
  if (cls) props.className = cls;

  if (style && typeof style === 'string' && style.trim()) {
    props.style = parseHtmlInlineStyle(style);
  }

  return props;
}

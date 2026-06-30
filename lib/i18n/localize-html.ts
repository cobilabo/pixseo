import { Lang, SUPPORTED_LANGS } from '@/types/lang';

/**
 * HTML内の内部リンクの言語プレフィックスを現在の言語に書き換える
 * 例: href="/ja/contact/" → href="/en/contact/" (lang='en'の場合)
 *      href="/contact/"   → href="/en/contact/" (lang='en'の場合)
 */
export function localizeHtmlLinks(html: string, lang: Lang): string {
  if (!html) return html;

  const langPattern = SUPPORTED_LANGS.join('|');
  const regex = new RegExp(`(href=["'])\/(${langPattern})\/`, 'g');
  let result = html.replace(regex, `$1/${lang}/`);

  // Also handle links without language prefix (e.g. href="/contact/")
  // but only internal links (starting with /) that are NOT already prefixed.
  // NOTE: href="/ja" or href="/ja/" must not become href="/ja/ja" (lang code alone).
  result = result.replace(
    /(href=["'])\/((?!(?:en|ja|zh|ko)(?:\/|["']))[^"']*["'])/g,
    `$1/${lang}/$2`
  );

  return result;
}

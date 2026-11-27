/**
 * 公開フォーム（FormBlock）用のクライアントヘルパー
 * - 送信後リダイレクト先の言語補完
 * - URL クエリによる選択肢の初期チェック
 */

import { isValidLang, type Lang } from '@/types/lang';

/** 選択肢キーとして使える形に正規化（英小文字・数字・-・_ のみ） */
export function normalizeOptionKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
}

/**
 * 送信後のリダイレクト先を解決する。
 *
 * - `https://...` / `//...` の絶対 URL はそのまま
 * - `/ja/...` のように言語付きのパスはそのまま（明示された言語を尊重）
 * - `/contact-thanks/` や `contact-thanks` のように言語なしのパスは、
 *   閲覧中の言語を先頭に付ける（例: 英語ページからの送信 → `/en/contact-thanks/`）
 * - パス部分の末尾スラッシュを補い、trailingSlash による余計な 308 を避ける
 */
export function resolveFormRedirectUrl(rawUrl: string | undefined | null, lang: Lang): string | null {
  const url = (rawUrl || '').trim();
  if (!url) return null;
  if (/^(https?:)?\/\//i.test(url)) return url;

  const match = url.match(/^([^?#]*)(.*)$/);
  let path = match?.[1] ?? url;
  const suffix = match?.[2] ?? '';

  if (!path.startsWith('/')) path = `/${path}`;

  const firstSegment = path.split('/')[1] || '';
  if (!isValidLang(firstSegment)) {
    path = path === '/' ? `/${lang}` : `/${lang}${path}`;
  }

  const lastSegment = path.split('/').pop() || '';
  if (!path.endsWith('/') && !lastSegment.includes('.')) {
    path = `${path}/`;
  }

  return `${path}${suffix}`;
}

/**
 * URL クエリから選択肢の初期値を作る。
 *
 * フィールドの config に
 *   urlParam:   'type'
 *   optionKeys: { 'カスハラ×合理的配慮 ワークショップ/研修': 'kasuhara', ... }
 * が設定されていれば、`?type=kasuhara` で該当選択肢を選択済みにする。
 * `?type=a,b` や `?type=a&type=b` の複数指定はチェックボックスのみ全て反映し、
 * ラジオ・プルダウンは最初に一致したものだけを使う。一致しないキーは無視する。
 */
export function buildPrefillFromQuery(
  fields: Array<{ id: string; type: string; config?: any }>,
  search: string
): Record<string, string | string[]> {
  const params = new URLSearchParams(search);
  const prefill: Record<string, string | string[]> = {};

  for (const field of fields) {
    if (field.type !== 'checkbox' && field.type !== 'radio' && field.type !== 'select') continue;

    const cfg = field.config || {};
    const paramName = typeof cfg.urlParam === 'string' ? cfg.urlParam.trim() : '';
    if (!paramName) continue;

    const requested = params
      .getAll(paramName)
      .flatMap((v) => v.split(','))
      .map(normalizeOptionKey)
      .filter(Boolean);
    if (requested.length === 0) continue;

    const options: string[] = Array.isArray(cfg.options) ? cfg.options : [];
    const optionKeys: Record<string, string> =
      cfg.optionKeys && typeof cfg.optionKeys === 'object' ? cfg.optionKeys : {};

    const matched: string[] = [];
    for (const key of requested) {
      const option = options.find((opt) => normalizeOptionKey(optionKeys[opt] || '') === key);
      if (option && !matched.includes(option)) matched.push(option);
    }
    if (matched.length === 0) continue;

    prefill[field.id] = field.type === 'checkbox' ? matched : matched[0];
  }

  return prefill;
}

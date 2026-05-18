import type { HtmlShortcodeItem } from '@/types/theme';

export const CERTIFIED_STORE_RESERVATION_SHORTCODE_ID = 'shortcode-certified-store-reservation';

export const CERTIFIED_STORE_RESERVATION_LABEL = '認証店記事の予約';

/** サイドバー「詳しくはこちら」と同じオレンジのピルボタン（クラスで CSS タブから編集） */
export const CERTIFIED_STORE_RESERVATION_HTML = `<p class="pixseo-shortcode-reservation-wrap">
  <a href="#" class="pixseo-shortcode-reservation-btn" target="_blank" rel="noopener noreferrer">認証店記事の予約</a>
</p>`;

export const CERTIFIED_STORE_RESERVATION_CSS_MARKER =
  '/* pixseo: certified-store-reservation-button */';

export const CERTIFIED_STORE_RESERVATION_DEFAULT_CSS = `${CERTIFIED_STORE_RESERVATION_CSS_MARKER}
.article-content .pixseo-shortcode-reservation-btn,
.sidebar-custom-html .pixseo-shortcode-reservation-btn {
  display: block;
  width: 100%;
  padding: 12px 0;
  background: #E08A3C;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  border-radius: 9999px;
  text-decoration: none;
  text-align: center;
  box-sizing: border-box;
}
.article-content .pixseo-shortcode-reservation-btn:hover,
.sidebar-custom-html .pixseo-shortcode-reservation-btn:hover {
  background: #c97632;
  color: #fff;
}
`;

export const CERTIFIED_STORE_RESERVATION_SHORTCODE_PRESET: HtmlShortcodeItem = {
  id: CERTIFIED_STORE_RESERVATION_SHORTCODE_ID,
  label: CERTIFIED_STORE_RESERVATION_LABEL,
  htmlCode: CERTIFIED_STORE_RESERVATION_HTML,
};

export function ensureCertifiedStoreReservationShortcode(
  shortcodes: HtmlShortcodeItem[] | undefined
): HtmlShortcodeItem[] {
  const list = shortcodes?.length ? [...shortcodes] : [];
  const exists = list.some(
    (item) =>
      item.id === CERTIFIED_STORE_RESERVATION_SHORTCODE_ID ||
      item.label === CERTIFIED_STORE_RESERVATION_LABEL
  );
  if (exists) return list;
  return [...list, CERTIFIED_STORE_RESERVATION_SHORTCODE_PRESET];
}

export function ensureCertifiedStoreReservationCss(customCss: string | undefined): string {
  const current = customCss ?? '';
  if (current.includes(CERTIFIED_STORE_RESERVATION_CSS_MARKER)) {
    return current;
  }
  const trimmed = current.trim();
  return trimmed
    ? `${trimmed}\n\n${CERTIFIED_STORE_RESERVATION_DEFAULT_CSS}`
    : CERTIFIED_STORE_RESERVATION_DEFAULT_CSS;
}

export function applyHtmlShortcodePresets(theme: {
  htmlShortcodes?: HtmlShortcodeItem[];
  customCss?: string;
}): { htmlShortcodes: HtmlShortcodeItem[]; customCss: string } {
  return {
    htmlShortcodes: ensureCertifiedStoreReservationShortcode(theme.htmlShortcodes),
    customCss: ensureCertifiedStoreReservationCss(theme.customCss),
  };
}
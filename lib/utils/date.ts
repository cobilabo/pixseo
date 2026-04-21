/** 記事の公開日など、暦日を日本基準で揃える */
export const ARTICLE_DISPLAY_TIMEZONE = 'Asia/Tokyo';

type DateInput =
  | Date
  | string
  | number
  | undefined
  | null
  | { toDate?: () => Date; seconds?: number; _seconds?: number };

export function toJsDate(value: DateInput): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const maybe = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
  if (typeof maybe.toDate === 'function') {
    const d = maybe.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  const sec = maybe.seconds ?? maybe._seconds;
  if (typeof sec === 'number') {
    const d = new Date(sec * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatDate(date: DateInput): string {
  const d = toJsDate(date);
  if (!d) return '-';
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: ARTICLE_DISPLAY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  if (!y || !m || !day) return '-';
  return `${y}.${m}.${day}`;
}

export function formatDateTime(date: DateInput): string {
  const d = toJsDate(date);
  if (!d) return '-';
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: ARTICLE_DISPLAY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? '';
  const y = get('year');
  const m = get('month');
  const day = get('day');
  const h = get('hour');
  const min = get('minute');
  if (!y || !m || !day) return '-';
  return `${y}.${m}.${day} ${h}:${min}`;
}

/** `<input type="date" />` 用 YYYY-MM-DD（日本暦日） */
export function formatYmdInJapan(date: DateInput): string {
  const d = toJsDate(date);
  if (!d) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ARTICLE_DISPLAY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** 日本の「今日」YYYY-MM-DD（管理画面のデフォルト公開日用） */
export function getJapanTodayYmd(): string {
  return formatYmdInJapan(new Date());
}

/** スライダー等：例 2026年4月5日 */
export function formatDateLongJaInJapan(date: DateInput): string {
  const d = toJsDate(date);
  if (!d) return '';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: ARTICLE_DISPLAY_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

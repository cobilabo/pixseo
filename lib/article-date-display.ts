import { Lang, LANG_REGIONS } from '@/types/lang';
import { ARTICLE_DISPLAY_TIMEZONE } from '@/lib/utils/date';

/** Firestore Timestamp / ISO 文字列 / Date などを Date に正規化 */
export function coerceToDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const maybe = value as { toDate?: () => Date; seconds?: number };
  if (typeof maybe.toDate === 'function') {
    const d = maybe.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (typeof maybe.seconds === 'number') {
    const d = new Date(maybe.seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatArticleDate(value: unknown, lang: Lang): string {
  const d = coerceToDate(value);
  if (!d) return '日付不明';
  return d.toLocaleDateString(LANG_REGIONS[lang], {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: ARTICLE_DISPLAY_TIMEZONE,
  });
}

export function toIsoDateStringOrNow(value: unknown): string {
  const d = coerceToDate(value);
  return d ? d.toISOString() : new Date().toISOString();
}

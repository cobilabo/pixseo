// 対応言語の型定義
export type Lang = 'ja' | 'en' | 'zh' | 'ko';

// デフォルト言語
export const DEFAULT_LANG: Lang = 'ja';

// サポートされている言語の配列
export const SUPPORTED_LANGS: Lang[] = ['ja', 'en', 'zh', 'ko'];

// 言語の表示名
export const LANG_NAMES: Record<Lang, string> = {
  ja: '日本語',
  en: 'English',
  zh: '中文',
  ko: '한국어',
};

// 言語の地域コード（SEO用）
export const LANG_REGIONS: Record<Lang, string> = {
  ja: 'ja-JP',
  en: 'en-US',
  zh: 'zh-CN',
  ko: 'ko-KR',
};

// 言語が有効かチェック
export function isValidLang(lang: string): lang is Lang {
  return SUPPORTED_LANGS.includes(lang as Lang);
}

// 多言語フィールドの型ヘルパー
export type Multilingual<T> = {
  [K in Lang as `${string & K}`]: T;
};

// 特定フィールドを多言語化する型ヘルパー
export type LocalizedFields<T extends string> = {
  [K in T as `${K}_${Lang}`]: string;
};


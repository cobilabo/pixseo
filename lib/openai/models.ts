function readModel(envName: string): string | undefined {
  const value = process.env[envName]?.trim();
  return value || undefined;
}

/**
 * 翻訳・要約など、切り替え可能な OpenAI テキストモデルの共通解決。
 *
 * 優先順:
 * 1. 用途別の環境変数
 * 2. OPENAI_DEFAULT_MODEL
 * 3. 用途ごとのデフォルト
 */
export function resolveOpenAIModel(
  specificEnvName: string,
  fallback: string
): string {
  return (
    readModel(specificEnvName) ||
    readModel('OPENAI_DEFAULT_MODEL') ||
    fallback
  );
}

export function getOpenAITranslateModel(): string {
  return resolveOpenAIModel('OPENAI_TRANSLATE_MODEL', 'gpt-4o-mini');
}

export function getOpenAISummaryModel(): string {
  return (
    readModel('OPENAI_SUMMARY_MODEL') ||
    getOpenAITranslateModel()
  );
}

export function getOpenAIArticleSlugModel(): string {
  return resolveOpenAIModel('OPENAI_ARTICLE_SLUG_MODEL', 'gpt-4o-mini');
}

export function getOpenAISiteImportModel(): string {
  return resolveOpenAIModel('OPENAI_SITE_IMPORT_MODEL', 'gpt-4o');
}

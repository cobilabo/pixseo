import { generateTableOfContents } from '@/lib/article-utils';
import { Lang, SUPPORTED_LANGS } from '@/types/lang';
import {
  generateAISummary,
  translateArticleHtmlInChunks,
  translateFAQs,
  translateText,
} from '@/lib/openai/translate';
import { getOpenAITranslateModel } from '@/lib/openai/models';

export type ArticleFaq = { question: string; answer: string };

export type ArticleTranslatableFields = {
  title: string;
  content: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  faqs: ArticleFaq[];
};

type FieldKey = Exclude<keyof ArticleTranslatableFields, 'faqs'>;

const TEXT_FIELDS: FieldKey[] = [
  'title',
  'content',
  'excerpt',
  'metaTitle',
  'metaDescription',
];

function asText(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function hasText(value: unknown): boolean {
  return asText(value).trim() !== '';
}

function normalizeFaqs(faqs: unknown): ArticleFaq[] {
  if (!Array.isArray(faqs)) return [];
  return faqs.map((faq) => ({
    question: asText((faq as ArticleFaq)?.question).trim(),
    answer: asText((faq as ArticleFaq)?.answer).trim(),
  }));
}

function faqsEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalizeFaqs(a)) === JSON.stringify(normalizeFaqs(b));
}

export function articleTranslationSourceFromDoc(
  data: Record<string, any> | null | undefined
): ArticleTranslatableFields {
  const title = asText(data?.title || data?.title_ja);
  const excerpt = asText(data?.excerpt ?? data?.excerpt_ja);
  return {
    title,
    content: asText(data?.content || data?.content_ja),
    excerpt,
    metaTitle: asText(data?.metaTitle || data?.metaTitle_ja || title),
    metaDescription: asText(
      data?.metaDescription || data?.metaDescription_ja || excerpt
    ),
    faqs: normalizeFaqs(data?.faqs_ja || data?.faqs),
  };
}

function fieldChanged(
  field: FieldKey,
  source: ArticleTranslatableFields,
  previous: ArticleTranslatableFields | null
): boolean {
  if (!previous) return true;
  return asText(previous[field]) !== asText(source[field]);
}

/**
 * 日本語が変わっていない項目は既存訳を再利用する。
 * 訳がまだ無い言語・項目は埋める（初回公開・欠落補完）。
 */
export async function buildArticleTranslationUpdate(options: {
  source: ArticleTranslatableFields;
  previous?: ArticleTranslatableFields | null;
  existing?: Record<string, any> | null;
}): Promise<Record<string, unknown>> {
  const source = options.source;
  const previous = options.previous ?? null;
  const existing = options.existing ?? {};
  const result: Record<string, unknown> = {};

  const changed: Record<FieldKey | 'faqs', boolean> = {
    title: fieldChanged('title', source, previous),
    content: fieldChanged('content', source, previous),
    excerpt: fieldChanged('excerpt', source, previous),
    metaTitle: fieldChanged('metaTitle', source, previous),
    metaDescription: fieldChanged('metaDescription', source, previous),
    faqs: !previous || !faqsEqual(previous.faqs, source.faqs),
  };

  const needJaSummary =
    hasText(source.content) &&
    (changed.content || !hasText(existing.aiSummary_ja));

  if (needJaSummary) {
    try {
      result.aiSummary_ja = await generateAISummary(source.content, 'ja');
    } catch (error) {
      console.error('[article-translation] AIサマリー生成エラー（ja）:', error);
    }
  }

  const otherLangs = SUPPORTED_LANGS.filter((lang) => lang !== 'ja');
  const translatedFields: string[] = [];

  await Promise.all(
    otherLangs.map(async (lang) => {
      try {
        const needs: Record<FieldKey, boolean> = {
          title: changed.title || !hasText(existing[`title_${lang}`]),
          content: changed.content || !hasText(existing[`content_${lang}`]),
          excerpt: changed.excerpt || !hasText(existing[`excerpt_${lang}`]),
          metaTitle: changed.metaTitle || !hasText(existing[`metaTitle_${lang}`]),
          metaDescription:
            changed.metaDescription ||
            !hasText(existing[`metaDescription_${lang}`]),
        };

        const tasks: Promise<void>[] = [];

        if (needs.title && hasText(source.title)) {
          tasks.push(
            translateText(source.title, lang, '記事タイトル').then((value) => {
              result[`title_${lang}`] = value;
            })
          );
        }
        if (needs.content && hasText(source.content)) {
          tasks.push(
            translateArticleHtmlInChunks(source.content, lang).then((value) => {
              result[`content_${lang}`] = value;
              result[`tableOfContents_${lang}`] = generateTableOfContents(value);
            })
          );
        }
        if (needs.excerpt && hasText(source.excerpt)) {
          tasks.push(
            translateText(source.excerpt, lang, '記事の要約').then((value) => {
              result[`excerpt_${lang}`] = value;
            })
          );
        }
        if (needs.metaTitle && hasText(source.metaTitle)) {
          tasks.push(
            translateText(source.metaTitle, lang, 'SEOメタタイトル').then(
              (value) => {
                result[`metaTitle_${lang}`] = value;
              }
            )
          );
        }
        if (needs.metaDescription && hasText(source.metaDescription)) {
          tasks.push(
            translateText(
              source.metaDescription,
              lang,
              'SEOメタディスクリプション'
            ).then((value) => {
              result[`metaDescription_${lang}`] = value;
            })
          );
        }

        await Promise.all(tasks);

        const contentForSummary = hasText(result[`content_${lang}`])
          ? asText(result[`content_${lang}`])
          : asText(existing[`content_${lang}`]);
        const needSummary =
          hasText(contentForSummary) &&
          (needs.content || !hasText(existing[`aiSummary_${lang}`]));
        if (needSummary) {
          result[`aiSummary_${lang}`] = await generateAISummary(
            contentForSummary,
            lang as Lang
          );
        }

        const existingFaqs = existing[`faqs_${lang}`];
        const needFaqs =
          source.faqs.length > 0 &&
          (changed.faqs || !Array.isArray(existingFaqs) || existingFaqs.length === 0);
        if (needFaqs) {
          result[`faqs_${lang}`] = await translateFAQs(source.faqs, lang);
        }

        const done = [
          ...TEXT_FIELDS.filter((field) => needs[field] && hasText(source[field])),
          ...(needFaqs ? ['faqs'] : []),
          ...(needSummary ? ['aiSummary'] : []),
        ];
        if (done.length > 0) {
          translatedFields.push(`${lang}:${done.join('+')}`);
        }
      } catch (error) {
        console.error(`[article-translation] 翻訳エラー（${lang}）:`, error);
      }
    })
  );

  if (translatedFields.length === 0 && !needJaSummary) {
    console.log(
      `[article-translation] skip (model=${getOpenAITranslateModel()})`
    );
  } else {
    console.log(
      `[article-translation] model=${getOpenAITranslateModel()} fields=${translatedFields.join(',') || 'ja-summary'}`
    );
  }

  return result;
}

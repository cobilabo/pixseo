"use strict";
/**
 * スケジュール実行関数
 * Next.jsを使用しない軽量な関数のみを含む
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoTranslateWpArticles = exports.syncWpMigratedArticles = exports.publishScheduledArticles = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
// Firebase Admin SDKの初期化
admin.initializeApp();
// シークレット定義
const algoliaAppId = (0, params_1.defineSecret)('ALGOLIA_APP_ID');
const algoliaAdminKey = (0, params_1.defineSecret)('ALGOLIA_ADMIN_KEY');
const openaiApiKey = (0, params_1.defineSecret)('OPENAI_API_KEY');
const SUPPORTED_LANGS = ['ja', 'en', 'zh', 'ko'];
const ARTICLES_INDEX_BASE = 'pixseo_articles_production';
function getArticlesIndexName(lang) {
    return `${ARTICLES_INDEX_BASE}_${lang}`;
}
/**
 * HTMLタグを除去してプレーンテキストを抽出
 */
function stripHtmlTags(html) {
    if (!html)
        return '';
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * 記事コンテンツからテキストを抽出
 */
function extractContentText(content) {
    if (!content || !Array.isArray(content))
        return '';
    const textParts = [];
    for (const block of content) {
        if (block && typeof block === 'object' && 'type' in block) {
            const blockObj = block;
            switch (blockObj.type) {
                case 'paragraph':
                case 'heading':
                    if (blockObj.content) {
                        textParts.push(stripHtmlTags(blockObj.content));
                    }
                    break;
                case 'list':
                    if (blockObj.items && Array.isArray(blockObj.items)) {
                        for (const item of blockObj.items) {
                            if (item.content) {
                                textParts.push(stripHtmlTags(item.content));
                            }
                        }
                    }
                    break;
                case 'quote':
                    if (blockObj.text) {
                        textParts.push(stripHtmlTags(blockObj.text));
                    }
                    break;
            }
        }
    }
    return textParts.join(' ').substring(0, 5000);
}
/**
 * テキスト翻訳 (OpenAIインスタンスを受け取る)
 */
async function translateText(openai, text, targetLang, context) {
    var _a, _b, _c;
    if (!text || text.trim() === '')
        return '';
    if (targetLang === 'ja')
        return text;
    const langNames = {
        ja: 'Japanese',
        en: 'English',
        zh: 'Chinese (Simplified)',
        ko: 'Korean',
    };
    const systemPrompt = `You are a professional translator. Translate the following Japanese text to ${langNames[targetLang]}.
${context ? `Context: ${context}` : ''}
Important:
- Maintain the original meaning and tone
- Keep proper nouns and technical terms as appropriate
- If the text contains HTML tags, preserve them
- Return ONLY the translated text, no explanations`;
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text },
            ],
            temperature: 0.3,
            max_tokens: 4000,
        });
        return ((_c = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) || text;
    }
    catch (error) {
        console.error(`[翻訳エラー] ${targetLang}:`, error);
        return '';
    }
}
/**
 * 記事を翻訳
 */
async function translateArticle(openai, article, targetLang) {
    if (targetLang === 'ja') {
        return {
            title: article.title || '',
            excerpt: article.excerpt || '',
        };
    }
    const [title, excerpt] = await Promise.all([
        translateText(openai, article.title || '', targetLang, 'Article title'),
        translateText(openai, article.excerpt || '', targetLang, 'Article excerpt/summary'),
    ]);
    return { title, excerpt };
}
/**
 * 予約公開記事を公開する定期実行関数
 * 毎日 JST 0:00 (UTC 15:00) に実行
 * isScheduled: true かつ publishedAt が今日以前の記事を公開状態に更新
 */
exports.publishScheduledArticles = (0, scheduler_1.onSchedule)({
    schedule: '0 15 * * *', // 毎日 UTC 15:00 = JST 0:00
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
}, async () => {
    var _a;
    console.log('[publishScheduledArticles] Starting scheduled publication check...');
    const db = admin.firestore();
    const now = new Date();
    // JSTの今日の日付を取得（時刻は00:00:00）
    const jstOffset = 9 * 60 * 60 * 1000; // JST = UTC + 9時間
    const jstNow = new Date(now.getTime() + jstOffset);
    const todayJST = new Date(jstNow.getFullYear(), jstNow.getMonth(), jstNow.getDate());
    // 今日の終わり（23:59:59 JST）
    const todayEndJST = new Date(todayJST.getTime() + 24 * 60 * 60 * 1000 - 1);
    const todayEndUTC = new Date(todayEndJST.getTime() - jstOffset);
    console.log(`[publishScheduledArticles] Today (JST): ${todayJST.toISOString()}`);
    console.log(`[publishScheduledArticles] Today End (JST): ${todayEndJST.toISOString()}`);
    try {
        // 予約投稿記事を取得（isScheduled: true）
        // トップレベルの articles コレクションを使用
        const articlesSnapshot = await db.collection('articles')
            .where('isScheduled', '==', true)
            .get();
        console.log(`[publishScheduledArticles] Found ${articlesSnapshot.size} scheduled articles to check`);
        let publishedCount = 0;
        const batch = db.batch();
        for (const doc of articlesSnapshot.docs) {
            const article = doc.data();
            const publishedAt = ((_a = article.publishedAt) === null || _a === void 0 ? void 0 : _a.toDate) ? article.publishedAt.toDate() : new Date(article.publishedAt);
            console.log(`[publishScheduledArticles] Checking article: ${doc.id}, publishedAt: ${publishedAt.toISOString()}`);
            // 公開日が今日以前の場合のみ公開
            if (publishedAt <= todayEndUTC) {
                batch.update(doc.ref, {
                    isPublished: true,
                    isScheduled: false,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                publishedCount++;
                console.log(`[publishScheduledArticles] Article ${doc.id} will be published`);
            }
        }
        if (publishedCount > 0) {
            await batch.commit();
            console.log(`[publishScheduledArticles] Successfully published ${publishedCount} articles`);
        }
        else {
            console.log('[publishScheduledArticles] No articles to publish today');
        }
    }
    catch (error) {
        console.error('[publishScheduledArticles] Error:', error);
        throw error;
    }
});
/**
 * WordPress移行記事をAlgoliaに同期するバッチ処理関数
 *
 * クエリパラメータ:
 * - offset: 開始位置（デフォルト: 0）
 * - limit: 処理件数（デフォルト: 10、最大: 50）
 * - skipTranslate: 翻訳をスキップするか（デフォルト: false）
 * - dryRun: 実際に更新せずプレビュー（デフォルト: false）
 *
 * 使用例:
 * https://syncwpmigratedarticles-xxxxx.asia-northeast1.run.app?offset=0&limit=10
 */
exports.syncWpMigratedArticles = (0, https_1.onRequest)({
    region: 'asia-northeast1',
    memory: '1GiB',
    timeoutSeconds: 540, // 最大9分
    secrets: [algoliaAppId, algoliaAdminKey, openaiApiKey],
}, async (req, res) => {
    var _a, _b;
    // CORSヘッダー
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    // 簡易認証（必要に応じて強化）
    const authHeader = req.headers.authorization;
    const expectedToken = 'pixseo-batch-sync-2024';
    if (authHeader !== `Bearer ${expectedToken}`) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const offset = parseInt(req.query.offset) || 0;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skipTranslate = req.query.skipTranslate === 'true';
    const dryRun = req.query.dryRun === 'true';
    console.log(`[syncWpMigratedArticles] Starting... offset=${offset}, limit=${limit}, skipTranslate=${skipTranslate}, dryRun=${dryRun}`);
    try {
        const db = admin.firestore();
        // Dynamic import for Algolia and OpenAI
        const { algoliasearch } = await Promise.resolve().then(() => __importStar(require('algoliasearch')));
        const OpenAI = (await Promise.resolve().then(() => __importStar(require('openai')))).default;
        // Algolia クライアント初期化
        const algoliaClient = algoliasearch(algoliaAppId.value(), algoliaAdminKey.value());
        // OpenAI クライアント初期化
        const openai = new OpenAI({
            apiKey: openaiApiKey.value(),
        });
        // WP移行記事を取得（公開済みのみ）
        // Note: orderByを削除してインデックス不要にする
        const allArticlesSnapshot = await db.collection('articles')
            .where('wpMigrated', '==', true)
            .where('isPublished', '==', true)
            .get();
        const totalCount = allArticlesSnapshot.size;
        // オフセットとリミットを適用
        const articles = allArticlesSnapshot.docs.slice(offset, offset + limit);
        console.log(`[syncWpMigratedArticles] Total: ${totalCount}, Processing: ${articles.length} (offset: ${offset})`);
        const results = [];
        // カテゴリとタグのキャッシュ
        const categoryCache = new Map();
        const tagCache = new Map();
        // カテゴリ名を取得
        async function getCategoryNames(categoryIds) {
            const result = { ja: [], en: [], zh: [], ko: [] };
            for (const catId of categoryIds) {
                if (categoryCache.has(catId)) {
                    const cached = categoryCache.get(catId);
                    for (const lang of SUPPORTED_LANGS) {
                        if (cached[lang])
                            result[lang].push(cached[lang]);
                    }
                }
                else {
                    const catDoc = await db.collection('categories').doc(catId).get();
                    if (catDoc.exists) {
                        const catData = catDoc.data();
                        const names = {
                            ja: catData.name || '',
                            en: catData.name_en || catData.name || '',
                            zh: catData.name_zh || catData.name || '',
                            ko: catData.name_ko || catData.name || '',
                        };
                        categoryCache.set(catId, names);
                        for (const lang of SUPPORTED_LANGS) {
                            if (names[lang])
                                result[lang].push(names[lang]);
                        }
                    }
                }
            }
            return result;
        }
        // タグ名を取得
        async function getTagNames(tagIds) {
            const result = { ja: [], en: [], zh: [], ko: [] };
            for (const tagId of tagIds) {
                if (tagCache.has(tagId)) {
                    const cached = tagCache.get(tagId);
                    for (const lang of SUPPORTED_LANGS) {
                        if (cached[lang])
                            result[lang].push(cached[lang]);
                    }
                }
                else {
                    const tagDoc = await db.collection('tags').doc(tagId).get();
                    if (tagDoc.exists) {
                        const tagData = tagDoc.data();
                        const names = {
                            ja: tagData.name || '',
                            en: tagData.name_en || tagData.name || '',
                            zh: tagData.name_zh || tagData.name || '',
                            ko: tagData.name_ko || tagData.name || '',
                        };
                        tagCache.set(tagId, names);
                        for (const lang of SUPPORTED_LANGS) {
                            if (names[lang])
                                result[lang].push(names[lang]);
                        }
                    }
                }
            }
            return result;
        }
        // 記事を処理
        for (let i = 0; i < articles.length; i++) {
            const doc = articles[i];
            const article = doc.data();
            const articleId = doc.id;
            console.log(`[${i + 1}/${articles.length}] Processing: ${article.title}`);
            try {
                // 翻訳が必要かチェック（title_enが存在しないか、日本語と同じ場合は翻訳が必要）
                const needsTranslation = !skipTranslate && (!article.title_en || article.title_en === article.title);
                // 翻訳処理
                let translations = {
                    ja: { title: article.title || '', excerpt: article.excerpt || '' },
                    en: { title: article.title_en || '', excerpt: article.excerpt_en || '' },
                    zh: { title: article.title_zh || '', excerpt: article.excerpt_zh || '' },
                    ko: { title: article.title_ko || '', excerpt: article.excerpt_ko || '' },
                };
                if (needsTranslation) {
                    console.log(`  Translating...`);
                    for (const lang of ['en', 'zh', 'ko']) {
                        try {
                            const translated = await translateArticle(openai, article, lang);
                            translations[lang] = translated;
                            console.log(`  ✅ ${lang} translated`);
                        }
                        catch (error) {
                            console.error(`  ❌ ${lang} translation error:`, error);
                        }
                    }
                    // Firestoreを更新
                    if (!dryRun) {
                        await db.collection('articles').doc(articleId).update({
                            title_en: translations.en.title,
                            title_zh: translations.zh.title,
                            title_ko: translations.ko.title,
                            excerpt_en: translations.en.excerpt,
                            excerpt_zh: translations.zh.excerpt,
                            excerpt_ko: translations.ko.excerpt,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        console.log(`  ✅ Firestore updated`);
                    }
                }
                // カテゴリ・タグ名を取得
                const categoryNames = await getCategoryNames(article.categories || []);
                const tagNames = await getTagNames(article.tags || []);
                // コンテンツテキストを抽出
                const contentText = extractContentText(article.content);
                // 各言語のAlgoliaレコードを作成
                const algoliaRecordsByLang = {};
                for (const lang of SUPPORTED_LANGS) {
                    const record = {
                        objectID: `${articleId}_${lang}`,
                        title: lang === 'ja' ? article.title : translations[lang].title || article.title,
                        slug: article.slug,
                        excerpt: lang === 'ja' ? article.excerpt : translations[lang].excerpt || article.excerpt,
                        contentText: contentText,
                        mediaId: article.mediaId,
                        categories: categoryNames[lang],
                        tags: tagNames[lang],
                        publishedAt: ((_b = (_a = article.publishedAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a).getTime()) || Date.now(),
                        isPublished: true,
                        featuredImage: article.featuredImage,
                        featuredImageAlt: article.featuredImageAlt,
                        viewCount: article.viewCount || 0,
                    };
                    algoliaRecordsByLang[lang] = record;
                }
                // Algoliaに同期
                if (!dryRun) {
                    for (const lang of SUPPORTED_LANGS) {
                        const indexName = getArticlesIndexName(lang);
                        await algoliaClient.saveObject({
                            indexName,
                            body: algoliaRecordsByLang[lang],
                        });
                    }
                    console.log(`  ✅ Algolia synced`);
                }
                results.push({
                    id: articleId,
                    title: article.title,
                    status: 'success',
                    message: needsTranslation ? 'Translated and synced' : 'Synced',
                });
            }
            catch (error) {
                console.error(`  ❌ Error processing ${articleId}:`, error);
                results.push({
                    id: articleId,
                    title: article.title,
                    status: 'error',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        const successCount = results.filter(r => r.status === 'success').length;
        const errorCount = results.filter(r => r.status === 'error').length;
        const nextOffset = offset + limit;
        const hasMore = nextOffset < totalCount;
        const response = {
            success: true,
            dryRun,
            summary: {
                total: totalCount,
                processed: articles.length,
                offset,
                limit,
                success: successCount,
                errors: errorCount,
                hasMore,
                nextOffset: hasMore ? nextOffset : null,
            },
            results,
            nextUrl: hasMore
                ? `?offset=${nextOffset}&limit=${limit}${skipTranslate ? '&skipTranslate=true' : ''}${dryRun ? '&dryRun=true' : ''}`
                : null,
        };
        console.log(`[syncWpMigratedArticles] Completed. Success: ${successCount}, Errors: ${errorCount}`);
        res.status(200).json(response);
    }
    catch (error) {
        console.error('[syncWpMigratedArticles] Fatal error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * 未翻訳のWP移行記事を自動的に翻訳してAlgoliaに同期するスケジュール関数
 * 5分ごとに実行し、未翻訳記事がなくなるまで処理を続ける
 */
exports.autoTranslateWpArticles = (0, scheduler_1.onSchedule)({
    schedule: 'every 5 minutes',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
    memory: '1GiB',
    timeoutSeconds: 300, // 5分
    secrets: [algoliaAppId, algoliaAdminKey, openaiApiKey],
}, async () => {
    var _a, _b;
    console.log('[autoTranslateWpArticles] Starting auto translation...');
    const db = admin.firestore();
    // Dynamic import for Algolia and OpenAI
    const { algoliasearch } = await Promise.resolve().then(() => __importStar(require('algoliasearch')));
    const OpenAI = (await Promise.resolve().then(() => __importStar(require('openai')))).default;
    // Algolia クライアント初期化
    const algoliaClient = algoliasearch(algoliaAppId.value(), algoliaAdminKey.value());
    // OpenAI クライアント初期化
    const openai = new OpenAI({
        apiKey: openaiApiKey.value(),
    });
    // 未翻訳のWP移行記事を取得（title_enがない記事）
    const allArticlesSnapshot = await db.collection('articles')
        .where('wpMigrated', '==', true)
        .where('isPublished', '==', true)
        .get();
    // 未翻訳の記事をフィルタリング
    const untranslatedArticles = allArticlesSnapshot.docs.filter(doc => {
        const data = doc.data();
        return !data.title_en || data.title_en === data.title;
    });
    console.log(`[autoTranslateWpArticles] Found ${untranslatedArticles.length} untranslated articles`);
    if (untranslatedArticles.length === 0) {
        console.log('[autoTranslateWpArticles] No untranslated articles. Done!');
        return;
    }
    // 1回の実行で処理する記事数（翻訳に時間がかかるため少なめに）
    const batchSize = 10;
    const articlesToProcess = untranslatedArticles.slice(0, batchSize);
    console.log(`[autoTranslateWpArticles] Processing ${articlesToProcess.length} articles...`);
    // カテゴリとタグのキャッシュ
    const categoryCache = new Map();
    const tagCache = new Map();
    async function getCategoryNames(categoryIds) {
        const result = { ja: [], en: [], zh: [], ko: [] };
        for (const catId of categoryIds) {
            if (categoryCache.has(catId)) {
                const cached = categoryCache.get(catId);
                for (const lang of SUPPORTED_LANGS) {
                    if (cached[lang])
                        result[lang].push(cached[lang]);
                }
            }
            else {
                const catDoc = await db.collection('categories').doc(catId).get();
                if (catDoc.exists) {
                    const catData = catDoc.data();
                    const names = {
                        ja: catData.name || '',
                        en: catData.name_en || catData.name || '',
                        zh: catData.name_zh || catData.name || '',
                        ko: catData.name_ko || catData.name || '',
                    };
                    categoryCache.set(catId, names);
                    for (const lang of SUPPORTED_LANGS) {
                        if (names[lang])
                            result[lang].push(names[lang]);
                    }
                }
            }
        }
        return result;
    }
    async function getTagNames(tagIds) {
        const result = { ja: [], en: [], zh: [], ko: [] };
        for (const tagId of tagIds) {
            if (tagCache.has(tagId)) {
                const cached = tagCache.get(tagId);
                for (const lang of SUPPORTED_LANGS) {
                    if (cached[lang])
                        result[lang].push(cached[lang]);
                }
            }
            else {
                const tagDoc = await db.collection('tags').doc(tagId).get();
                if (tagDoc.exists) {
                    const tagData = tagDoc.data();
                    const names = {
                        ja: tagData.name || '',
                        en: tagData.name_en || tagData.name || '',
                        zh: tagData.name_zh || tagData.name || '',
                        ko: tagData.name_ko || tagData.name || '',
                    };
                    tagCache.set(tagId, names);
                    for (const lang of SUPPORTED_LANGS) {
                        if (names[lang])
                            result[lang].push(names[lang]);
                    }
                }
            }
        }
        return result;
    }
    let successCount = 0;
    let errorCount = 0;
    for (let i = 0; i < articlesToProcess.length; i++) {
        const doc = articlesToProcess[i];
        const article = doc.data();
        const articleId = doc.id;
        console.log(`[${i + 1}/${articlesToProcess.length}] Processing: ${article.title}`);
        try {
            // 翻訳処理
            const translations = {
                ja: { title: article.title || '', excerpt: article.excerpt || '' },
                en: { title: '', excerpt: '' },
                zh: { title: '', excerpt: '' },
                ko: { title: '', excerpt: '' },
            };
            for (const lang of ['en', 'zh', 'ko']) {
                try {
                    const translated = await translateArticle(openai, article, lang);
                    translations[lang] = translated;
                    console.log(`  ✅ ${lang} translated`);
                }
                catch (error) {
                    console.error(`  ❌ ${lang} translation error:`, error);
                    // エラー時は日本語をコピー
                    translations[lang] = { title: article.title || '', excerpt: article.excerpt || '' };
                }
            }
            // Firestoreを更新
            await db.collection('articles').doc(articleId).update({
                title_en: translations.en.title,
                title_zh: translations.zh.title,
                title_ko: translations.ko.title,
                excerpt_en: translations.en.excerpt,
                excerpt_zh: translations.zh.excerpt,
                excerpt_ko: translations.ko.excerpt,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`  ✅ Firestore updated`);
            // カテゴリ・タグ名を取得
            const categoryNames = await getCategoryNames(article.categories || []);
            const tagNames = await getTagNames(article.tags || []);
            // コンテンツテキストを抽出（wpMigrated記事はstring型の可能性）
            let contentText = '';
            if (typeof article.content === 'string') {
                contentText = stripHtmlTags(article.content).substring(0, 3000);
            }
            else {
                contentText = extractContentText(article.content);
            }
            // 各言語のAlgoliaレコードを作成・同期
            for (const lang of SUPPORTED_LANGS) {
                const record = {
                    objectID: articleId,
                    title: lang === 'ja' ? article.title : translations[lang].title || article.title,
                    slug: article.slug,
                    excerpt: lang === 'ja' ? article.excerpt : translations[lang].excerpt || article.excerpt,
                    contentText: contentText,
                    mediaId: article.mediaId,
                    categories: categoryNames[lang],
                    tags: tagNames[lang],
                    publishedAt: ((_b = (_a = article.publishedAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a).getTime()) || Date.now(),
                    isPublished: true,
                    featuredImage: article.featuredImage,
                    featuredImageAlt: article.featuredImageAlt,
                    viewCount: article.viewCount || 0,
                };
                const indexName = getArticlesIndexName(lang);
                await algoliaClient.saveObject({
                    indexName,
                    body: record,
                });
            }
            console.log(`  ✅ Algolia synced`);
            successCount++;
        }
        catch (error) {
            console.error(`  ❌ Error processing ${articleId}:`, error);
            errorCount++;
        }
    }
    const remaining = untranslatedArticles.length - articlesToProcess.length;
    console.log(`[autoTranslateWpArticles] Completed. Success: ${successCount}, Errors: ${errorCount}, Remaining: ${remaining}`);
    if (remaining > 0) {
        console.log(`[autoTranslateWpArticles] Will continue in next scheduled run...`);
    }
    else {
        console.log(`[autoTranslateWpArticles] All articles processed!`);
    }
});
//# sourceMappingURL=index.js.map
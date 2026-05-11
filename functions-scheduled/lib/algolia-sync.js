"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArticlesIndexName = exports.SUPPORTED_LANGS = void 0;
exports.syncArticleToAlgolia = syncArticleToAlgolia;
exports.SUPPORTED_LANGS = ["ja", "en", "zh", "ko"];
const ARTICLES_INDEX_BASE = "pixseo_articles_production";
const getArticlesIndexName = (lang) => `${ARTICLES_INDEX_BASE}_${lang}`;
exports.getArticlesIndexName = getArticlesIndexName;
/** Grow / Premium プラン (1 レコード最大 100KB) を前提とした上限値 */
const ALGOLIA_MAX_RECORD_UTF8_BYTES = 99000;
function jsonUtf8ByteLength(obj) {
    return new TextEncoder().encode(JSON.stringify(obj)).length;
}
function htmlToAlgoliaPlainText(html) {
    if (!html)
        return "";
    return html
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/\s+/g, " ")
        .trim();
}
function shrinkEndToUtf8Boundary(buf, start, end) {
    let e = Math.min(end, buf.length);
    while (e > start && (buf[e - 1] & 0xc0) === 0x80)
        e--;
    return e;
}
function advanceOneUtf8Char(buf, start) {
    if (start >= buf.length)
        return start;
    const b = buf[start];
    if ((b & 0x80) === 0)
        return start + 1;
    if ((b & 0xe0) === 0xc0)
        return Math.min(start + 2, buf.length);
    if ((b & 0xf0) === 0xe0)
        return Math.min(start + 3, buf.length);
    if ((b & 0xf8) === 0xf0)
        return Math.min(start + 4, buf.length);
    return start + 1;
}
function packPlainTextForAlgoliaRecord(plain, baseWithoutContent) {
    var _a;
    if (!plain)
        return { contentText: "" };
    const buf = new TextEncoder().encode(plain);
    const dec = new TextDecoder("utf-8", { fatal: false });
    const chunks = [];
    let start = 0;
    const maxChunks = 48;
    while (start < buf.length && chunks.length < maxChunks) {
        let lo = start + 1;
        let hi = buf.length;
        let bestEnd = start;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            let end = shrinkEndToUtf8Boundary(buf, start, mid);
            if (end <= start)
                end = advanceOneUtf8Char(buf, start);
            const slice = dec.decode(buf.subarray(start, end));
            const candidateChunks = [...chunks, slice];
            const candidate = Object.assign(Object.assign(Object.assign({}, baseWithoutContent), { contentText: (_a = candidateChunks[0]) !== null && _a !== void 0 ? _a : "" }), (candidateChunks.length > 1 ? { contentTextChunks: candidateChunks.slice(1) } : {}));
            if (jsonUtf8ByteLength(candidate) <= ALGOLIA_MAX_RECORD_UTF8_BYTES) {
                bestEnd = end;
                lo = mid + 1;
            }
            else {
                hi = mid - 1;
            }
        }
        if (bestEnd <= start) {
            const forced = advanceOneUtf8Char(buf, start);
            chunks.push(dec.decode(buf.subarray(start, forced)));
            start = forced;
            continue;
        }
        chunks.push(dec.decode(buf.subarray(start, bestEnd)));
        start = bestEnd;
    }
    if (chunks.length === 0)
        return { contentText: "" };
    if (chunks.length === 1)
        return { contentText: chunks[0] };
    return { contentText: chunks[0], contentTextChunks: chunks.slice(1) };
}
function localizeArticleField(article, lang, field) {
    return article[`${field}_${lang}`] || article[field] || "";
}
async function getLocalizedNames(db, collection, ids, lang) {
    if (!ids || !Array.isArray(ids) || ids.length === 0)
        return [];
    const names = [];
    for (const id of ids) {
        try {
            const doc = await db.collection(collection).doc(id).get();
            if (doc.exists) {
                const data = doc.data();
                const localized = (data === null || data === void 0 ? void 0 : data[`name_${lang}`]) || (data === null || data === void 0 ? void 0 : data.name) || "";
                if (localized)
                    names.push(localized);
            }
        }
        catch (e) {
            console.error(`[Algolia] failed to fetch ${collection}/${id}:`, e);
        }
    }
    return names;
}
/**
 * 記事を 4 言語インデックスへ同期する（Next.js 側 syncArticleToAlgolia と同等の挙動）。
 * 失敗してもスローせず、言語ごとにエラーログだけ出して継続する。
 */
async function syncArticleToAlgolia(client, db, article) {
    const articleId = article === null || article === void 0 ? void 0 : article.id;
    if (!articleId) {
        console.error("[Algolia] syncArticleToAlgolia: article.id is missing");
        return;
    }
    const publishedAtMs = (() => {
        const pa = article.publishedAt;
        if (!pa)
            return 0;
        if (typeof pa === "number")
            return pa;
        if (pa instanceof Date)
            return pa.getTime();
        if (typeof pa === "string")
            return new Date(pa).getTime();
        if (typeof pa.toDate === "function")
            return pa.toDate().getTime();
        if (typeof pa.seconds === "number")
            return pa.seconds * 1000;
        return 0;
    })();
    await Promise.all(exports.SUPPORTED_LANGS.map(async (lang) => {
        try {
            const title = localizeArticleField(article, lang, "title");
            const content = localizeArticleField(article, lang, "content");
            const excerpt = localizeArticleField(article, lang, "excerpt");
            const featuredImageAlt = localizeArticleField(article, lang, "featuredImageAlt");
            const categoryNames = await getLocalizedNames(db, "categories", article.categoryIds, lang);
            const tagNames = await getLocalizedNames(db, "tags", article.tagIds, lang);
            const plain = htmlToAlgoliaPlainText(content);
            const baseWithoutContent = {
                objectID: articleId,
                title,
                slug: article.slug || "",
                excerpt,
                mediaId: article.mediaId || "",
                categories: categoryNames,
                tags: tagNames,
                publishedAt: publishedAtMs,
                isPublished: !!article.isPublished,
                featuredImage: article.featuredImage,
                featuredImageAlt,
                viewCount: article.viewCount || 0,
            };
            const packed = packPlainTextForAlgoliaRecord(plain, baseWithoutContent);
            const record = Object.assign(Object.assign({}, baseWithoutContent), packed);
            await client.saveObject({
                indexName: (0, exports.getArticlesIndexName)(lang),
                body: record,
            });
            console.log(`[Algolia] Synced article to ${lang} index: ${articleId} (cats=${categoryNames.length}, tags=${tagNames.length})`);
        }
        catch (e) {
            console.error(`[Algolia] sync error (${lang}) for ${articleId}:`, e);
        }
    }));
}
//# sourceMappingURL=algolia-sync.js.map
import { adminDb } from './admin';
import { cacheManager, generateCacheKey, CACHE_TTL } from '@/lib/cache-manager';

async function collectIdsFromPublishedArticles(
  field: 'tagIds' | 'categoryIds',
  mediaId?: string
): Promise<Set<string>> {
  const cacheKey = generateCacheKey('published-taxonomy-ids', field, mediaId || 'all');
  const cached = cacheManager.get<Set<string>>(cacheKey, CACHE_TTL.MEDIUM);
  if (cached) return cached;

  let q = adminDb.collection('articles').where('isPublished', '==', true);

  if (mediaId) {
    q = q.where('mediaId', '==', mediaId);
  }

  const snapshot = await q.select(field, 'publishedAt').get();
  const now = new Date();
  const ids = new Set<string>();

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const publishedAtRaw = data.publishedAt as { toDate?: () => Date } | undefined;
    const publishedAt = publishedAtRaw?.toDate?.();
    if (publishedAt && publishedAt > now) return;

    const list = data[field];
    if (!Array.isArray(list)) return;
    list.forEach((id: unknown) => {
      if (typeof id === 'string' && id) ids.add(id);
    });
  });

  cacheManager.set(cacheKey, ids);
  return ids;
}

export function getPublishedTagIdsSet(mediaId?: string): Promise<Set<string>> {
  return collectIdsFromPublishedArticles('tagIds', mediaId);
}

export function getPublishedCategoryIdsSet(mediaId?: string): Promise<Set<string>> {
  return collectIdsFromPublishedArticles('categoryIds', mediaId);
}

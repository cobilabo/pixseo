import { FieldValue } from 'firebase-admin/firestore';

const PROTECTED_ARTICLE_KEYS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'viewCount',
  'likeCount',
  'wpMigrated',
  'wpMigratedAt',
  'wpOriginalId',
  'wpPermalink',
  'wpBackup_publishedAt',
  'wpBackup_updatedAt',
  'wpBackupAt',
  'wpBackupSource',
]);

export function buildArticleUpdatePayload(
  body: Record<string, unknown>
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (PROTECTED_ARTICLE_KEYS.has(key) || value === undefined) continue;
    clean[key] = value;
  }
  return {
    ...clean,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

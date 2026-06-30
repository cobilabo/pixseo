/** Known WP slug typos -> canonical slug (middleware + link rewrite). */
export const ARTICLE_SLUG_REDIRECTS: Record<string, string> = {
  'trip-sightseeingrip-sightseeing-accessible-tourism': 'trip-sightseeing-accessible-tourism',
  'trip-sightseeingrip-rental-welfare-vehicles': 'trip-rental-welfare-vehicles',
  'trip-sightseeingrip-sightseeing-osaka-expo': 'trip-osaka-expo-experience',
  'hotel-universal%e2%80%90tourism': 'hotel-universal-tourism',
  /** WP 移行対象外だった旧 slug → コミュニケーションツール記事へ */
  'communication-board': 'denwaonegai',
};
export interface SearchHistory {
  id: string;
  keyword: string;
  count: number;
  lastSearchedAt: Date;
}

// 検索ログの種類
export type SearchLogType = 'keyword' | 'tag';

// 日ベースの検索ログアイテム
export interface DailySearchLogItem {
  value: string;          // キーワードまたはタグID
  displayName?: string;   // タグの場合はタグ名（表示用）
  count: number;          // その日の検索回数
}

// 日ベースの検索ログドキュメント
export interface DailySearchLog {
  id: string;             // ドキュメントID（YYYY-MM-DD形式）
  date: string;           // 日付（YYYY-MM-DD形式）
  mediaId: string;        // メディアテナントID
  keywords: DailySearchLogItem[];  // キーワード検索ログ
  tags: DailySearchLogItem[];      // タグ検索ログ
  createdAt: Date;
  updatedAt: Date;
}


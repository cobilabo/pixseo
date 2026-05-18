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

// よく検索されているキーワードの承認状態
export type PopularKeywordStatus = 'pending' | 'approved' | 'rejected';

// 承認状態が決定済みの永続化形式（Firestore保存値）
export type PopularKeywordDecidedStatus = Exclude<PopularKeywordStatus, 'pending'>;

// よく検索されているキーワードの承認レコード
export interface PopularKeywordApproval {
  mediaId: string;
  value: string;              // 正規化済みキーワード（小文字化）
  displayName: string;        // 表示用の生キーワード
  status: PopularKeywordDecidedStatus;
  decidedBy: string;          // 承認/拒否した管理者のuid
  decidedAt: Date;
  updatedAt: Date;
}

// 集計済みキーワード（管理画面表示用）
export interface AggregatedPopularKeyword {
  value: string;
  displayName: string;
  count: number;
  status: PopularKeywordStatus;
}


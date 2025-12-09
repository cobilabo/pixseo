'use client';

import { useEffect } from 'react';

interface ViewCounterProps {
  articleSlug: string;
  mediaId?: string;
  isPreview: boolean;
}

// 閲覧履歴のキー
const VIEW_HISTORY_KEY = 'article_view_history';
// 重複カウント防止の時間（24時間）
const VIEW_COOLDOWN_MS = 24 * 60 * 60 * 1000;

interface ViewHistory {
  [articleSlug: string]: number; // 最終閲覧時間（timestamp）
}

/**
 * 記事の閲覧数をカウントするコンポーネント
 * - カスタムドメインの場合のみカウント（プレビューサイトは除外）
 * - LocalStorageで24時間以内の重複カウントを防止
 */
export default function ViewCounter({ articleSlug, mediaId, isPreview }: ViewCounterProps) {
  useEffect(() => {
    // プレビューサイトの場合はカウントしない
    if (isPreview) {
      console.log('[ViewCounter] Preview mode - skipping view count');
      return;
    }

    // 重複チェック
    const canCount = checkAndUpdateViewHistory(articleSlug);
    if (!canCount) {
      console.log('[ViewCounter] Already counted within 24 hours - skipping');
      return;
    }

    // 閲覧数をカウントアップ
    incrementViewCount(articleSlug, mediaId);
  }, [articleSlug, mediaId, isPreview]);

  // このコンポーネントは何も表示しない
  return null;
}

/**
 * 閲覧履歴をチェックし、カウント可能かどうかを判定
 * カウント可能な場合は履歴を更新してtrueを返す
 */
function checkAndUpdateViewHistory(articleSlug: string): boolean {
  try {
    const now = Date.now();
    
    // LocalStorageから履歴を取得
    const historyStr = localStorage.getItem(VIEW_HISTORY_KEY);
    const history: ViewHistory = historyStr ? JSON.parse(historyStr) : {};
    
    // 最終閲覧時間をチェック
    const lastViewTime = history[articleSlug];
    if (lastViewTime && (now - lastViewTime) < VIEW_COOLDOWN_MS) {
      // 24時間以内に閲覧済み
      return false;
    }
    
    // 履歴を更新
    history[articleSlug] = now;
    
    // 古い履歴を削除（24時間以上前のエントリ）
    const cleanedHistory: ViewHistory = {};
    for (const [slug, timestamp] of Object.entries(history)) {
      if ((now - timestamp) < VIEW_COOLDOWN_MS) {
        cleanedHistory[slug] = timestamp;
      }
    }
    
    // LocalStorageに保存
    localStorage.setItem(VIEW_HISTORY_KEY, JSON.stringify(cleanedHistory));
    
    return true;
  } catch (error) {
    // LocalStorageエラー（プライベートブラウジング等）
    console.warn('[ViewCounter] LocalStorage error:', error);
    // エラー時はカウントを許可（最悪の場合、重複カウントされる可能性あり）
    return true;
  }
}

/**
 * APIを呼び出して閲覧数をインクリメント
 */
async function incrementViewCount(articleSlug: string, mediaId?: string) {
  try {
    const response = await fetch(`/api/articles/${encodeURIComponent(articleSlug)}/view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mediaId }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[ViewCounter] View count incremented to ${data.viewCount}`);
    } else {
      console.warn('[ViewCounter] Failed to increment view count:', response.status);
    }
  } catch (error) {
    console.warn('[ViewCounter] Error incrementing view count:', error);
  }
}


'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiClient } from '@/lib/api-client';
import { AggregatedPopularKeyword, PopularKeywordStatus } from '@/types/search';

interface PopularKeywordsApprovalPanelProps {
  aggregationDays: number;
  decidedBy?: string;
}

type TabKey = 'pending' | 'approved' | 'rejected' | 'all';

const TAB_LABELS: Record<TabKey, string> = {
  pending: '未承認',
  approved: '承認済み',
  rejected: '拒否済み',
  all: 'すべて',
};

const STATUS_BADGE: Record<PopularKeywordStatus, { label: string; className: string }> = {
  pending: { label: '未承認', className: 'bg-gray-100 text-gray-700' },
  approved: { label: '承認済み', className: 'bg-green-100 text-green-700' },
  rejected: { label: '拒否済み', className: 'bg-red-100 text-red-700' },
};

export default function PopularKeywordsApprovalPanel({ aggregationDays, decidedBy }: PopularKeywordsApprovalPanelProps) {
  const [tab, setTab] = useState<TabKey>('pending');
  const [items, setItems] = useState<AggregatedPopularKeyword[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyValue, setBusyValue] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        days: String(aggregationDays ?? 30),
        status: 'all',
      });
      const data = await apiGet<{ items: AggregatedPopularKeyword[]; counts: typeof counts }>(
        `/api/admin/popular-keywords?${params.toString()}`
      );
      setItems(data.items || []);
      setCounts(data.counts || { pending: 0, approved: 0, rejected: 0, total: 0 });
    } catch (err: any) {
      setError(err?.message || 'キーワード一覧の取得に失敗しました');
    } finally {
      setLoading(false);
      setSelected(new Set());
    }
  }, [aggregationDays]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const filteredItems = useMemo(() => {
    if (tab === 'all') return items;
    return items.filter((it) => it.status === tab);
  }, [items, tab]);

  const updateOne = useCallback(
    async (value: string, displayName: string, status: PopularKeywordStatus) => {
      setBusyValue(value);
      try {
        const res = await apiClient.patch('/api/admin/popular-keywords', {
          value,
          displayName,
          status,
          decidedBy,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `更新に失敗しました (${res.status})`);
        }
        await fetchItems();
      } catch (err: any) {
        alert(err?.message || '更新に失敗しました');
      } finally {
        setBusyValue(null);
      }
    },
    [decidedBy, fetchItems]
  );

  const bulkUpdate = useCallback(
    async (status: PopularKeywordStatus) => {
      if (selected.size === 0) return;
      const targets = filteredItems
        .filter((it) => selected.has(it.value))
        .map((it) => ({ value: it.value, displayName: it.displayName }));
      if (targets.length === 0) return;
      try {
        const res = await apiClient.post('/api/admin/popular-keywords', {
          items: targets,
          status,
          decidedBy,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `一括更新に失敗しました (${res.status})`);
        }
        await fetchItems();
      } catch (err: any) {
        alert(err?.message || '一括更新に失敗しました');
      }
    },
    [filteredItems, selected, decidedBy, fetchItems]
  );

  const toggleSelect = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected(new Set(filteredItems.map((it) => it.value)));
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">キーワード承認管理</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            サイト側で検索されたキーワードのうち、承認したものだけが表示されます。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchItems()}
          className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          disabled={loading}
        >
          {loading ? '読み込み中...' : '再読み込み'}
        </button>
      </div>

      {/* タブ */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto px-2 pt-2">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => {
          const isActive = tab === key;
          const count =
            key === 'pending' ? counts.pending :
            key === 'approved' ? counts.approved :
            key === 'rejected' ? counts.rejected :
            counts.total;
          return (
            <button
              key={key}
              type="button"
              onClick={() => { setTab(key); setSelected(new Set()); }}
              className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 border-b-white -mb-px'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {TAB_LABELS[key]} <span className="ml-1 text-gray-400">({count})</span>
            </button>
          );
        })}
      </div>

      {/* 一括操作 */}
      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2 flex-wrap text-xs">
        <span className="text-gray-500">
          選択中: <span className="font-medium text-gray-700">{selected.size}件</span>
        </span>
        <button
          type="button"
          onClick={selectAllVisible}
          className="px-2 py-1 rounded text-gray-600 hover:bg-gray-200 transition-colors"
          disabled={filteredItems.length === 0}
        >
          表示中をすべて選択
        </button>
        <button
          type="button"
          onClick={clearSelection}
          className="px-2 py-1 rounded text-gray-600 hover:bg-gray-200 transition-colors"
          disabled={selected.size === 0}
        >
          選択解除
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => void bulkUpdate('approved')}
          className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-40"
          disabled={selected.size === 0}
        >
          一括承認
        </button>
        <button
          type="button"
          onClick={() => void bulkUpdate('rejected')}
          className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40"
          disabled={selected.size === 0}
        >
          一括拒否
        </button>
        <button
          type="button"
          onClick={() => void bulkUpdate('pending')}
          className="px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors disabled:opacity-40"
          disabled={selected.size === 0}
        >
          未承認に戻す
        </button>
      </div>

      {/* リスト */}
      <div className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
        {error && (
          <div className="px-4 py-3 text-xs text-red-700 bg-red-50">{error}</div>
        )}
        {!error && loading && filteredItems.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500">読み込み中...</div>
        )}
        {!loading && filteredItems.length === 0 && !error && (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            {tab === 'pending'
              ? '未承認のキーワードはありません'
              : tab === 'approved'
                ? '承認済みのキーワードはまだありません'
                : tab === 'rejected'
                  ? '拒否済みのキーワードはありません'
                  : '集計対象のキーワードがありません'}
          </div>
        )}
        {filteredItems.map((item) => {
          const badge = STATUS_BADGE[item.status];
          const isBusy = busyValue === item.value;
          return (
            <div key={item.value} className="px-4 py-3 flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected.has(item.value)}
                onChange={() => toggleSelect(item.value)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 text-sm truncate">{item.displayName}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  検索回数: <span className="font-medium text-gray-700">{item.count}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {item.status !== 'approved' && (
                  <button
                    type="button"
                    onClick={() => void updateOne(item.value, item.displayName, 'approved')}
                    disabled={isBusy}
                    className="text-xs px-2.5 py-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-40"
                  >
                    承認
                  </button>
                )}
                {item.status !== 'rejected' && (
                  <button
                    type="button"
                    onClick={() => void updateOne(item.value, item.displayName, 'rejected')}
                    disabled={isBusy}
                    className="text-xs px-2.5 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40"
                  >
                    拒否
                  </button>
                )}
                {item.status !== 'pending' && (
                  <button
                    type="button"
                    onClick={() => void updateOne(item.value, item.displayName, 'pending')}
                    disabled={isBusy}
                    className="text-xs px-2.5 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors disabled:opacity-40"
                  >
                    戻す
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { useState, FormEvent, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import ContentCompareModal from '@/components/admin/content-compare/ContentCompareModal';
import RevisionHistoryPanel from '@/components/admin/content-compare/RevisionHistoryPanel';
import { CustomBlockCompareData } from '@/components/admin/content-compare/diff-utils';
import {
  getCustomBlockById,
  updateCustomBlockWithRevision,
  restoreCustomBlockRevision,
} from '@/lib/firebase/custom-blocks-admin';
import { getRevisionById } from '@/lib/firebase/revisions-admin';
import { CustomBlockRevision } from '@/types/revision';
import { useToast } from '@/contexts/ToastContext';

export default function EditCustomBlockPage() {
  const router = useRouter();
  const params = useParams();
  const blockId = params.id as string;
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    html: '',
    css: '',
  });
  const [originalSnapshot, setOriginalSnapshot] = useState<CustomBlockCompareData | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [compareBefore, setCompareBefore] = useState<CustomBlockCompareData | null>(null);
  const [compareAfter, setCompareAfter] = useState<CustomBlockCompareData | null>(null);
  const [compareBeforeLabel, setCompareBeforeLabel] = useState('編集前');
  const [compareAfterLabel, setCompareAfterLabel] = useState('編集後');
  const [revisionRefreshKey, setRevisionRefreshKey] = useState(0);

  const getCurrentData = useCallback((): CustomBlockCompareData => ({
    name: formData.name,
    html: formData.html,
    css: formData.css,
  }), [formData]);

  const fetchCustomBlock = useCallback(async () => {
    try {
      const block = await getCustomBlockById(blockId);
      if (!block) {
        showError('カスタムブロックが見つかりません');
        router.push('/admin/custom-blocks');
        return;
      }

      const data = {
        name: block.name,
        html: block.html,
        css: block.css,
      };
      setFormData(data);
      setOriginalSnapshot(data);
      setFetchLoading(false);
    } catch (error) {
      console.error('Error fetching custom block:', error);
      showError('カスタムブロックの取得に失敗しました');
    }
  }, [blockId, router, showError]);

  useEffect(() => {
    fetchCustomBlock();
  }, [fetchCustomBlock]);

  const handleOpenCompare = () => {
    if (!originalSnapshot) return;
    setCompareBefore(originalSnapshot);
    setCompareAfter(getCurrentData());
    setCompareBeforeLabel('編集前（保存済み）');
    setCompareAfterLabel('編集中');
    setShowCompare(true);
  };

  const handleRevisionCompare = async (revision: { id: string; label?: string }) => {
    try {
      const rev = await getRevisionById<CustomBlockRevision>('customBlock', blockId, revision.id);
      if (!rev) {
        showError('履歴の取得に失敗しました');
        return;
      }
      setCompareBefore({
        name: rev.snapshot.name,
        html: rev.snapshot.html,
        css: rev.snapshot.css,
      });
      setCompareAfter(getCurrentData());
      setCompareBeforeLabel(rev.label || '履歴');
      setCompareAfterLabel('現行（編集中）');
      setShowCompare(true);
    } catch (error) {
      console.error('Error loading revision:', error);
      showError('履歴の取得に失敗しました');
    }
  };

  const handleRevisionRestore = async (revision: { id: string; label?: string }) => {
    const label = revision.label || '選択した版';
    if (!confirm(`${label} に戻しますか？\n現在の内容は履歴に保存されます。`)) return;

    setLoading(true);
    try {
      await restoreCustomBlockRevision(blockId, revision.id);
      await fetchCustomBlock();
      setRevisionRefreshKey((k) => k + 1);
      showSuccess('以前の版に復元しました');
    } catch (error) {
      console.error('Error restoring revision:', error);
      showError('復元に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.html) {
      showError('ブロック名とHTMLは必須です');
      return;
    }

    setLoading(true);
    try {
      await updateCustomBlockWithRevision(blockId, {
        name: formData.name,
        html: formData.html,
        css: formData.css,
      });

      const saved = getCurrentData();
      setOriginalSnapshot(saved);
      setRevisionRefreshKey((k) => k + 1);
      showSuccess('カスタムブロックを更新しました');
    } catch (error) {
      console.error('Error updating custom block:', error);
      showError('カスタムブロックの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="px-4 pb-32 animate-fadeIn">
          <form onSubmit={handleSubmit}>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">カスタムブロック編集</h1>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleOpenCompare}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                  disabled={loading}
                >
                  変更を比較
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                  disabled={loading}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? '更新中...' : '更新'}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <RevisionHistoryPanel
                entityType="customBlock"
                entityId={blockId}
                onCompare={handleRevisionCompare}
                onRestore={handleRevisionRestore}
                refreshKey={revisionRefreshKey}
              />
            </div>

            <div className="bg-white rounded-[1.75rem] p-8 space-y-6">
              <FloatingInput
                label="ブロック名"
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HTML <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.html}
                  onChange={(e) => setFormData({ ...formData, html: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  rows={12}
                  placeholder="<div>...</div>"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  カスタムブロックのHTMLコードを入力してください
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CSS
                </label>
                <textarea
                  value={formData.css}
                  onChange={(e) => setFormData({ ...formData, css: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  rows={8}
                  placeholder=".custom-block { ... }"
                />
                <p className="text-xs text-gray-500 mt-2">
                  カスタムブロック専用のCSSを入力してください（オプション）
                </p>
              </div>
            </div>
          </form>
        </div>

        {compareBefore && compareAfter && (
          <ContentCompareModal
            isOpen={showCompare}
            onClose={() => setShowCompare(false)}
            contentType="customBlock"
            beforeData={compareBefore}
            afterData={compareAfter}
            beforeLabel={compareBeforeLabel}
            afterLabel={compareAfterLabel}
          />
        )}
      </AdminLayout>
    </AuthGuard>
  );
}

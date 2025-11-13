'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import Link from 'next/link';
import Image from 'next/image';
import { apiGet } from '@/lib/api-client';
import { THEME_LAYOUTS, ThemeLayoutId } from '@/types/theme';

interface ContentBlock {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  placement?: string;
  layoutTheme?: string;
  order: number;
  isActive: boolean;
}

export default function BlocksPage() {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      const data = await apiGet<ContentBlock[]>('/api/admin/blocks');
      setBlocks(data);
    } catch (error) {
      console.error('Error fetching blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`ブロック「${title}」を削除しますか？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/blocks/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('ブロックを削除しました');
        fetchBlocks();
      } else {
        throw new Error('削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting block:', error);
      alert('ブロックの削除に失敗しました');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/blocks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        fetchBlocks();
      }
    } catch (error) {
      console.error('Error toggling block:', error);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newBlocks = [...blocks];
    [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];

    await updateOrder(newBlocks);
  };

  const handleMoveDown = async (index: number) => {
    if (index === blocks.length - 1) return;

    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];

    await updateOrder(newBlocks);
  };

  const updateOrder = async (newBlocks: ContentBlock[]) => {
    try {
      const updates = newBlocks.map((block, index) => ({
        id: block.id,
        order: index,
      }));

      const response = await fetch('/api/admin/blocks/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (response.ok) {
        setBlocks(newBlocks);
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  // 配置場所のラベルを取得する関数
  const getPlacementLabel = (block: ContentBlock): string => {
    if (!block.placement || !block.layoutTheme) {
      return '未設定';
    }
    
    const themeLayout = THEME_LAYOUTS[block.layoutTheme as ThemeLayoutId];
    if (!themeLayout) {
      return block.placement;
    }
    
    const placementObj = themeLayout.blockPlacements.find(p => p.value === block.placement);
    return placementObj ? placementObj.label : block.placement;
  };

  return (
    <AuthGuard>
      <AdminLayout>
        {loading ? null : (
          <div className="max-w-6xl animate-fadeIn">
          {(
            <div className="bg-white rounded-xl overflow-hidden">
              {blocks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  ブロックがまだありません
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {blocks.map((block, index) => (
                    <div key={block.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        {/* ブロック画像 */}
                        <div className="relative w-48 h-24 rounded-lg overflow-hidden bg-gray-100">
                          {block.imageUrl && (
                            <Image
                              src={block.imageUrl}
                              alt={block.title}
                              fill
                              style={{ objectFit: 'cover' }}
                            />
                          )}
                        </div>

                        {/* ブロック情報 */}
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{block.title}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {getPlacementLabel(block)}
                            </span>
                            {block.layoutTheme && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {THEME_LAYOUTS[block.layoutTheme as ThemeLayoutId]?.displayName || block.layoutTheme}
                              </span>
                            )}
                          </div>
                          {block.linkUrl && (
                            <p className="text-sm text-gray-500 mt-1">
                              リンク先: {block.linkUrl}
                            </p>
                          )}
                        </div>

                        {/* 状態 */}
                        <div>
                          <button
                            onClick={() => handleToggleActive(block.id, block.isActive)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                              block.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {block.isActive ? '表示中' : '非表示'}
                          </button>
                        </div>

                        {/* 並び替え */}
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="w-8 h-8 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="上へ"
                          >
                            <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index === blocks.length - 1}
                            className="w-8 h-8 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="下へ"
                          >
                            <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        {/* 操作ボタン */}
                        <div className="flex gap-2">
                          {/* 編集ボタン */}
                          <Link
                            href={`/blocks/${block.id}/edit`}
                            className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition-colors"
                            title="編集"
                          >
                            <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>

                          {/* 削除ボタン */}
                          <button
                            onClick={() => handleDelete(block.id, block.title)}
                            className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center transition-colors"
                            title="削除"
                          >
                            <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
        )}

        {/* フローティング追加ボタン */}
        <Link
          href="/blocks/new"
          className="fixed bottom-8 right-8 bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-50"
          title="新規ブロック作成"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      </AdminLayout>
    </AuthGuard>
  );
}

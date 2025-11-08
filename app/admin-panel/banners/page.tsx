'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import Link from 'next/link';
import Image from 'next/image';
import { apiGet } from '@/lib/api-client';

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  order: number;
  isActive: boolean;
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const data = await apiGet<Banner[]>('/api/admin/banners');
      setBanners(data);
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`バナー「${title}」を削除しますか？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('バナーを削除しました');
        fetchBanners();
      } else {
        throw new Error('削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting banner:', error);
      alert('バナーの削除に失敗しました');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/banners/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        fetchBanners();
      }
    } catch (error) {
      console.error('Error toggling banner:', error);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newBanners = [...banners];
    [newBanners[index - 1], newBanners[index]] = [newBanners[index], newBanners[index - 1]];

    await updateOrder(newBanners);
  };

  const handleMoveDown = async (index: number) => {
    if (index === banners.length - 1) return;

    const newBanners = [...banners];
    [newBanners[index], newBanners[index + 1]] = [newBanners[index + 1], newBanners[index]];

    await updateOrder(newBanners);
  };

  const updateOrder = async (newBanners: Banner[]) => {
    try {
      const updates = newBanners.map((banner, index) => ({
        id: banner.id,
        order: index,
      }));

      const response = await fetch('/api/admin/banners/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (response.ok) {
        setBanners(newBanners);
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="max-w-6xl">
          {loading ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">読み込み中...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl overflow-hidden">
              {banners.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  バナーがまだありません
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {banners.map((banner, index) => (
                    <div key={banner.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        {/* バナー画像 */}
                        <div className="relative w-48 h-24 rounded-lg overflow-hidden bg-gray-100">
                          {banner.imageUrl && (
                            <Image
                              src={banner.imageUrl}
                              alt={banner.title}
                              fill
                              style={{ objectFit: 'cover' }}
                            />
                          )}
                        </div>

                        {/* バナー情報 */}
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{banner.title}</h3>
                          {banner.linkUrl && (
                            <p className="text-sm text-gray-500 mt-1">
                              リンク先: {banner.linkUrl}
                            </p>
                          )}
                        </div>

                        {/* 状態 */}
                        <div>
                          <button
                            onClick={() => handleToggleActive(banner.id, banner.isActive)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                              banner.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {banner.isActive ? '表示中' : '非表示'}
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
                            disabled={index === banners.length - 1}
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
                            href={`/banners/${banner.id}/edit`}
                            className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition-colors"
                            title="編集"
                          >
                            <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>

                          {/* 削除ボタン */}
                          <button
                            onClick={() => handleDelete(banner.id, banner.title)}
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

          {/* フローティング追加ボタン */}
          <Link
            href="/banners/new"
            className="fixed bottom-8 right-8 bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-50"
            title="新規バナー作成"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}


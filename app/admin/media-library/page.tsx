'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import Image from 'next/image';
import { apiGet, apiPostFormData } from '@/lib/api-client';
import ImagePromptPatternModal from '@/components/admin/ImagePromptPatternModal';

const ITEMS_PER_LOAD = 50;

interface MediaFile {
  id: string;
  name: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video';
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  createdAt: string;
  usageCount?: number;
  usageDetails?: string[];
}

export default function MediaPage() {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [isImagePromptModalOpen, setIsImagePromptModalOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_LOAD);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const data = await apiGet<MediaFile[]>('/api/admin/media');
      setMediaFiles(data);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        await apiPostFormData('/api/admin/media/upload', formData);
      }

      alert(`${files.length}個のファイルをアップロードしました`);
      fetchMedia();
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('ファイルのアップロードに失敗しました');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/media/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // ステートから削除して即座にUIを更新
        setMediaFiles(prev => prev.filter(media => media.id !== id));
        alert('メディアを削除しました');
      } else {
        throw new Error('削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting media:', error);
      alert('メディアの削除に失敗しました');
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('URLをコピーしました');
  };

  // フィルタリング
  const filteredMedia = useMemo(() => {
    return mediaFiles.filter((media) => {
      const matchesSearch = media.originalName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || media.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [mediaFiles, searchQuery, filterType]);

  // 表示するメディア（displayCount件まで）
  const displayedMedia = useMemo(() => {
    return filteredMedia.slice(0, displayCount);
  }, [filteredMedia, displayCount]);

  // さらに読み込めるかどうか
  const hasMore = displayCount < filteredMedia.length;

  // 次を読み込み
  const handleLoadMore = () => {
    setDisplayCount(prev => prev + ITEMS_PER_LOAD);
  };

  // 検索・フィルター変更時は表示件数をリセット
  useEffect(() => {
    setDisplayCount(ITEMS_PER_LOAD);
  }, [searchQuery, filterType]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <AuthGuard>
      <AdminLayout>
        {loading ? null : (
          <div className="max-w-7xl animate-fadeIn">
          {/* 検索・フィルター */}
          <div className="bg-white rounded-xl p-4 mb-6" style={{ backgroundColor: '#ddecf8' }}>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="メディアを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'image' | 'video')}
                className="px-4 py-2 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="image">画像のみ</option>
                <option value="video">動画のみ</option>
              </select>
            </div>
          </div>

          {/* メディア一覧 */}
          {filteredMedia.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center text-gray-500">
              {searchQuery || filterType !== 'all'
                ? '条件に一致するメディアが見つかりません'
                : 'メディアがまだありません'}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6">
              {/* 件数表示 */}
              <div className="mb-4 text-sm text-gray-600">
                全{filteredMedia.length}件中 {displayedMedia.length}件を表示
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {displayedMedia.map((media) => (
                  <div
                    key={media.id}
                    className="group relative bg-gray-50 rounded-lg overflow-hidden hover:shadow-custom transition-shadow"
                  >
                    {/* メディアプレビュー */}
                    <div className="aspect-square relative bg-gray-200">
                      {media.type === 'image' ? (
                        <Image
                          src={media.thumbnailUrl || media.url}
                          alt={media.originalName}
                          fill
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <video
                          src={media.url}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    {/* ホバー時のオーバーレイ */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        {/* View (別タブで開く) */}
                        <a
                          href={media.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 rounded-full bg-blue-500 text-white hover:bg-blue-600 flex items-center justify-center transition-colors"
                          title="別タブで表示"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </a>

                        {/* URLコピー */}
                        <button
                          onClick={() => handleCopyUrl(media.url)}
                          className="w-10 h-10 rounded-full bg-white text-gray-800 hover:bg-gray-100 flex items-center justify-center transition-colors"
                          title="URLをコピー"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>

                        {/* 削除 */}
                        <button
                          onClick={() => handleDelete(media.id, media.originalName)}
                          className="w-10 h-10 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-colors"
                          title="削除"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* ファイル情報 */}
                    <div className="p-3">
                      <p className="text-xs font-medium text-gray-900 truncate" title={media.originalName}>
                        {media.originalName}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500">{formatFileSize(media.size)}</span>
                        {media.width && media.height && (
                          <span className="text-xs text-gray-500">
                            {media.width}×{media.height}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 次を読み込みボタン */}
              {hasMore && (
                <div className="mt-6 text-center">
                  <button
                    onClick={handleLoadMore}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                  >
                    次を読み込み（残り{filteredMedia.length - displayCount}件）
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ファイル選択用の隠しinput */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* フローティングボタン */}
          <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
            {/* 画像プロンプトパターン管理ボタン */}
            <button
              onClick={() => setIsImagePromptModalOpen(true)}
              className="bg-gray-600 text-white w-14 h-14 rounded-full hover:bg-gray-700 transition-all hover:scale-110 flex items-center justify-center shadow-lg"
              title="画像プロンプトパターン管理"
            >
              <Image src="/prompt.svg" alt="Prompt" width={24} height={24} className="brightness-0 invert" />
            </button>

            {/* アップロードボタン */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="メディアをアップロード"
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
          </div>

          {/* 画像プロンプトパターン管理モーダル */}
          <ImagePromptPatternModal
            isOpen={isImagePromptModalOpen}
            onClose={() => setIsImagePromptModalOpen(false)}
            onSuccess={() => {
              // 成功時の処理（必要に応じて）
            }}
          />
        </div>
        )}
      </AdminLayout>
    </AuthGuard>
  );
}


'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { apiGet } from '@/lib/api-client';

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
}

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  filterType?: 'all' | 'image' | 'video';
}

export default function MediaLibraryModal({ 
  isOpen, 
  onClose, 
  onSelect,
  filterType = 'image' 
}: MediaLibraryModalProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
    }
  }, [isOpen]);

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

  const filteredMedia = mediaFiles.filter((media) => {
    const matchesType = filterType === 'all' || media.type === filterType;
    const matchesSearch = media.originalName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleSelect = () => {
    if (selectedMedia) {
      onSelect(selectedMedia.url);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">メディアライブラリ</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 検索 */}
        <div className="p-6 border-b border-gray-200">
          <input
            type="text"
            placeholder="ファイル名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* メディア一覧 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              読み込み中...
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? '条件に一致するメディアが見つかりません' : 'メディアがまだありません'}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredMedia.map((media) => (
                <div
                  key={media.id}
                  onClick={() => setSelectedMedia(media)}
                  className={`relative bg-gray-50 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all ${
                    selectedMedia?.id === media.id ? 'ring-4 ring-blue-500' : ''
                  }`}
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
                    
                    {/* 選択インジケーター */}
                    {selectedMedia?.id === media.id && (
                      <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* ファイル名 */}
                  <div className="p-2 bg-white">
                    <p className="text-xs text-gray-600 truncate" title={media.originalName}>
                      {media.originalName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedMedia && (
              <span>
                選択中: <strong>{selectedMedia.originalName}</strong>
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedMedia}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                selectedMedia
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              選択
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


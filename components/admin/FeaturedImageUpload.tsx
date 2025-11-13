'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { apiPostFormData } from '@/lib/api-client';
import MediaLibraryModal from './MediaLibraryModal';
import ImageGenerator from './ImageGenerator';
import FloatingInput from './FloatingInput';

interface FeaturedImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  alt?: string;
  onAltChange?: (alt: string) => void;
  showAltInput?: boolean; // デフォルトはtrue
  showImageGenerator?: boolean; // デフォルトはfalse
  imageGeneratorTitle?: string; // AI生成時のタイトル
  imageGeneratorContent?: string; // AI生成時のコンテンツ
}

export default function FeaturedImageUpload({ 
  value, 
  onChange, 
  label = 'アイキャッチ画像', 
  alt = '', 
  onAltChange, 
  showAltInput = true,
  showImageGenerator = false,
  imageGeneratorTitle = '',
  imageGeneratorContent = ''
}: FeaturedImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(value);
  const [isHovered, setIsHovered] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [altText, setAltText] = useState(alt);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // valueが変わったらpreviewを更新
  useEffect(() => {
    setPreview(value);
  }, [value]);

  // altが変わったらaltTextを更新
  useEffect(() => {
    setAltText(alt);
  }, [alt]);

  // altTextが変わったら親に通知
  const handleAltChange = (newAlt: string) => {
    setAltText(newAlt);
    if (onAltChange) {
      onAltChange(newAlt);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // プレビュー表示
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
    };
    reader.readAsDataURL(file);

    // アップロード（API経由、mediaIdが自動的に追加される）
    setUploading(true);
    console.log('[FeaturedImageUpload] API経由でアップロード開始');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (altText) {
        formData.append('alt', altText);
      }
      
      console.log('[FeaturedImageUpload] APIリクエスト送信中...');
      const data = await apiPostFormData<{ url: string }>('/api/admin/media/upload', formData);
      
      console.log('[FeaturedImageUpload] アップロード成功、URL:', data.url);
      
      onChange(data.url);
      console.log('[FeaturedImageUpload] onChange呼び出し完了');
    } catch (error) {
      console.error('[FeaturedImageUpload] アップロードエラー:', error);
      alert('画像のアップロードに失敗しました');
      setPreview(value);
    } finally {
      setUploading(false);
    }
  };

  const handleChange = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = () => {
    onChange('');
    setPreview(undefined);
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
      />


      {/* 画像プレビューエリア */}
      {preview ? (
        <div
          className="relative w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="relative w-full" style={{ minHeight: '200px' }}>
            <Image
              src={preview}
              alt={altText || label}
              width={800}
              height={600}
              className="w-full h-auto object-contain"
              style={{ maxHeight: '400px' }}
            />
          </div>
          
          {/* ホバー時のオーバーレイ */}
          {isHovered && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center gap-3 transition-opacity">
              {/* 変更ボタン */}
              <button
                type="button"
                onClick={handleChange}
                className="bg-white text-gray-900 w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                title="画像を変更"
              >
                <Image src="/upload.svg" alt="Upload" width={24} height={24} />
              </button>

              {/* メディアライブラリボタン */}
              <button
                type="button"
                onClick={() => setShowMediaLibrary(true)}
                className="bg-white text-gray-900 w-12 h-12 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                title="メディアライブラリから選択"
              >
                <Image src="/media.svg" alt="Media" width={24} height={24} />
              </button>

              {/* 削除ボタン */}
              <button
                type="button"
                onClick={handleDelete}
                className="bg-white text-red-600 w-12 h-12 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors"
                title="画像を削除"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-64 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-6">
          {/* アイコン */}
          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          
          {/* ラベル */}
          <span className="text-sm font-medium text-gray-700">{label}</span>

          {/* アイコンボタン群（横並び） */}
          <div className="flex gap-3">
            {/* アップロードボタン */}
            <button
              type="button"
              onClick={handleChange}
              disabled={uploading}
              className="bg-white text-gray-900 w-12 h-12 rounded-full flex items-center justify-center border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="アップロード"
            >
              <Image src="/upload.svg" alt="Upload" width={24} height={24} />
            </button>
            
            {/* メディアライブラリボタン */}
            <button
              type="button"
              onClick={() => setShowMediaLibrary(true)}
              className="bg-white text-gray-900 w-12 h-12 rounded-full flex items-center justify-center border border-gray-300 hover:bg-gray-50 transition-colors"
              title="ライブラリから選択"
            >
              <Image src="/media.svg" alt="Media" width={24} height={24} />
            </button>
            
            {/* AI生成ボタン */}
            {showImageGenerator && (
              <button
                type="button"
                onClick={() => setShowAIGenerator(!showAIGenerator)}
                className="bg-white text-gray-900 w-12 h-12 rounded-full flex items-center justify-center border border-gray-300 hover:bg-gray-50 transition-colors"
                title="AI生成"
              >
                <Image src="/ai.svg" alt="AI" width={24} height={24} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* AI生成エリア（サムネイルエリアの下） */}
      {showAIGenerator && (
        <div className="p-4 border border-gray-200 rounded-lg">
          <ImageGenerator
            onImageGenerated={(url) => {
              onChange(url);
              setPreview(url);
              setShowAIGenerator(false);
            }}
            articleTitle={imageGeneratorTitle}
            articleContent={imageGeneratorContent}
          />
        </div>
      )}

      {/* Alt属性入力 (FloatingInput) */}
      {showAltInput && (
        <FloatingInput
          label="画像の説明（alt属性）"
          value={altText}
          onChange={handleAltChange}
        />
      )}

      {/* メディアライブラリモーダル */}
      <MediaLibraryModal
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={(url) => {
          onChange(url);
          setPreview(url);
        }}
        filterType="image"
      />
    </div>
  );
}

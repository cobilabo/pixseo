'use client';

import { useState } from 'react';
import Image from 'next/image';
import FloatingInput from './FloatingInput';
import FloatingSelect from './FloatingSelect';

interface ImageGeneratorProps {
  onImageGenerated: (url: string) => void;
  articleTitle?: string;
  articleContent?: string;
}

export default function ImageGenerator({ onImageGenerated, articleTitle, articleContent }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1024x1024' | '1792x1024' | '1024x1792'>('1024x1024');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const generateImagePrompt = () => {
    // 記事タイトルとコンテンツから画像プロンプトを自動生成
    if (articleTitle && articleContent) {
      // 記事の最初の段落からキーワードを抽出
      const contentPreview = articleContent.replace(/<[^>]*>/g, '').substring(0, 200);
      return `${articleTitle}に関連する、プロフェッショナルで魅力的な画像。${contentPreview}の内容を反映した、高品質な写真風の画像。重要：画像内にテキスト、文字、文章を一切含めないでください。`;
    }
    return prompt;
  };

  const handleGenerate = async () => {
    // プロンプトが空の場合は自動生成
    let imagePrompt = prompt.trim() || generateImagePrompt();
    
    if (!imagePrompt || imagePrompt.trim() === '') {
      setError('プロンプトを入力するか、タイトルとコンテンツを入力してください');
      return;
    }

    // テキストを含めないように明示的に指示を追加（プロンプトに含まれていない場合）
    if (!imagePrompt.includes('テキスト') && !imagePrompt.toLowerCase().includes('no text')) {
      imagePrompt = `${imagePrompt}. Important: No text, letters, or words should appear in the image. Create a clean photographic image without any text elements.`;
    }

    setGenerating(true);
    setError(null);

    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const response = await fetch('/api/admin/images/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-media-id': currentTenantId || '',
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          size,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '画像の生成に失敗しました');
      }

      const data = await response.json();
      setGeneratedImageUrl(data.url);
      onImageGenerated(data.url);
    } catch (err) {
      console.error('Error generating image:', err);
      setError(err instanceof Error ? err.message : '画像の生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  const sizeOptions = [
    { value: '1024x1024', label: '正方形 (1024x1024)' },
    { value: '1792x1024', label: '横長 (1792x1024)' },
    { value: '1024x1792', label: '縦長 (1024x1792)' },
  ];

  return (
    <div className="space-y-4">
      {/* 画像プロンプト */}
      <FloatingInput
        label="画像プロンプト"
        value={prompt}
        onChange={setPrompt}
        multiline
        rows={3}
      />

      {/* 画像サイズ */}
      <FloatingSelect
        label="画像サイズ"
        value={size}
        onChange={(value) => setSize(value as typeof size)}
        options={sizeOptions}
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {generatedImageUrl && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">生成された画像:</p>
          <img
            src={generatedImageUrl}
            alt="Generated"
            className="w-full rounded-xl border border-gray-200"
          />
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            画像を生成中...
          </span>
        ) : (
          'AI画像を生成'
        )}
      </button>
    </div>
  );
}

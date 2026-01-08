'use client';

import { useState } from 'react';
import Image from 'next/image';
import FloatingInput from '@/components/admin/FloatingInput';

interface SlugInputProps {
  value: string;
  onChange: (value: string) => void;
  sourceName: string;
  type: 'category' | 'tag' | 'article' | 'page';
  label?: string;
  required?: boolean;
}

export default function SlugInput({ 
  value, 
  onChange, 
  sourceName, 
  type,
  label = 'スラッグ（英数字とハイフンのみ）*',
  required = true
}: SlugInputProps) {
  const [generating, setGenerating] = useState(false);

  const generateSlug = async () => {
    if (!sourceName) {
      alert('名前を入力してください');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/admin/generate-slug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: sourceName,
          type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate slug');
      }

      const data = await response.json();
      onChange(data.slug);
    } catch (error) {
      console.error('Error generating slug:', error);
      alert('スラッグの生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <FloatingInput
          label={label}
          value={value}
          onChange={(v) => onChange(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          required={required}
        />
      </div>
      <button
        type="button"
        onClick={generateSlug}
        disabled={generating || !sourceName}
        className="mt-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white w-12 h-12 rounded-full hover:from-purple-700 hover:to-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        title="AIで英語スラッグを生成"
      >
        {generating ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <Image src="/ai.svg" alt="AI" width={20} height={20} className="brightness-0 invert" />
        )}
      </button>
    </div>
  );
}

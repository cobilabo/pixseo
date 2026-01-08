'use client';

import { useState } from 'react';
import Image from 'next/image';
import FloatingInput from '@/components/admin/FloatingInput';

interface AITextareaInputProps {
  value: string;
  onChange: (value: string) => void;
  sourceName: string;
  apiEndpoint: string;
  label?: string;
  rows?: number;
  required?: boolean;
  buttonTitle?: string;
}

export default function AITextareaInput({ 
  value, 
  onChange, 
  sourceName, 
  apiEndpoint,
  label = '説明',
  rows = 3,
  required = false,
  buttonTitle = 'AIで自動生成'
}: AITextareaInputProps) {
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    if (!sourceName) {
      alert('名前を入力してください');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: sourceName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate');
      }

      const data = await response.json();
      onChange(data.description || data.text || data.content);
    } catch (error) {
      console.error('Error generating:', error);
      alert('生成に失敗しました');
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
          onChange={onChange}
          multiline
          rows={rows}
          required={required}
        />
      </div>
      <button
        type="button"
        onClick={generate}
        disabled={generating || !sourceName}
        className="w-12 h-12 mb-0.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full hover:from-purple-700 hover:to-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        title={buttonTitle}
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

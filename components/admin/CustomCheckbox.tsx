'use client';

import React from 'react';

interface CustomCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

/**
 * カスタムチェックボックスコンポーネント
 * 
 * 角丸の枠線フィールド
 * チェック時：枠線消失、テキストと背景が反転
 */
export default function CustomCheckbox({
  label,
  checked,
  onChange,
  className = '',
}: CustomCheckboxProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`
        relative
        w-full
        px-4
        py-3
        rounded-xl
        text-sm
        font-medium
        transition-all
        ${checked
          ? 'bg-blue-600 text-white border-0'
          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }
        ${className}
      `}
    >
      {label}
    </button>
  );
}


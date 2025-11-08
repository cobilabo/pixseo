'use client';

import { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface FloatingMultiSelectProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: Option[];
  required?: boolean;
}

export default function FloatingMultiSelect({
  label,
  values,
  onChange,
  options,
  required = false,
}: FloatingMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 選択されたラベルを取得
  const selectedLabels = options
    .filter(opt => values.includes(opt.value))
    .map(opt => opt.label)
    .join(', ');

  // 外側クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter(v => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ドロップダウントリガー */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 cursor-pointer bg-white"
      >
        <span className={values.length > 0 ? 'text-gray-900' : 'text-gray-400'}>
          {selectedLabels || `${label}を選択`}
        </span>
      </div>

      {/* フローティングラベル */}
      <label
        className="absolute left-2 -top-2.5 bg-white px-2 text-xs text-gray-700 pointer-events-none"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* ドロップダウンアイコン */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg 
          className={`fill-current h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 20 20"
        >
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {options.map((option) => {
            const isSelected = values.includes(option.value);
            return (
              <div
                key={option.value}
                onClick={() => toggleOption(option.value)}
                className={`px-4 py-3 cursor-pointer hover:bg-blue-50 flex items-center gap-3 ${
                  isSelected ? 'bg-blue-50' : ''
                }`}
              >
                {/* チェックボックス */}
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                  {option.label}
                </span>
              </div>
            );
          })}
          {options.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              選択肢がありません
            </div>
          )}
        </div>
      )}
    </div>
  );
}


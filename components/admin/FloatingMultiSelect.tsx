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
  badgeColor?: 'green' | 'blue' | 'gray' | 'purple'; // バッジの色（オプション）
}

export default function FloatingMultiSelect({
  label,
  values,
  onChange,
  options,
  badgeColor = 'blue',
}: FloatingMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOptions = options.filter(opt => values.includes(opt.value));
  const availableOptions = options.filter(opt => 
    !values.includes(opt.value) && 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter(v => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(values.filter(v => v !== value));
  };

  const getBadgeColorClasses = () => {
    switch (badgeColor) {
      case 'green':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'blue':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'gray':
        return 'bg-gray-800 text-white hover:bg-gray-900';
      case 'purple':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      default:
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`relative border rounded-xl transition-all ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
        }`}
      >
      <div
        onClick={() => setIsOpen(!isOpen)}
          className="min-h-[3rem] px-4 py-3 cursor-pointer"
        >
          {selectedOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedOptions.map(option => (
                <span
                  key={option.value}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium transition-colors ${getBadgeColorClasses()}`}
                >
                  {option.label}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(option.value, e)}
                    className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors ${
                      badgeColor === 'gray' ? 'hover:bg-white/20' : 'hover:bg-white/50'
                    }`}
                    title="削除"
      >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
        </span>
              ))}
            </div>
          ) : null}
      </div>

      <label
          className={`absolute left-2 transition-all pointer-events-none ${
            selectedOptions.length > 0 || isOpen
              ? '-top-2.5 text-xs bg-white px-2 text-gray-700'
              : 'top-1/2 -translate-y-1/2 text-sm text-gray-500 px-2'
          }`}
      >
        {label}
      </label>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-64 overflow-y-auto">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="検索..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          
          <div className="py-1">
            {availableOptions.length > 0 ? (
              availableOptions.map(option => (
                <button
                key={option.value}
                  type="button"
                  onClick={() => handleToggle(option.value)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">
                {searchTerm ? '検索結果なし' : 'すべて選択済み'}
              </div>
            )}
            </div>
        </div>
      )}
    </div>
  );
}

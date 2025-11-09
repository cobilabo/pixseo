'use client';

import React from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowOff?: boolean;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange, allowOff = false }) => {
  const hasValue = value.length > 0;
  const isOff = value === 'transparent' || value === '';

  return (
    <div className="relative">
      {/* カラーフィールド */}
      <div className="relative">
        <input
          type="text"
          value={isOff ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={allowOff ? "" : "#000000"}
          className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono peer"
          style={{ paddingLeft: '3.5rem' }}
        />
        {/* カラーピッカー（正円） */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300">
          <input
            type="color"
            value={isOff ? '#000000' : value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full cursor-pointer"
            style={{
              border: 'none',
              outline: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none',
              background: 'none',
              padding: 0,
              margin: 0,
            }}
          />
        </div>
        {/* フロートラベル */}
        <label
          className={`absolute left-14 transition-all pointer-events-none ${
            hasValue || !isOff
              ? 'text-xs -top-2.5 bg-white px-2 text-gray-700'
              : 'text-sm top-1/2 -translate-y-1/2 text-gray-500 px-2'
          } peer-focus:text-xs peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:bg-white peer-focus:px-2 peer-focus:text-gray-700`}
        >
          {label}
        </label>
      </div>
      {/* OFFボタン（必要な場合） */}
      {allowOff && !isOff && (
        <button
          type="button"
          onClick={() => onChange('transparent')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-red-600 font-medium"
        >
          OFF
        </button>
      )}
    </div>
  );
};

export default ColorPicker;


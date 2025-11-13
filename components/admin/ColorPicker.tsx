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
      <input
        type="text"
        value={isOff ? '' : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={allowOff ? "" : "#000000"}
        disabled={isOff && allowOff}
        className={`w-full pl-14 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono peer text-gray-900 disabled:bg-gray-50 disabled:text-gray-400 ${
          allowOff ? 'pr-20' : 'pr-4'
        }`}
        style={{ paddingLeft: '3rem' }}
      />
      {/* カラーピッカー（正円・フル） */}
      <div className="absolute left-3 top-[50%] -translate-y-[50%] w-8 h-8 rounded-full overflow-hidden border-2 border-gray-300 bg-white flex items-center justify-center">
        <input
          type="color"
          value={isOff ? '#000000' : value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isOff && allowOff}
          className="cursor-pointer"
          style={{
            width: '48px',
            height: '48px',
            border: 'none',
            outline: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            appearance: 'none',
            padding: 0,
            margin: 0,
            transform: 'scale(2)',
          }}
        />
      </div>
      {/* フロートラベル */}
      <label
        className={`absolute left-12 transition-all pointer-events-none ${
          hasValue || !isOff
            ? 'text-xs -top-2.5 bg-white px-2 text-gray-700'
            : 'text-sm top-[50%] -translate-y-[50%] text-gray-500 px-2'
        } peer-focus:text-xs peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:bg-white peer-focus:px-2 peer-focus:text-gray-700`}
      >
        {label}
      </label>
      
      {/* ON/OFFトグル（フィールド内右端） */}
      {allowOff && (
        <label className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer flex items-center">
          <div className="relative inline-block w-14 h-8">
            <input
              type="checkbox"
              checked={!isOff}
              onChange={(e) => onChange(e.target.checked ? '#000000' : 'transparent')}
              className="sr-only"
            />
            <div 
              className={`absolute inset-0 rounded-full transition-colors pointer-events-none ${
                !isOff ? 'bg-blue-600' : 'bg-gray-400'
              }`}
            >
              <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                !isOff ? 'translate-x-6' : 'translate-x-0'
              }`}></div>
            </div>
          </div>
        </label>
      )}
    </div>
  );
};

export default ColorPicker;


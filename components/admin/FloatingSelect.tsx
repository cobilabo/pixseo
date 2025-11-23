'use client';

import { useState, useRef, useEffect } from 'react';

interface FloatingSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  className?: string;
}

export default function FloatingSelect({
  label,
  value,
  onChange,
  options,
  required = false,
  className = '',
}: FloatingSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`relative border rounded-xl transition-all cursor-pointer ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
        }`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.75rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.5em 1.5em',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="min-h-[3rem] px-4 py-3 pr-10">
          {selectedOption ? (
            <span className="text-gray-900">{selectedOption.label}</span>
          ) : (
            <span className="text-gray-500"></span>
          )}
        </div>

        <label
          className={`absolute left-2 transition-all pointer-events-none ${
            selectedOption || isOpen
              ? '-top-2.5 text-xs bg-white px-2 text-gray-700'
              : 'top-1/2 -translate-y-1/2 text-sm text-gray-500 px-2'
          }`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>

      {isOpen && (
        <div className="absolute z-[9999] mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-64 overflow-y-auto">
          <div className="py-2">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                  option.value === value
                    ? 'bg-blue-50 text-blue-900 font-medium'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

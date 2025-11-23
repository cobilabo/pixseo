'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <>
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
          onClick={handleToggle}
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
      </div>

      {/* React Portalでbody直下にドロップダウンを表示 */}
      {mounted && isOpen && createPortal(
        <div
          style={{
            position: 'absolute',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 99999,
          }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 max-h-64 overflow-y-auto"
        >
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
        </div>,
        document.body
      )}
    </>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchPanel({ isOpen, onClose }: SearchPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/media/search?q=${encodeURIComponent(searchQuery.trim())}`);
      onClose();
      setSearchQuery('');
    }
  };

  const panel = (
    <>
      {/* オーバーレイ */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9998
          }}
          onClick={onClose}
        />
      )}

      {/* 検索パネル */}
      <div
        style={{ 
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: '320px',
          backgroundColor: '#ffffff',
          color: '#1f2937',
          zIndex: 9999,
          boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.3)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease-in-out'
        }}
      >
        <div className="flex flex-col h-full">
          {/* 閉じるボタン */}
          <div className="flex justify-start p-6">
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center hover:opacity-70 transition-opacity"
              aria-label="閉じる"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 検索フォーム */}
          <div className="flex-1 px-8 py-4">
            <h2 className="text-xl font-bold mb-6">キーワード検索</h2>
            <form onSubmit={handleSearch}>
              <div className="mb-6">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="キーワードを入力"
                  className="w-full pb-3 text-lg text-gray-900 bg-transparent border-b-[3px] border-gray-900 focus:outline-none placeholder:text-base placeholder:text-gray-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 px-6 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                検索
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );

  return <>{mounted && createPortal(panel, document.body)}</>;
}


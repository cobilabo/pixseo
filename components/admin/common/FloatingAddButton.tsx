'use client';

import Link from 'next/link';

interface FloatingAddButtonProps {
  href: string;
  title?: string;
}

export default function FloatingAddButton({ href, title = '新規作成' }: FloatingAddButtonProps) {
  return (
    <Link
      href={href}
      className="fixed bottom-8 right-8 bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-50 shadow-custom"
      title={title}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </Link>
  );
}

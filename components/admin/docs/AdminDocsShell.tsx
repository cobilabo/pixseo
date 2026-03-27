'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { TocSection } from './toc';

function TocNav({
  sections,
  className = '',
}: {
  sections: TocSection[];
  className?: string;
}) {
  return (
    <nav aria-label="ドキュメント目次" className={className}>
      <ul className="space-y-1 text-sm">
        {sections.map((sec) => (
          <li key={sec.id}>
            <a
              href={`#${sec.id}`}
              className="block rounded-md px-2 py-1.5 text-gray-700 hover:bg-blue-50 hover:text-blue-800"
            >
              {sec.label}
            </a>
            {sec.children && sec.children.length > 0 && (
              <ul className="mt-1 ml-2 border-l border-gray-200 pl-2 space-y-0.5">
                {sec.children.map((c) => (
                  <li key={c.id}>
                    <a
                      href={`#${c.id}`}
                      className="block rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-800"
                    >
                      {c.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function AdminDocsShell({
  tocSections,
  children,
}: {
  tocSections: TocSection[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            管理画面に戻る
          </Link>
          <div className="flex items-center gap-2">
            <Image
              src="/logo_yoko_b_1.svg"
              alt=""
              width={120}
              height={32}
              className="h-7 w-auto opacity-90"
            />
            <span className="hidden text-sm font-semibold text-gray-700 sm:inline">
              ヘルプ
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:flex-row">
        {/* デスクトップ: 目次サイドバー */}
        <aside
          className="hidden w-72 shrink-0 border-r border-gray-200 bg-white lg:block xl:w-80"
          aria-label="目次"
        >
          <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto overscroll-contain px-4 py-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              目次
            </p>
            <TocNav sections={tocSections} />
          </div>
        </aside>

        {/* メイン */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:py-8 lg:pl-8">
          {/* モバイル: 折りたたみ目次 */}
          <details className="group mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:hidden open:shadow-md">
            <summary className="cursor-pointer list-none font-semibold text-gray-900 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between">
                目次を表示
                <svg
                  className="h-5 w-5 text-gray-400 transition group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </span>
            </summary>
            <div className="mt-4 border-t border-gray-100 pt-4">
              <TocNav sections={tocSections} />
            </div>
          </details>

          <div className="scroll-mt-24">{children}</div>
        </main>
      </div>
    </div>
  );
}

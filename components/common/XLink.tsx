'use client';

import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';

interface XLinkProps {
  username: string;
  lang?: Lang;
}

export default function XLink({ username, lang = 'ja' }: XLinkProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">
        X（Twitter）
      </h3>
      <a
        href={`https://x.com/${username}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        @{username} {t('common.follow', lang)}
      </a>
    </div>
  );
}


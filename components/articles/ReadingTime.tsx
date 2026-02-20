import { Lang } from '@/types/lang';
import { t } from '@/lib/i18n/translations';

interface ReadingTimeProps {
  minutes: number;
  lang?: Lang;
}

export default function ReadingTime({ minutes, lang = 'ja' }: ReadingTimeProps) {
  if (!minutes || minutes <= 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{t('article.readingTime', lang, { minutes })}</span>
    </div>
  );
}

'use client';

import { Lang } from '@/types/lang';
import { localizeHtmlLinks } from '@/lib/i18n/localize-html';

interface SidebarHtmlContentProps {
  htmlCode: string;
  lang?: Lang;
  htmlCode_en?: string;
  htmlCode_zh?: string;
  htmlCode_ko?: string;
}

export default function SidebarHtmlContent({ htmlCode, lang = 'ja', htmlCode_en, htmlCode_zh, htmlCode_ko }: SidebarHtmlContentProps) {
  const htmlMap: Record<string, string | undefined> = { en: htmlCode_en, zh: htmlCode_zh, ko: htmlCode_ko };
  const raw = (lang !== 'ja' && htmlMap[lang]?.trim()) ? htmlMap[lang]! : htmlCode;
  const content = localizeHtmlLinks(raw, lang);
  if (!content?.trim()) return null;
  
  return (
    <div
      className="sidebar-custom-html"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

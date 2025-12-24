'use client';

import { SideContentHtmlItem } from '@/types/theme';

interface SidebarCustomHtmlProps {
  items?: SideContentHtmlItem[];
}

export default function SidebarCustomHtml({ items = [] }: SidebarCustomHtmlProps) {
  // 有効なアイテムのみをフィルタリングし、orderでソート
  const enabledItems = items
    .filter(item => item.isEnabled && item.htmlCode?.trim())
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  if (enabledItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {enabledItems.map((item) => (
        <div
          key={item.id}
          className="sidebar-custom-html"
          dangerouslySetInnerHTML={{ __html: item.htmlCode }}
        />
      ))}
    </div>
  );
}


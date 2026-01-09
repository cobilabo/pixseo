'use client';

interface SidebarHtmlContentProps {
  htmlCode: string;
}

export default function SidebarHtmlContent({ htmlCode }: SidebarHtmlContentProps) {
  if (!htmlCode?.trim()) return null;
  
  return (
    <div
      className="sidebar-custom-html"
      dangerouslySetInnerHTML={{ __html: htmlCode }}
    />
  );
}

import Link from 'next/link';
import { Lang } from '@/types/lang';
import { SideContentLinkButtonIcon } from '@/types/theme';
import { getSideLinkButtonIconSvg } from '@/lib/constants/side-content-link-button';

interface SidebarLinkButtonProps {
  title: string;
  linkLabel: string;
  linkUrl: string;
  buttonIcon?: SideContentLinkButtonIcon;
  lang?: Lang;
}

function localizeSideLinkUrl(url: string, lang: Lang): string {
  const trimmed = url.trim();
  if (!trimmed) return `/${lang}/`;
  const withLang = trimmed.replace(/^\/(ja|en|zh|ko)(\/|$)/, `/${lang}$2`);
  if (withLang !== trimmed) return withLang;
  if (trimmed.startsWith('/')) return `/${lang}${trimmed}`;
  return `/${lang}/${trimmed}`;
}

export default function SidebarLinkButton({
  title,
  linkLabel,
  linkUrl,
  buttonIcon = 'mail',
  lang = 'ja',
}: SidebarLinkButtonProps) {
  const href = localizeSideLinkUrl(linkUrl, lang);
  const label = linkLabel.trim() || title;

  return (
    <div
      className="sidebar-custom-html"
      style={{
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <h4
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: '#374151',
          margin: '0 0 16px 0',
        }}
      >
        {title}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Link
          href={href}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 20px',
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 9999,
            textDecoration: 'none',
            color: '#1e293b',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <span
            dangerouslySetInnerHTML={{ __html: getSideLinkButtonIconSvg(buttonIcon) }}
            aria-hidden
          />
          {label}
        </Link>
      </div>
    </div>
  );
}
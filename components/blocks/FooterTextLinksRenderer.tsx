import Link from 'next/link';
import Image from 'next/image';
import { FooterTextLinkSection } from '@/types/theme';
import { Lang } from '@/types/lang';

interface FooterTextLinksRendererProps {
  sections: FooterTextLinkSection[];
  siteInfo: any;
  lang?: Lang;
  className?: string;
  layoutTheme?: string;
}

/**
 * テキストリンクセクションを表示するコンポーネント
 * 左カラム（ロゴ+説明）+ セクションのグリッドレイアウト
 */
export default function FooterTextLinksRenderer({ sections, siteInfo, lang = 'ja', className = '', layoutTheme }: FooterTextLinksRendererProps) {
  const isCobi = layoutTheme === 'cobi';
  // 有効なセクション（タイトルまたはリンクがある）のみフィルタリング
  const validSections = sections.filter(
    section => section.title || (section.links && section.links.some(link => link.text && link.url))
  );

  if (validSections.length === 0) {
    return null;
  }

  return (
    <div className={`w-full flex flex-col md:grid ${validSections.length === 1 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-8 md:gap-0 pb-8 ${className}`}>
      {/* 左カラム: ロゴとディスクリプション */}
      <div className="text-center md:text-left px-8 pb-8 border-b md:border-b-0 border-gray-600">
        <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
          {siteInfo.faviconUrl && (
            <Image
              src={siteInfo.faviconUrl}
              alt={`${siteInfo.name} アイコン`}
              width={32}
              height={32}
              className={`w-8 h-8 ${isCobi ? '' : 'brightness-0 invert'}`}
              unoptimized={siteInfo.faviconUrl.endsWith('.svg')}
            />
          )}
          {siteInfo.logoUrl ? (
            <Image
              src={siteInfo.logoUrl}
              alt={siteInfo.name}
              width={120}
              height={32}
              className="h-8 w-auto brightness-0 invert"
              unoptimized={siteInfo.logoUrl.endsWith('.svg')}
            />
          ) : (
            <p className="text-2xl font-bold">{siteInfo.name}</p>
          )}
        </div>
        {siteInfo.description && (
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
            {siteInfo.description}
          </p>
        )}
      </div>

      {/* セクション */}
      {validSections.map((section, index) => (
        <LinkSection key={index} section={section} lang={lang} isLast={index === validSections.length - 1} />
      ))}
    </div>
  );
}

/**
 * 個別のリンクセクションを表示
 */
function LinkSection({ section, lang = 'ja', isLast = false }: { section: FooterTextLinkSection; lang?: Lang; isLast?: boolean }) {
  // 有効なリンク（テキストとURLの両方がある）のみフィルタリング
  const validLinks = section.links?.filter(link => link.text && link.url) || [];

  return (
    <div className={`text-center md:text-right md:border-l border-gray-600 px-8 ${!isLast ? 'pb-8 border-b md:border-b-0' : ''}`}>
      {/* セクションタイトル */}
      {section.title && (
        <h3 className="text-base font-bold mb-4 uppercase tracking-wider">
          {section.title}
        </h3>
      )}

      {/* リンク一覧 */}
      {validLinks.length > 0 && (
        <ul className="space-y-2">
          {validLinks.map((link, index) => {
            // 内部リンクの場合は言語パスを追加
            const href = link.url.startsWith('http') || link.url.startsWith('https')
              ? link.url
              : `/${lang}${link.url}`;
            
            return (
              <li key={index}>
                <Link
                  href={href}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                  target={link.url.startsWith('http') ? '_blank' : undefined}
                  rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {link.text}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}


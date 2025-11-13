import Link from 'next/link';
import { FooterTextLinkSection } from '@/types/theme';

interface FooterTextLinksRendererProps {
  sections: FooterTextLinkSection[];
  className?: string;
}

/**
 * テキストリンクセクションを表示するコンポーネント
 * セクションタイトル + テキストリンクのグループ
 */
export default function FooterTextLinksRenderer({ sections, className = '' }: FooterTextLinksRendererProps) {
  // 有効なセクション（タイトルまたはリンクがある）のみフィルタリング
  const validSections = sections.filter(
    section => section.title || (section.links && section.links.some(link => link.text && link.url))
  );

  if (validSections.length === 0) {
    return null;
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${className}`}>
      {validSections.map((section, index) => (
        <LinkSection key={index} section={section} />
      ))}
    </div>
  );
}

/**
 * 個別のリンクセクションを表示
 */
function LinkSection({ section }: { section: FooterTextLinkSection }) {
  // 有効なリンク（テキストとURLの両方がある）のみフィルタリング
  const validLinks = section.links?.filter(link => link.text && link.url) || [];

  return (
    <div>
      {/* セクションタイトル */}
      {section.title && (
        <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wider">
          {section.title}
        </h3>
      )}

      {/* リンク一覧 */}
      {validLinks.length > 0 && (
        <ul className="space-y-2">
          {validLinks.map((link, index) => (
            <li key={index}>
              <Link
                href={link.url}
                className="text-gray-600 hover:text-blue-600 transition-colors text-sm"
                target={link.url.startsWith('http') ? '_blank' : undefined}
                rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {link.text}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


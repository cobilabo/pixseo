import Image from 'next/image';
import Link from 'next/link';
import { FooterContent } from '@/types/theme';

interface FooterContentRendererProps {
  contents: FooterContent[];
  className?: string;
}

/**
 * フッターコンテンツを表示するコンポーネント
 * 画像 + タイトル + 説明のリッチコンテンツ
 */
export default function FooterContentRenderer({ contents, className = '' }: FooterContentRendererProps) {
  if (contents.length === 0) {
    return null;
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(contents.length, 3)} gap-8 ${className}`}>
      {contents.map((content, index) => (
        <ContentItem key={index} content={content} />
      ))}
    </div>
  );
}

/**
 * 個別のコンテンツアイテムを表示
 */
function ContentItem({ content }: { content: FooterContent }) {
  if (!content.imageUrl) {
    return null;
  }

  const contentElement = (
    <div className="group">
      {/* 画像 */}
      <div className="relative w-full overflow-hidden rounded-lg bg-gray-100 mb-4" style={{ backgroundColor: 'var(--block-background-color, #ffffff)' }}>
        <div className="relative w-full" style={{ paddingBottom: '60%' }}>
          <Image
            src={content.imageUrl}
            alt={content.alt || content.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      </div>

      {/* タイトル */}
      {content.title && (
        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {content.title}
        </h3>
      )}

      {/* 説明 */}
      {content.description && (
        <p className="text-sm text-gray-600 line-clamp-3">
          {content.description}
        </p>
      )}
    </div>
  );

  // リンクがある場合はリンクでラップ
  if (content.linkUrl) {
    return (
      <Link
        href={content.linkUrl}
        className="block transition-opacity hover:opacity-90"
        target={content.linkUrl.startsWith('http') ? '_blank' : undefined}
        rel={content.linkUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {contentElement}
      </Link>
    );
  }

  // リンクがない場合はそのまま表示
  return contentElement;
}


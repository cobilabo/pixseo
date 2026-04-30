import Image from 'next/image';
import Link from 'next/link';
import { FooterContent } from '@/types/theme';
import { Lang } from '@/types/lang';

interface FooterContentRendererProps {
  contents: FooterContent[];
  lang?: Lang;
  className?: string;
}

/**
 * imageUrl のクエリを除いた path で重複コンテンツを排除する。
 * Firebase Storage の署名付き URL は ?GoogleAccessId=... を含むため、
 * URL 文字列の単純比較では重複検知できないケースがある。
 */
function dedupeContents(contents: FooterContent[]): FooterContent[] {
  const seen = new Set<string>();
  return contents.filter((content) => {
    if (!content.imageUrl) return false;
    const key = content.imageUrl.split('?')[0];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * フッターコンテンツを表示するコンポーネント
 * 画像 + タイトル + 説明のリッチコンテンツ（画面横いっぱい、余白なし）
 */
export default function FooterContentRenderer({ contents, lang = 'ja', className = '' }: FooterContentRendererProps) {
  const uniqueContents = dedupeContents(contents);
  if (uniqueContents.length === 0) {
    return null;
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${className}`}>
      {uniqueContents.slice(0, 2).map((content, index) => (
        <ContentItem key={index} content={content} lang={lang} />
      ))}
    </div>
  );
}

/**
 * 個別のコンテンツアイテムを表示
 */
function ContentItem({ content, lang = 'ja' }: { content: FooterContent; lang?: Lang }) {
  if (!content.imageUrl) {
    return null;
  }

  const contentElement = (
    <div className="group relative w-full overflow-hidden" style={{ paddingBottom: '40%' }}>
      {/* 画像 */}
      <Image
        src={content.imageUrl}
        alt={content.alt || content.title}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />

      {/* 半透明の黒フィルター */}
      <div className="absolute inset-0 bg-black bg-opacity-40 transition-opacity group-hover:bg-opacity-30"></div>

      {/* テキストオーバーレイ */}
      <div className="absolute inset-0 flex flex-col justify-center p-8 text-white">
        {/* タイトル */}
        {content.title && (
          <h3 className="text-4xl mb-3" style={{ fontWeight: 600 }}>
            {content.title}
          </h3>
        )}

        {/* 説明 */}
        {content.description && (
          <p className="text-lg opacity-90 line-clamp-2" style={{ fontWeight: 600 }}>
            {content.description}
          </p>
        )}
      </div>
    </div>
  );

  // リンクがある場合はリンクでラップ
  if (content.linkUrl) {
    // 内部リンクの場合は言語パスを追加
    const href = content.linkUrl.startsWith('http') || content.linkUrl.startsWith('https')
      ? content.linkUrl
      : `/${lang}${content.linkUrl}`;
    
    return (
      <Link
        href={href}
        className="block"
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


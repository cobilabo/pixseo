import Image from 'next/image';
import Link from 'next/link';
import { ContentBlock, BannerContent } from '@/types/block';

interface BlockRendererProps {
  blocks: ContentBlock[];
  className?: string;
}

/**
 * ブロックを表示するコンポーネント
 */
export default function BlockRenderer({ blocks, className = '' }: BlockRendererProps) {
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {blocks.map((block) => (
        <BlockItem key={block.id} block={block} />
      ))}
    </div>
  );
}

/**
 * 個別のブロックアイテムを表示
 */
function BlockItem({ block }: { block: ContentBlock }) {
  // 現在はbanner typeのみ対応（将来的に他のtypeも追加可能）
  if (block.type === 'banner') {
    return <BannerBlock block={block} />;
  }

  // 未対応のtypeの場合は何も表示しない
  return null;
}

/**
 * バナーブロックを表示
 */
function BannerBlock({ block }: { block: ContentBlock }) {
  const content = block.content as BannerContent;

  if (!content.imageUrl) {
    return null;
  }

  const imageElement = (
    <div className="relative w-full overflow-hidden rounded-lg bg-gray-100" style={{ backgroundColor: 'var(--block-background-color, #ffffff)' }}>
      <div className="relative w-full" style={{ paddingBottom: '50%' }}>
        <Image
          src={content.imageUrl}
          alt={content.altText || block.title}
          fill
          className="object-cover transition-transform duration-300 hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
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
        {imageElement}
      </Link>
    );
  }

  // リンクがない場合はそのまま表示
  return imageElement;
}


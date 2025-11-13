import Image from 'next/image';
import Link from 'next/link';
import { FooterBlock } from '@/types/theme';

interface BlockRendererProps {
  blocks: FooterBlock[];
  className?: string;
}

/**
 * フッターブロックを表示するコンポーネント
 */
export default function BlockRenderer({ blocks, className = '' }: BlockRendererProps) {
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(blocks.length, 4)} gap-6 ${className}`}>
      {blocks.map((block, index) => (
        <BannerBlock key={index} block={block} />
      ))}
    </div>
  );
}

/**
 * バナーブロックを表示
 */
function BannerBlock({ block }: { block: FooterBlock }) {
  if (!block.imageUrl) {
    return null;
  }

  const imageElement = (
    <div className="relative w-full overflow-hidden rounded-lg bg-gray-100" style={{ backgroundColor: 'var(--block-background-color, #ffffff)' }}>
      <div className="relative w-full" style={{ paddingBottom: '50%' }}>
        <Image
          src={block.imageUrl}
          alt={block.alt || 'バナー画像'}
          fill
          className="object-cover transition-transform duration-300 hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
    </div>
  );

  // リンクがある場合はリンクでラップ
  if (block.linkUrl) {
    return (
      <Link
        href={block.linkUrl}
        className="block transition-opacity hover:opacity-90"
        target={block.linkUrl.startsWith('http') ? '_blank' : undefined}
        rel={block.linkUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {imageElement}
      </Link>
    );
  }

  // リンクがない場合はそのまま表示
  return imageElement;
}


import Image from 'next/image';
import Link from 'next/link';
import { FooterBlock } from '@/types/theme';

interface SidebarBannersProps {
  blocks: FooterBlock[];
}

/**
 * 同一 imageUrl のバナーを重複出力しないよう、imageUrl のクエリを除いたパスでユニーク化する。
 * Firebase Storage の署名付き URL は ?GoogleAccessId=... が付くため、URL 文字列単純比較では
 * 重複が見抜けないケースがある。
 */
function dedupeBlocks(blocks: FooterBlock[]): FooterBlock[] {
  const seen = new Set<string>();
  return blocks.filter((block) => {
    if (!block.imageUrl) return false;
    // クエリを除いた path 部分でユニーク化
    const key = block.imageUrl.split('?')[0];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function SidebarBanners({ blocks }: SidebarBannersProps) {
  const uniqueBlocks = dedupeBlocks(blocks);
  if (uniqueBlocks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {uniqueBlocks.map((block, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
          {block.linkUrl ? (
            <Link 
              href={block.linkUrl} 
              target={block.linkUrl.startsWith('http') ? '_blank' : undefined}
              rel={block.linkUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="block hover:opacity-80 transition-opacity"
            >
              <div className="relative w-full aspect-[16/9]">
                <Image
                  src={block.imageUrl}
                  alt={block.alt || 'バナー'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  loading="lazy"
                />
              </div>
            </Link>
          ) : (
            <div className="relative w-full aspect-[16/9]">
              <Image
                src={block.imageUrl}
                alt={block.alt || 'バナー'}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
                loading="lazy"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


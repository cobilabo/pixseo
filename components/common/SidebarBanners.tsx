import Image from 'next/image';
import Link from 'next/link';
import { Block } from '@/types/theme';

interface SidebarBannersProps {
  blocks: Block[];
}

export default function SidebarBanners({ blocks }: SidebarBannersProps) {
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
          {block.url ? (
            <Link 
              href={block.url} 
              target={block.url.startsWith('http') ? '_blank' : undefined}
              rel={block.url.startsWith('http') ? 'noopener noreferrer' : undefined}
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


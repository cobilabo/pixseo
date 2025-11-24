/**
 * ライターブロックコンポーネント
 */

import { Block, WriterBlockConfig } from '@/types/block';
import { adminDb } from '@/lib/firebase/admin';
import Image from 'next/image';

interface WriterBlockProps {
  block: Block;
}

interface Writer {
  id: string;
  name: string;
  icon?: string;
  bio?: string;
}

async function getWriter(writerId: string): Promise<Writer | null> {
  try {
    const doc = await adminDb.collection('writers').doc(writerId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Writer;
  } catch (error) {
    console.error('Error fetching writer:', error);
    return null;
  }
}

export default async function WriterBlock({ block }: WriterBlockProps) {
  const config = block.config as WriterBlockConfig;
  
  // ライター情報を取得
  const writersData = await Promise.all(
    (config.writers || []).map(async (w) => {
      const writer = await getWriter(w.writerId);
      if (!writer) return null;
      return {
        ...writer,
        jobTitle: w.jobTitle,
      };
    })
  );
  
  const writers = writersData.filter((w): w is NonNullable<typeof w> => w !== null);
  
  if (writers.length === 0) {
    return null;
  }

  const layoutClass = config.layout === 'vertical' 
    ? 'flex flex-col items-center gap-8'
    : 'flex flex-wrap justify-center gap-8';

  return (
    <div className={layoutClass}>
      {writers.map((writer) => (
        <div 
          key={writer.id} 
          className="flex flex-col items-center text-center"
          style={{ width: config.layout === 'vertical' ? '100%' : 'auto' }}
        >
          {/* ライターアイコン（正円） */}
          <div className="relative w-32 h-32 mb-4">
            {writer.icon ? (
              <Image
                src={writer.icon}
                alt={writer.name}
                fill
                className="object-cover rounded-full border-4 border-gray-200"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            )}
          </div>
          
          {/* ライター名 */}
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {writer.name}
          </h3>
          
          {/* 肩書き */}
          <p className="text-sm text-gray-600 mb-2">
            {writer.jobTitle}
          </p>
          
          {/* 経歴（あれば） */}
          {writer.bio && (
            <p className="text-sm text-gray-500 max-w-xs">
              {writer.bio}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}


/**
 * ライターブロックコンポーネント
 */

import { Block, WriterBlockConfig } from '@/types/block';
import { adminDb } from '@/lib/firebase/admin';
import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';

interface WriterBlockProps {
  block: Block;
}

interface Writer {
  id: string;
  handleName: string;
  icon?: string;
  bio?: string;
}

async function getWriter(writerId: string): Promise<Writer | null> {
  try {
    const doc = await adminDb.collection('writers').doc(writerId).get();
    if (!doc.exists) return null;
    const data = doc.data();
    return { 
      id: doc.id, 
      handleName: data?.handleName || '',
      icon: data?.icon,
      bio: data?.bio,
    } as Writer;
  } catch (error) {
    console.error('Error fetching writer:', error);
    return null;
  }
}

export default async function WriterBlock({ block }: WriterBlockProps) {
  const config = block.config as WriterBlockConfig;
  
  // 現在の言語を取得
  const headersList = headers();
  const pathname = headersList.get('x-pathname') || '';
  const lang = pathname.split('/')[1] || 'ja';
  
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

  // スタイル設定
  const jobTitleColor = config.jobTitleColor || '#6B7280';
  const buttonText = config.buttonText || 'VIEW MORE';
  const buttonBackgroundColor = config.buttonBackgroundColor || '#2563EB';
  const borderColor = config.borderColor || '#E5E7EB';

  return (
    <div className={layoutClass}>
      {writers.map((writer) => (
        <div 
          key={writer.id} 
          className="flex flex-col items-center text-center p-6 rounded-lg transition-all hover:shadow-lg"
          style={{ 
            width: config.layout === 'vertical' ? '100%' : 'auto',
            border: `2px solid ${borderColor}`,
          }}
        >
          {/* ライターアイコン（正円） */}
          <div className="relative w-32 h-32 mb-4">
            {writer.icon ? (
              <Image
                src={writer.icon}
                alt={writer.handleName}
                fill
                className="object-cover rounded-full"
                style={{ border: `4px solid ${borderColor}` }}
              />
            ) : (
              <div 
                className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center"
                style={{ border: `4px solid ${borderColor}` }}
              >
                <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            )}
          </div>
          
          {/* ライター名 */}
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {writer.handleName}
          </h3>
          
          {/* 肩書き */}
          <p 
            className="text-sm mb-4"
            style={{ color: jobTitleColor }}
          >
            {writer.jobTitle}
          </p>
          
          {/* VIEW MORE ボタン */}
          <Link 
            href={`/${lang}/writers/${writer.id}`}
            className="px-6 py-2 rounded-lg text-white font-medium text-sm transition-opacity hover:opacity-80"
            style={{ backgroundColor: buttonBackgroundColor }}
          >
            {buttonText}
          </Link>
        </div>
      ))}
    </div>
  );
}


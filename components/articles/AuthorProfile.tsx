import Image from 'next/image';
import Link from 'next/link';
import { Writer } from '@/types/writer';

interface AuthorProfileProps {
  writer: Writer;
}

export default function AuthorProfile({ writer }: AuthorProfileProps) {
  if (!writer) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* 背景画像エリア（上部1/3） */}
      <div className="relative h-24">
        {writer.backgroundImage ? (
          <Image
            src={writer.backgroundImage}
            alt={writer.backgroundImageAlt || writer.handleName}
            fill
            className="object-cover"
          />
        ) : (
          <div 
            className="w-full h-full" 
            style={{ backgroundColor: 'var(--primary-color, #3b82f6)' }}
          />
        )}
      </div>
      
      {/* アイコン（背景画像と白い部分の境界線に配置） */}
      <div className="relative flex justify-center -mt-12">
        {writer.icon ? (
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
            <Image
              src={writer.icon}
              alt={writer.handleName}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center text-gray-500 text-2xl font-bold">
            {writer.handleName.charAt(0)}
          </div>
        )}
      </div>

      {/* 著者情報エリア（下部） */}
      <div className="p-6 pt-4">
        <h3 className="text-lg font-bold text-center mb-3" style={{ color: 'var(--link-text-color, #1f2937)' }}>
          {writer.handleName}
        </h3>
        {writer.bio && (
          <p className="text-sm text-gray-600 leading-relaxed text-center mb-4">
            {writer.bio}
          </p>
        )}
        <Link 
          href={`/writers/${writer.id}`}
          className="block"
        >
          <button 
            className="w-full py-2 px-4 rounded-full font-medium text-sm transition-colors"
            style={{ 
              border: '2px solid var(--border-color, #e5e7eb)',
              color: 'var(--link-text-color, #1f2937)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-color, #3b82f6)';
              e.currentTarget.style.borderColor = 'var(--primary-color, #3b82f6)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'var(--border-color, #e5e7eb)';
              e.currentTarget.style.color = 'var(--link-text-color, #1f2937)';
            }}
          >
            VIEW MORE
          </button>
        </Link>
      </div>
    </div>
  );
}


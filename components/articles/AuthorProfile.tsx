import Image from 'next/image';
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
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500" />
        )}
        
        {/* アイコン（背景画像の上に中央配置） */}
        <div className="absolute inset-0 flex items-center justify-center">
          {writer.icon ? (
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-lg">
              <Image
                src={writer.icon}
                alt={writer.handleName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center text-gray-500 text-xl font-bold">
              {writer.handleName.charAt(0)}
            </div>
          )}
        </div>
      </div>

      {/* 著者情報エリア（下部） */}
      <div className="p-6 pt-10">
        <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">
          {writer.handleName}
        </h3>
        {writer.bio && (
          <p className="text-sm text-gray-600 leading-relaxed text-center">
            {writer.bio}
          </p>
        )}
      </div>
    </div>
  );
}


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
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex items-start gap-4">
        {/* 著者アイコン */}
        <div className="flex-shrink-0">
          {writer.icon ? (
            <div className="relative w-16 h-16 rounded-full overflow-hidden">
              <Image
                src={writer.icon}
                alt={writer.handleName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xl font-bold">
              {writer.handleName.charAt(0)}
            </div>
          )}
        </div>

        {/* 著者情報 */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {writer.handleName}
          </h3>
          {writer.bio && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {writer.bio}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}


import { headers } from 'next/headers';
import PreviewBadge from '@/components/PreviewBadge';

/**
 * フロントエンド（公開サイト）用のレイアウト
 * プレビューモード時にバッジを表示
 */
export default async function LangLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // プレビューモードかどうかを判定
  const headersList = headers();
  const host = headersList.get('host') || '';
  const isPreview = host.endsWith('.pixseo-preview.cloud');

  return (
    <>
      {children}
      {isPreview && <PreviewBadge />}
    </>
  );
}


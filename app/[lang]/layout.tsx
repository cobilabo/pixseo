import { headers } from 'next/headers';
import { Suspense } from 'react';
import PreviewBadge from '@/components/PreviewBadge';
import ScriptInjector from '@/components/common/ScriptInjector';
import { getMediaIdFromHost } from '@/lib/firebase/media-tenant-helper';
import { getTheme } from '@/lib/firebase/theme-helper';

/**
 * フロントエンド（公開サイト）用のレイアウト
 * プレビューモード時にバッジを表示
 * テーマ設定のスクリプトを挿入
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

  // テーマ設定からスクリプトを取得
  const mediaId = await getMediaIdFromHost();
  const theme = mediaId ? await getTheme(mediaId) : null;
  const scripts = theme?.scripts || [];

  return (
    <>
      {/* Head用スクリプト */}
      {scripts.length > 0 && (
        <Suspense fallback={null}>
          <ScriptInjector scripts={scripts} position="head" />
        </Suspense>
      )}
      
      {children}
      
      {/* Body末尾用スクリプト */}
      {scripts.length > 0 && (
        <Suspense fallback={null}>
          <ScriptInjector scripts={scripts} position="body" />
        </Suspense>
      )}
      
      {isPreview && <PreviewBadge />}
    </>
  );
}


import { headers } from 'next/headers';

/**
 * 公開サイトのオリジン（プロトコル + ホスト）を取得する。
 *
 * 解決順:
 * 1. リクエストの host ヘッダ（マルチテナントで適切なドメインを返す）
 * 2. 環境変数 NEXT_PUBLIC_SITE_URL（ビルド時 / Functions ランタイム）
 * 3. 最終フォールバック https://the-ayumi.jp
 *
 * 注意: このヘルパーは Server Components / Route Handlers / generateMetadata 等
 *       Next.js のサーバー側でのみ呼び出すこと。クライアントから呼ばないこと。
 */
export function getSiteOrigin(): string {
  try {
    const headersList = headers();
    const host = headersList.get('host');
    if (host) {
      const proto = headersList.get('x-forwarded-proto') || 'https';
      return `${proto}://${host}`;
    }
  } catch {
    // headers() がコンテキスト外で呼ばれた場合は env / フォールバックに進む
  }

  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  return 'https://the-ayumi.jp';
}

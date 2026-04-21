/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: false, // Vercelの画像最適化を有効化
    domains: ['the-ayumi.jp', 'firebasestorage.googleapis.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.the-ayumi.jp',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.firebaseapp.com',
      },
      {
        protocol: 'https',
        hostname: '**.web.app',
      },
      {
        protocol: 'https',
        hostname: '**.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '**.firebasestorage.app',
      },
      {
        protocol: 'https',
        hostname: 'secure.gravatar.com',
      },
      {
        protocol: 'https',
        hostname: '**.gravatar.com',
      },
    ],
  },
  // 環境変数をビルド時に埋め込む
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDi8DiIdhLCJO9bXAzBGdeKwBBi7gYPXHs',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'ayumi-f6bd2.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ayumi-f6bd2',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'ayumi-f6bd2.firebasestorage.app',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '561071971625',
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:561071971625:web:0e382383fbb444c0066b38',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://the-ayumi.jp',
    NEXT_PUBLIC_MEDIA_BASE_PATH: process.env.NEXT_PUBLIC_MEDIA_BASE_PATH || '/media',
  },
  // 静的エクスポート時はredirectsは使用できないためコメントアウト
  // async redirects() {
  //   return [];
  // },
  // トレーリングスラッシュを統一
  trailingSlash: true,
  // キャッシュ制御ヘッダー（SEO + パフォーマンス最適化）
  async headers() {
    return [
      {
        // すべてのページ：Instagram埋め込みの警告を抑制
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'unload=()',
          },
        ],
      },
      {
        // 記事詳細ページ: 1時間キャッシュ + 1日 SWR（revalidatePath で即時更新）
        source: '/:lang(ja|en|zh|ko)/articles/:slug+',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // カテゴリー・タグページ: 30分キャッシュ + 1日 SWR
        source: '/:lang(ja|en|zh|ko)/:path(categories|tags)/:slug+',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=1800, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // ライター詳細ページ: 1時間キャッシュ
        source: '/:lang(ja|en|zh|ko)/writers/:id+',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // 記事一覧ページ: 10分キャッシュ + 1時間 SWR
        source: '/:lang(ja|en|zh|ko)/articles',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=600, stale-while-revalidate=3600',
          },
        ],
      },
      {
        // 言語トップページ: 5分キャッシュ + 1時間 SWR
        source: '/:lang(ja|en|zh|ko)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=3600',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig


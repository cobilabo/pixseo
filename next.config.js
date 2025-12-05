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
        // 記事ページ：5分キャッシュ + stale-while-revalidate
        source: '/media/articles/:slug*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=60',
          },
        ],
      },
      {
        // カテゴリー・タグページ：5分キャッシュ
        source: '/media/:path(categories|tags)/:slug*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=60',
          },
        ],
      },
      {
        // トップページ・記事一覧：1分キャッシュ（常に新鮮）
        source: '/media/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=30',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig


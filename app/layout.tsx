import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import LangSync from "@/components/common/LangSync";
import "./globals.css";

// フォント最適化（パフォーマンス向上）
const notoSansJP = Noto_Sans_JP({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap', // FOUTを避けるための設定
  variable: '--font-noto-sans-jp',
  preload: true,
});

export const metadata: Metadata = {
  title: "PixSEO",
  description: "マルチメディア対応SEOプラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={notoSansJP.className}>
        <LangSync />
        {children}
      </body>
    </html>
  );
}



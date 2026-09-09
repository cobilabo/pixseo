import type { Metadata } from "next";
import { headers } from "next/headers";
import { Noto_Sans_JP } from "next/font/google";
import LangSync from "@/components/common/LangSync";
import { DEFAULT_LANG, Lang, isValidLang } from "@/types/lang";
import "./globals.css";

function langFromRequestHeaders(): Lang {
  const headerList = headers();
  const explicit = headerList.get('x-pathname-lang');
  if (explicit && isValidLang(explicit)) {
    return explicit;
  }

  for (const raw of [
    headerList.get('x-url'),
    headerList.get('x-invoke-path'),
    headerList.get('next-url'),
    headerList.get('x-forwarded-uri'),
  ]) {
    if (!raw) continue;
    try {
      const path = raw.startsWith('http') ? new URL(raw).pathname : raw;
      const seg = path.split('/').filter(Boolean)[0];
      if (seg && isValidLang(seg)) {
        return seg;
      }
    } catch {
      // ignore malformed header values
    }
  }

  return DEFAULT_LANG;
}

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
  const lang = langFromRequestHeaders();

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className={notoSansJP.className}>
        <LangSync />
        {children}
      </body>
    </html>
  );
}



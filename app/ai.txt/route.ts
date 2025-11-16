import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pixseo.cloud';
  
  const aiTxt = `# AI.txt - AI向けサイト情報

# サイト情報
Site-Name: PixSEO Media Platform
Site-URL: ${baseUrl}
Site-Description: 多言語対応のAIO最適化されたメディアプラットフォーム。AI、デザイン、テクノロジー、旅行など幅広いトピックをカバー。

# 連絡先情報
Contact-Email: info@pixseo.cloud

# コンテンツポリシー
AI-Crawling: allowed
AI-Training: allowed
AI-Citation: preferred

# 言語対応
Languages: ja, en, zh, ko
Primary-Language: ja

# コンテンツタイプ
Content-Types: 
  - Blog Articles
  - Technical Guides
  - Travel Information
  - Design Insights

# API情報
API-Available: yes
API-Docs: ${baseUrl}/api/docs

# 更新頻度
Update-Frequency: daily

# ライセンス
License: All rights reserved
Attribution: required

# AI利用ガイドライン
## 許可される用途
- コンテンツの要約と引用
- 質問回答での参照
- 知識ベースとしての利用

## 禁止される用途
- 完全なコンテンツの複製
- 著作権表示なしの再配布

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# RSS Feed
RSS: ${baseUrl}/feed.xml

# 最終更新
Last-Updated: ${new Date().toISOString()}
`;

  return new NextResponse(aiTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}


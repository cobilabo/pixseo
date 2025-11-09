import { TableOfContentsItem } from '@/types/article';

/**
 * HTML本文から目次を自動生成
 */
export function generateTableOfContents(content: string): TableOfContentsItem[] {
  if (typeof window === 'undefined') {
    // サーバーサイドの場合は正規表現で解析
    const headingRegex = /<(h[234])[^>]*>(.*?)<\/\1>/gi;
    const toc: TableOfContentsItem[] = [];
    let match;
    let index = 0;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = parseInt(match[1].substring(1)); // h2 -> 2
      const text = match[2].replace(/<[^>]*>/g, '').trim(); // HTMLタグを除去
      
      toc.push({
        id: `heading-${index}`,
        level,
        text,
      });
      
      index++;
    }

    return toc;
  }

  // クライアントサイドの場合はDOMParserを使用
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const headings = doc.querySelectorAll('h2, h3, h4');

  return Array.from(headings).map((h, i) => ({
    id: `heading-${i}`,
    level: parseInt(h.tagName.substring(1)),
    text: h.textContent?.trim() || '',
  }));
}

/**
 * HTML本文から読了時間を計算（分）
 * 日本語：平均400-600文字/分 → 500文字/分で計算
 */
export function calculateReadingTime(content: string): number {
  if (!content) return 0;

  // HTMLタグを除去
  const text = content.replace(/<[^>]*>/g, '');
  
  // 文字数をカウント
  const charCount = text.length;
  
  // 読了時間を計算（最低1分）
  const minutes = Math.max(1, Math.ceil(charCount / 500));
  
  return minutes;
}

/**
 * 目次付きHTMLを生成（見出しにIDを付与）
 */
export function addIdsToHeadings(content: string, toc: TableOfContentsItem[]): string {
  let result = content;
  
  toc.forEach((item) => {
    const levelTag = `h${item.level}`;
    // 最初に見つかった該当見出しにIDを付与
    const regex = new RegExp(`<${levelTag}([^>]*)>(${escapeRegex(item.text)})<\/${levelTag}>`, 'i');
    result = result.replace(regex, `<${levelTag} id="${item.id}"$1>$2</${levelTag}>`);
  });
  
  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


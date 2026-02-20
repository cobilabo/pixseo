/**
 * HTMLブロックコンポーネント
 */

import { Block, HTMLBlockConfig } from '@/types/block';
import { Lang } from '@/types/lang';
import { localizeHtmlLinks } from '@/lib/i18n/localize-html';

interface HTMLBlockProps {
  block: Block;
  lang?: Lang;
}

export default function HTMLBlock({ block, lang = 'ja' }: HTMLBlockProps) {
  const config = block.config as HTMLBlockConfig;
  const langKey = `html_${lang}` as string;
  const raw = (lang !== 'ja' && (config as any)[langKey]) ? (config as any)[langKey] : config.html;
  const html = localizeHtmlLinks(raw, lang);
  
  return (
    <div
      className="custom-html-block"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}


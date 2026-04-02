'use client';

import { Block, RowBlockConfig, FormBlockConfig } from '@/types/block';
import { Lang } from '@/types/lang';
import { localizeHtmlLinks } from '@/lib/i18n/localize-html';
import FormBlock from './FormBlock';

interface RowBlockProps {
  block: Block;
  lang?: Lang;
  layoutTheme?: string;
}

export default function RowBlock({ block, lang = 'ja', layoutTheme }: RowBlockProps) {
  const config = block.config as RowBlockConfig;
  const gap = config.gap ?? 40;
  const columns = config.columns || [];

  return (
    <div
      className="row-block"
      style={{
        display: 'flex',
        gap: `${gap}px`,
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '0 20px',
        flexWrap: config.responsive !== false ? 'wrap' : 'nowrap',
      }}
    >
      {columns.map((col, i) => (
        <div
          key={i}
          className="row-block-column"
          style={{
            flex: '1 1 300px',
            minWidth: 0,
          }}
        >
          {col.type === 'form' && col.formId ? (
            <FormBlock
              block={{
                ...block,
                id: `${block.id}-col-${i}`,
                type: 'form',
                config: {
                  formId: col.formId,
                  showTitle: true,
                } as FormBlockConfig,
              }}
              lang={lang}
              layoutTheme={layoutTheme}
            />
          ) : col.html ? (
            <div dangerouslySetInnerHTML={{ __html: localizeHtmlLinks((lang !== 'ja' && (col as any)[`html_${lang}`]) ? (col as any)[`html_${lang}`] : col.html, lang) }} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

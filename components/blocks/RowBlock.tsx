'use client';

import { Block, RowBlockConfig, FormBlockConfig } from '@/types/block';
import FormBlock from './FormBlock';

interface RowBlockProps {
  block: Block;
}

export default function RowBlock({ block }: RowBlockProps) {
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
            />
          ) : col.html ? (
            <div dangerouslySetInnerHTML={{ __html: col.html }} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

import { Block, HTMLBlockConfig, ContentBlockConfig, CustomBlockConfig, SpacerBlockConfig } from '@/types/block';
import { PageCompareData } from './diff-utils';
import { getCustomBlockById } from '@/lib/firebase/custom-blocks-admin';

const BLOCK_DIFF_STYLES = `
  .preview-block { margin-bottom: 12px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  .preview-block-header { background: #f3f4f6; padding: 6px 12px; font-size: 12px; color: #6b7280; font-family: monospace; }
  .preview-block-body { padding: 12px; }
  .preview-placeholder { background: #f9fafb; border: 1px dashed #d1d5db; padding: 16px; border-radius: 6px; color: #6b7280; font-size: 13px; }
  .preview-spacer { background: repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 10px, #e5e7eb 10px, #e5e7eb 20px); }
`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderHtmlBlock(config: HTMLBlockConfig): string {
  return config.html || '<p class="preview-placeholder">(HTML not set)</p>';
}

function renderContentBlock(config: ContentBlockConfig): string {
  const parts: string[] = [];
  if (config.showHeading && config.heading) {
    parts.push(`<h2 style="font-size:${config.headingFontSize || 1.5}rem">${escapeHtml(config.heading)}</h2>`);
  }
  if (config.showText && config.description) {
    parts.push(`<p>${escapeHtml(config.description)}</p>`);
  }
  if (config.showImage && config.imageUrl) {
    parts.push(`<img src="${escapeHtml(config.imageUrl)}" alt="${escapeHtml(config.imageAlt || '')}" style="max-width:100%" />`);
  }
  if (config.showButtons && config.buttons?.length) {
    parts.push('<div>' + config.buttons.map((b) =>
      b.type === 'image' && b.imageUrl
        ? `<img src="${escapeHtml(b.imageUrl)}" alt="" style="max-height:40px;margin:4px" />`
        : `<span style="display:inline-block;padding:8px 16px;background:#3b82f6;color:#fff;border-radius:6px;margin:4px">${escapeHtml(b.text || '')}</span>`
    ).join('') + '</div>');
  }
  return parts.length ? parts.join('') : '<p class="preview-placeholder">(Section content not set)</p>';
}

function renderSpacerBlock(config: SpacerBlockConfig): string {
  const h = config.height || 40;
  return `<div class="preview-spacer" style="height:${h}px"></div>`;
}

function renderPlaceholderBlock(type: string, config: Record<string, unknown>): string {
  const summary = Object.entries(config)
    .filter(([k, v]) => v !== undefined && v !== '' && v !== false && k !== 'customBlockName')
    .slice(0, 5)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join('<br>');
  return `<div class="preview-placeholder"><strong>${type}</strong> block<br>${summary || '(no settings)'}</div>`;
}

async function renderBlock(block: Block): Promise<string> {
  const header = `<div class="preview-block-header">${block.type} (order: ${block.order})</div>`;
  let body = '';

  switch (block.type) {
    case 'html':
      body = renderHtmlBlock(block.config as HTMLBlockConfig);
      break;
    case 'content':
      body = renderContentBlock(block.config as ContentBlockConfig);
      break;
    case 'spacer':
      body = renderSpacerBlock(block.config as SpacerBlockConfig);
      break;
    case 'custom': {
      const config = block.config as CustomBlockConfig;
      const cb = await getCustomBlockById(config.customBlockId);
      if (cb) {
        body = (cb.css ? `<style>${cb.css}</style>` : '') + (cb.html || '');
      } else {
        body = `<div class="preview-placeholder">Custom block: ${escapeHtml(config.customBlockName || config.customBlockId)} (not found)</div>`;
      }
      break;
    }
    default:
      body = renderPlaceholderBlock(block.type, block.config as Record<string, unknown>);
  }

  return `<div class="preview-block">${header}<div class="preview-block-body">${body}</div></div>`;
}

export async function buildPagePreviewHtml(
  data: PageCompareData,
  blockDiffClasses?: Map<string, string>
): Promise<string> {
  const { formData, blocks } = data;
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const blockHtmlParts = await Promise.all(
    sorted.map(async (block) => {
      const rendered = await renderBlock(block);
      const diffClass = blockDiffClasses?.get(block.id) || '';
      if (diffClass) {
        return rendered.replace('class="preview-block"', `class="preview-block ${diffClass}"`);
      }
      return rendered;
    })
  );

  const pageStyles = formData.customCss ? `<style>${formData.customCss}</style>` : '';
  const bgStyle = formData.backgroundColor ? `background-color:${formData.backgroundColor};` : '';
  const textStyle = formData.textColor ? `color:${formData.textColor};` : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; ${bgStyle}${textStyle} }
  ${BLOCK_DIFF_STYLES}
  .diff-added-block { border-color: #4ade80 !important; background: #f0fdf4 !important; }
  .diff-removed-block { border-color: #f87171 !important; background: #fef2f2 !important; }
  .diff-changed-block { border-color: #fbbf24 !important; background: #fffbeb !important; }
  ${pageStyles}
</style>
</head>
<body>
  <div style="margin-bottom:16px;padding:8px 12px;background:#f3f4f6;border-radius:6px;font-size:13px">
    <strong>${escapeHtml(formData.title)}</strong> / ${escapeHtml(formData.slug)}
  </div>
  ${blockHtmlParts.join('')}
</body>
</html>`;
}

export function buildBlockDiffClassMap(
  blocks: Block[],
  diffs: { block: Block | null; status: string }[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const d of diffs) {
    if (!d.block) continue;
    if (d.status === 'added') map.set(d.block.id, 'diff-added-block');
    else if (d.status === 'removed') map.set(d.block.id, 'diff-removed-block');
    else if (d.status === 'changed') map.set(d.block.id, 'diff-changed-block');
  }
  return map;
}

import { diffLines, diffWords, Change } from 'diff';
import { Block } from '@/types/block';
import { Page } from '@/types/page';

export interface CustomBlockCompareData {
  name: string;
  html: string;
  css: string;
}

export interface PageCompareData {
  formData: {
    title: string;
    slug: string;
    excerpt?: string;
    metaTitle?: string;
    metaDescription?: string;
    backgroundColor?: string;
    textColor?: string;
    showPanel?: boolean;
    panelColor?: string;
    customCss?: string;
    layoutMode?: string;
    showGlobalNav?: boolean;
    showSidebar?: boolean;
    faviconUrl?: string;
    isPublished?: boolean;
    order?: number;
  };
  blocks: Block[];
}

export function customBlockToSourceText(data: CustomBlockCompareData): string {
  return [
    '=== NAME ===',
    data.name,
    '',
    '=== HTML ===',
    data.html,
    '',
    '=== CSS ===',
    data.css || '',
  ].join('\n');
}

export function pageToSourceText(data: PageCompareData): string {
  const settings = data.formData;
  const settingsText = [
    '=== PAGE SETTINGS ===',
    `title: ${settings.title}`,
    `slug: ${settings.slug}`,
    `excerpt: ${settings.excerpt || ''}`,
    `metaTitle: ${settings.metaTitle || ''}`,
    `metaDescription: ${settings.metaDescription || ''}`,
    `backgroundColor: ${settings.backgroundColor || ''}`,
    `textColor: ${settings.textColor || ''}`,
    `showPanel: ${settings.showPanel ?? true}`,
    `panelColor: ${settings.panelColor || ''}`,
    `layoutMode: ${settings.layoutMode || 'default'}`,
    `showGlobalNav: ${settings.showGlobalNav || false}`,
    `showSidebar: ${settings.showSidebar || false}`,
    `customCss: ${settings.customCss || ''}`,
    `faviconUrl: ${settings.faviconUrl || ''}`,
    `isPublished: ${settings.isPublished || false}`,
    `order: ${settings.order ?? 0}`,
    '',
  ].join('\n');

  const blocksText = '=== BLOCKS (JSON) ===\n' + JSON.stringify(data.blocks, null, 2);
  return settingsText + blocksText;
}

export function computeLineDiff(before: string, after: string): Change[] {
  return diffLines(before, after);
}

export function applyWordDiffHighlight(before: string, after: string): { beforeHtml: string; afterHtml: string } {
  const changes = diffWords(before, after);
  let beforeHtml = '';
  let afterHtml = '';

  for (const part of changes) {
    const escaped = escapeHtml(part.value);
    if (part.added) {
      afterHtml += `<mark class="diff-added">${escaped}</mark>`;
    } else if (part.removed) {
      beforeHtml += `<mark class="diff-removed">${escaped}</mark>`;
    } else {
      beforeHtml += escaped;
      afterHtml += escaped;
    }
  }

  return { beforeHtml, afterHtml };
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildCustomBlockSrcdoc(html: string, css: string, highlightHtml?: string): string {
  const bodyContent = highlightHtml ?? html;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; }
  mark.diff-added { background: #bbf7d0; padding: 0 2px; }
  mark.diff-removed { background: #fecaca; padding: 0 2px; text-decoration: line-through; }
  ${css}
</style>
</head>
<body>${bodyContent}</body>
</html>`;
}

export function pageSnapshotToCompareData(page: Omit<Page, 'id'> | Page): PageCompareData {
  const p = page as Page;
  return {
    formData: {
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      backgroundColor: p.backgroundColor,
      textColor: p.textColor,
      showPanel: p.showPanel,
      panelColor: p.panelColor,
      customCss: p.customCss,
      layoutMode: p.layoutMode,
      showGlobalNav: p.showGlobalNav,
      showSidebar: p.showSidebar,
      faviconUrl: p.faviconUrl,
      isPublished: p.isPublished,
      order: p.order,
    },
    blocks: p.blocks || [],
  };
}

export type BlockDiffStatus = 'added' | 'removed' | 'changed' | 'unchanged';

export interface BlockDiffInfo {
  block: Block | null;
  status: BlockDiffStatus;
  beforeBlock?: Block;
}

export function computeBlockDiffs(beforeBlocks: Block[], afterBlocks: Block[]): {
  before: BlockDiffInfo[];
  after: BlockDiffInfo[];
} {
  const beforeMap = new Map(beforeBlocks.map((b) => [b.id, b]));
  const afterMap = new Map(afterBlocks.map((b) => [b.id, b]));

  const beforeResult: BlockDiffInfo[] = [];
  const afterResult: BlockDiffInfo[] = [];

  for (const block of beforeBlocks) {
    const afterBlock = afterMap.get(block.id);
    if (!afterBlock) {
      beforeResult.push({ block, status: 'removed' });
    } else {
      const changed = JSON.stringify(block) !== JSON.stringify(afterBlock);
      beforeResult.push({ block, status: changed ? 'changed' : 'unchanged', beforeBlock: block });
    }
  }

  for (const block of afterBlocks) {
    const beforeBlock = beforeMap.get(block.id);
    if (!beforeBlock) {
      afterResult.push({ block, status: 'added' });
    } else {
      const changed = JSON.stringify(beforeBlock) !== JSON.stringify(block);
      afterResult.push({ block, status: changed ? 'changed' : 'unchanged', beforeBlock });
    }
  }

  return { before: beforeResult, after: afterResult };
}

export function blockDiffBorderClass(status: BlockDiffStatus, highlight: boolean): string {
  if (!highlight) return 'border-gray-200';
  switch (status) {
    case 'added': return 'border-green-400 bg-green-50';
    case 'removed': return 'border-red-400 bg-red-50';
    case 'changed': return 'border-amber-400 bg-amber-50';
    default: return 'border-gray-200';
  }
}

'use client';

import { computeLineDiff, escapeHtml } from './diff-utils';

interface SourceDiffViewProps {
  beforeText: string;
  afterText: string;
  highlight: boolean;
}

function renderHighlightedDiff(beforeText: string, afterText: string) {
  const changes = computeLineDiff(beforeText, afterText);
  let beforeHtml = '';
  let afterHtml = '';

  for (const part of changes) {
    const lines = escapeHtml(part.value).split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const suffix = i < lines.length - 1 ? '\n' : '';
      if (part.added) {
        afterHtml += `<div style="white-space:pre-wrap;word-break:break-all;background:#dcfce7">${line}${suffix}</div>`;
      } else if (part.removed) {
        beforeHtml += `<div style="white-space:pre-wrap;word-break:break-all;background:#fee2e2;text-decoration:line-through">${line}${suffix}</div>`;
      } else {
        beforeHtml += `<div style="white-space:pre-wrap;word-break:break-all">${line}${suffix}</div>`;
        afterHtml += `<div style="white-space:pre-wrap;word-break:break-all">${line}${suffix}</div>`;
      }
    }
  }

  return { beforeHtml, afterHtml };
}

export default function SourceDiffView({ beforeText, afterText, highlight }: SourceDiffViewProps) {
  const { beforeHtml, afterHtml } = highlight
    ? renderHighlightedDiff(beforeText, afterText)
    : {
        beforeHtml: escapeHtml(beforeText).split('\n').map((l) => `<div style="white-space:pre-wrap;word-break:break-all">${l}</div>`).join(''),
        afterHtml: escapeHtml(afterText).split('\n').map((l) => `<div style="white-space:pre-wrap;word-break:break-all">${l}</div>`).join(''),
      };

  return (
    <div className="grid grid-cols-2 gap-4 h-full min-h-0">
      <div className="flex flex-col min-h-0">
        <div className="text-sm font-medium text-gray-600 mb-2">雩蚾苩劦</div>
        <div
          className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs leading-relaxed"
          dangerouslySetInnerHTML={{ __html: beforeHtml }}
        />
      </div>
      <div className="flex flex-col min-h-0">
        <div className="text-sm font-medium text-gray-600 mb-2">雩蚾蛨徜</div>
        <div
          className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs leading-relaxed"
          dangerouslySetInnerHTML={{ __html: afterHtml }}
        />
      </div>
    </div>
  );
}

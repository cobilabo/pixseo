'use client';

import { computeLineDiff } from './diff-utils';

interface SourceDiffViewProps {
  beforeText: string;
  afterText: string;
  highlight: boolean;
  beforeLabel?: string;
  afterLabel?: string;
}

type PaneLine = {
  number: number | null;
  text: string;
  type: 'added' | 'removed' | 'context' | 'empty';
};

function splitDiffLines(value: string): string[] {
  const lines = value.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

function buildSideBySideLines(beforeText: string, afterText: string, highlight: boolean): { before: PaneLine[]; after: PaneLine[] } {
  if (!highlight) {
    return {
      before: beforeText.split('\n').map((text, i) => ({ number: i + 1, text, type: 'context' as const })),
      after: afterText.split('\n').map((text, i) => ({ number: i + 1, text, type: 'context' as const })),
    };
  }

  const changes = computeLineDiff(beforeText, afterText);
  const before: PaneLine[] = [];
  const after: PaneLine[] = [];
  let beforeNum = 1;
  let afterNum = 1;

  for (const part of changes) {
    for (const line of splitDiffLines(part.value)) {
      if (part.added) {
        before.push({ number: null, text: '', type: 'empty' });
        after.push({ number: afterNum++, text: line, type: 'added' });
      } else if (part.removed) {
        before.push({ number: beforeNum++, text: line, type: 'removed' });
        after.push({ number: null, text: '', type: 'empty' });
      } else {
        before.push({ number: beforeNum++, text: line, type: 'context' });
        after.push({ number: afterNum++, text: line, type: 'context' });
      }
    }
  }

  return { before, after };
}

function lineBg(type: PaneLine['type']): string {
  switch (type) {
    case 'added':
      return 'bg-green-100';
    case 'removed':
      return 'bg-red-100';
    case 'empty':
      return 'bg-gray-50';
    default:
      return 'bg-white';
  }
}

function SourcePane({ label, lines }: { label: string; lines: PaneLine[] }) {
  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="text-sm font-medium text-gray-700 mb-2">{label}</div>
      <div
        className="flex-1 overflow-auto rounded-lg border border-gray-300 bg-white font-mono text-xs leading-5"
        style={{ color: '#000000' }}
      >
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className={lineBg(line.type)}>
                <td
                  className="w-12 select-none text-right pr-3 pl-2 align-top border-r border-gray-200"
                  style={{ color: '#9ca3af' }}
                >
                  {line.number ?? ''}
                </td>
                <td
                  className={
                    'pl-3 pr-3 whitespace-pre-wrap break-all align-top ' +
                    (line.type === 'removed' ? 'line-through' : '')
                  }
                  style={{ color: '#000000' }}
                >
                  {line.text.length === 0 ? '\u00a0' : line.text}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SourceDiffView({
  beforeText,
  afterText,
  highlight,
  beforeLabel = '\u7de8\u96c6\u524d',
  afterLabel = '\u7de8\u96c6\u5f8c',
}: SourceDiffViewProps) {
  const { before, after } = buildSideBySideLines(beforeText, afterText, highlight);

  return (
    <div className="grid grid-cols-2 gap-4 h-full min-h-0">
      <SourcePane label={beforeLabel} lines={before} />
      <SourcePane label={afterLabel} lines={after} />
    </div>
  );
}

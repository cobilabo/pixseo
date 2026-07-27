'use client';

import { useEffect, useState } from 'react';
import AdminPreviewFrame, { PreviewDevice } from './AdminPreviewFrame';
import {
  CustomBlockCompareData,
  PageCompareData,
  applyWordDiffHighlight,
  buildCustomBlockSrcdoc,
  computeBlockDiffs,
} from './diff-utils';
import { buildPagePreviewHtml, buildBlockDiffClassMap } from './page-preview-utils';

export type CompareContentType = 'customBlock' | 'page';

interface VisualComparePaneProps {
  contentType: CompareContentType;
  beforeData: CustomBlockCompareData | PageCompareData;
  afterData: CustomBlockCompareData | PageCompareData;
  device: PreviewDevice;
  highlight: boolean;
  beforeLabel?: string;
  afterLabel?: string;
}

export default function VisualComparePane({
  contentType,
  beforeData,
  afterData,
  device,
  highlight,
  beforeLabel = '雩蚾苩劦',
  afterLabel = '雩蚾蛨徜',
}: VisualComparePaneProps) {
  const [beforeSrcdoc, setBeforeSrcdoc] = useState('');
  const [afterSrcdoc, setAfterSrcdoc] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function build() {
      setLoading(true);
      try {
        if (contentType === 'customBlock') {
          const before = beforeData as CustomBlockCompareData;
          const after = afterData as CustomBlockCompareData;

          let beforeHtml = before.html;
          let afterHtml = after.html;

          if (highlight) {
            const diffed = applyWordDiffHighlight(before.html, after.html);
            beforeHtml = diffed.beforeHtml;
            afterHtml = diffed.afterHtml;
          }

          if (!cancelled) {
            setBeforeSrcdoc(buildCustomBlockSrcdoc(before.html, before.css, highlight ? beforeHtml : undefined));
            setAfterSrcdoc(buildCustomBlockSrcdoc(after.html, after.css, highlight ? afterHtml : undefined));
          }
        } else {
          const before = beforeData as PageCompareData;
          const after = afterData as PageCompareData;

          let beforeDiffMap: Map<string, string> | undefined;
          let afterDiffMap: Map<string, string> | undefined;

          if (highlight) {
            const diffs = computeBlockDiffs(before.blocks, after.blocks);
            beforeDiffMap = buildBlockDiffClassMap(before.blocks, diffs.before);
            afterDiffMap = buildBlockDiffClassMap(after.blocks, diffs.after);
          }

          const [beforeDoc, afterDoc] = await Promise.all([
            buildPagePreviewHtml(before, beforeDiffMap),
            buildPagePreviewHtml(after, afterDiffMap),
          ]);

          if (!cancelled) {
            setBeforeSrcdoc(beforeDoc);
            setAfterSrcdoc(afterDoc);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    build();
    return () => { cancelled = true; };
  }, [contentType, beforeData, afterData, device, highlight]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 h-full min-h-0">
      <AdminPreviewFrame srcdoc={beforeSrcdoc} device={device} label={beforeLabel} />
      <AdminPreviewFrame srcdoc={afterSrcdoc} device={device} label={afterLabel} />
    </div>
  );
}

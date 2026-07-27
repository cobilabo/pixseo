'use client';

import { useMemo, useState } from 'react';
import VisualComparePane, { CompareContentType } from './VisualComparePane';
import SourceDiffView from './SourceDiffView';
import { PreviewDevice } from './AdminPreviewFrame';
import {
  CustomBlockCompareData,
  PageCompareData,
  customBlockToSourceText,
  pageToSourceText,
} from './diff-utils';

type CompareTab = 'visual' | 'source';

interface ContentCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: CompareContentType;
  beforeData: CustomBlockCompareData | PageCompareData;
  afterData: CustomBlockCompareData | PageCompareData;
  beforeLabel?: string;
  afterLabel?: string;
}

export default function ContentCompareModal({
  isOpen,
  onClose,
  contentType,
  beforeData,
  afterData,
  beforeLabel = '\u7de8\u96c6\u524d',
  afterLabel = '\u7de8\u96c6\u5f8c',
}: ContentCompareModalProps) {
  const [activeTab, setActiveTab] = useState<CompareTab>('visual');
  const [device, setDevice] = useState<PreviewDevice>('pc');
  const [highlight, setHighlight] = useState(true);

  const beforeText = useMemo(() => {
    return contentType === 'customBlock'
      ? customBlockToSourceText(beforeData as CustomBlockCompareData)
      : pageToSourceText(beforeData as PageCompareData);
  }, [contentType, beforeData]);

  const afterText = useMemo(() => {
    return contentType === 'customBlock'
      ? customBlockToSourceText(afterData as CustomBlockCompareData)
      : pageToSourceText(afterData as PageCompareData);
  }, [contentType, afterData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-[95vw] h-[90vh] flex flex-col shadow-xl">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">{'\u5909\u66f4\u306e\u6bd4\u8f03'}</h2>
          <div className="flex items-center gap-4">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveTab('visual')}
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'visual' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {'\u898b\u305f\u76ee'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('source')}
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'source' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {'\u30bd\u30fc\u30b9'}
              </button>
            </div>

            {activeTab === 'visual' && (
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDevice('pc')}
                  className={`px-3 py-2 text-sm ${device === 'pc' ? 'bg-gray-800 text-white' : 'bg-white text-gray-700'}`}
                >
                  PC
                </button>
                <button
                  type="button"
                  onClick={() => setDevice('sp')}
                  className={`px-3 py-2 text-sm ${device === 'sp' ? 'bg-gray-800 text-white' : 'bg-white text-gray-700'}`}
                >
                  SP
                </button>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={highlight}
                onChange={(e) => setHighlight(e.target.checked)}
                className="rounded border-gray-300"
              />
              {'\u5dee\u5206\u30cf\u30a4\u30e9\u30a4\u30c8'}
            </label>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 p-4 overflow-hidden">
          {activeTab === 'visual' ? (
            <VisualComparePane
              contentType={contentType}
              beforeData={beforeData}
              afterData={afterData}
              device={device}
              highlight={highlight}
              beforeLabel={beforeLabel}
              afterLabel={afterLabel}
            />
          ) : (
            <SourceDiffView beforeText={beforeText} afterText={afterText} highlight={highlight} />
          )}
        </div>
      </div>
    </div>
  );
}

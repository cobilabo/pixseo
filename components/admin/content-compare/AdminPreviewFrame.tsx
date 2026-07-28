'use client';

export type PreviewDevice = 'pc' | 'sp';

/** Chrome DevTools の一般的なスマホ幅 */
const SP_WIDTH = 390;

interface AdminPreviewFrameProps {
  srcdoc: string;
  device: PreviewDevice;
  label: string;
}

export default function AdminPreviewFrame({ srcdoc, device, label }: AdminPreviewFrameProps) {
  if (device === 'sp') {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="text-sm font-medium text-gray-600 mb-2 px-1">{label}</div>
        <div className="flex-1 min-h-0 w-full flex justify-center border border-gray-200 rounded-lg overflow-hidden bg-gray-100">
          <div
            className="relative h-full bg-white overflow-hidden border-x border-gray-200 shadow-sm"
            style={{ width: SP_WIDTH }}
          >
            <iframe
              title={label}
              srcDoc={srcdoc}
              sandbox="allow-same-origin"
              className="w-full h-full border-0 bg-white"
              style={{ width: SP_WIDTH }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="text-sm font-medium text-gray-600 mb-2 px-1">{label}</div>
      <div className="flex-1 min-h-0 w-full max-w-[1280px] mx-auto border border-gray-200 rounded-lg overflow-hidden bg-gray-100">
        <iframe
          title={label}
          srcDoc={srcdoc}
          sandbox="allow-same-origin"
          className="w-full h-full min-h-[300px] bg-white border-0"
        />
      </div>
    </div>
  );
}

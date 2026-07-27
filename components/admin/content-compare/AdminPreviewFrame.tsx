'use client';

export type PreviewDevice = 'pc' | 'sp';

interface AdminPreviewFrameProps {
  srcdoc: string;
  device: PreviewDevice;
  label: string;
}

export default function AdminPreviewFrame({ srcdoc, device, label }: AdminPreviewFrameProps) {
  const widthClass = device === 'sp' ? 'w-[375px] mx-auto' : 'w-full max-w-[1280px] mx-auto';

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="text-sm font-medium text-gray-600 mb-2 px-1">{label}</div>
      <div className={`flex-1 min-h-0 border border-gray-200 rounded-lg overflow-hidden bg-gray-100 ${widthClass}`}>
        <iframe
          title={label}
          srcDoc={srcdoc}
          sandbox="allow-same-origin"
          className="w-full h-full min-h-[300px] bg-white"
        />
      </div>
    </div>
  );
}

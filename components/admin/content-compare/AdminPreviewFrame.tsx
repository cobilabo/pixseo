'use client';

import { useEffect, useRef, useState } from 'react';

export type PreviewDevice = 'pc' | 'sp';

/** Chrome DevTools の一般的なスマホ幅（レイアウト・メディアクエリ用） */
const SP_LOGICAL_WIDTH = 390;

interface AdminPreviewFrameProps {
  srcdoc: string;
  device: PreviewDevice;
  label: string;
}

export default function AdminPreviewFrame({ srcdoc, device, label }: AdminPreviewFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [spScale, setSpScale] = useState(1);

  useEffect(() => {
    if (device !== 'sp') {
      setSpScale(1);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const available = el.clientWidth;
      if (available <= 0) return;
      setSpScale(Math.max(1, available / SP_LOGICAL_WIDTH));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [device, srcdoc]);

  if (device === 'sp') {
    const displayWidth = Math.round(SP_LOGICAL_WIDTH * spScale);

    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="text-sm font-medium text-gray-600 mb-2 px-1">{label}</div>
        <div
          ref={containerRef}
          className="flex-1 min-h-0 w-full flex justify-center border border-gray-200 rounded-lg overflow-hidden bg-gray-100"
        >
          <div
            className="relative h-full bg-white overflow-hidden"
            style={{ width: displayWidth }}
          >
            <iframe
              title={label}
              srcDoc={srcdoc}
              sandbox="allow-same-origin"
              className="absolute top-0 left-0 border-0 bg-white"
              style={{
                width: SP_LOGICAL_WIDTH,
                height: `${100 / spScale}%`,
                transform: `scale(${spScale})`,
                transformOrigin: 'top left',
              }}
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

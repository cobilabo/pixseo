'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const SUPPORTED = new Set(['ja', 'en', 'zh', 'ko']);

export default function LangSync() {
  const pathname = usePathname();

  useEffect(() => {
    const seg = pathname.split('/')[1];
    const lang = SUPPORTED.has(seg) ? seg : 'ja';
    document.documentElement.lang = lang;
  }, [pathname]);

  return null;
}

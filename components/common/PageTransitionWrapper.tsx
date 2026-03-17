'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * ページ遷移時にフェードインアニメーションを適用するラッパー。
 * ルート変更のたびにアニメーションを再トリガーする。
 */
export default function PageTransitionWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    el.classList.remove('page-fade-in');
    // 一度削除してから再付与することでアニメーションをリセット
    void el.offsetWidth;
    el.classList.add('page-fade-in');
  }, [pathname]);

  return (
    <div ref={wrapperRef} className="page-fade-in">
      {children}
    </div>
  );
}

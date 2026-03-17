'use client';

import { usePathname } from 'next/navigation';

/**
 * ページ遷移時にフェードインアニメーションを適用するラッパー。
 * key={pathname} によって pathname が変わるたびに DOM を再マウントし、
 * CSS アニメーションを確実に再トリガーする。
 */
export default function PageTransitionWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="page-fade-in">
      {children}
    </div>
  );
}

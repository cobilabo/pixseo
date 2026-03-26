'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * 内部リンククリックからパス／クエリが変わるまでの間、中央にローダーを表示する。
 */
function NavigationRouteLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, setNavigating] = useState(false);

  const routeKey = `${pathname}?${searchParams.toString()}`;
  const routeKeyRef = useRef(routeKey);
  routeKeyRef.current = routeKey;

  useEffect(() => {
    setNavigating(false);
  }, [routeKey]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const el = (e.target as Element | null)?.closest?.('a[href]');
      if (!el) return;
      const a = el as HTMLAnchorElement;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (href.startsWith('mailto:') || href.startsWith('tel:')) return;

      let url: URL;
      try {
        url = new URL(a.href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const cur = new URL(window.location.href);
      if (url.pathname === cur.pathname && url.search === cur.search) {
        return;
      }

      setNavigating(true);
    };

    /** router.push / replace やフォーム送信など、<a> 以外のクライアント遷移でもローダーを出す */
    const shouldShowLoaderForUrl = (urlArg: string | URL | null | undefined) => {
      if (urlArg == null || urlArg === '') return false;
      try {
        const next = typeof urlArg === 'string' ? new URL(urlArg, window.location.href) : urlArg;
        const cur = new URL(window.location.href);
        if (next.origin !== cur.origin) return false;
        return next.pathname !== cur.pathname || next.search !== cur.search;
      } catch {
        return false;
      }
    };

    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);

    history.pushState = function (...args: Parameters<History['pushState']>) {
      if (shouldShowLoaderForUrl(args[2] as string | undefined)) {
        setNavigating(true);
      }
      return origPush(...args);
    };

    history.replaceState = function (...args: Parameters<History['replaceState']>) {
      if (shouldShowLoaderForUrl(args[2] as string | undefined)) {
        setNavigating(true);
      }
      return origReplace(...args);
    };

    /** 戻る／進む */
    const onPopState = () => {
      const before = routeKeyRef.current;
      queueMicrotask(() => {
        try {
          const u = new URL(window.location.href);
          const nextKey = `${u.pathname}?${u.searchParams.toString()}`;
          if (nextKey !== before) {
            setNavigating(true);
          }
        } catch {
          /* ignore */
        }
      });
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, []);

  if (!navigating) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-white/75 backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-8 py-6 shadow-lg">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"
          aria-hidden
        />
        <span className="text-xs font-medium text-gray-600">読み込み中</span>
      </div>
    </div>
  );
}

/**
 * ページ遷移時にフェードインアニメーションを適用するラッパー。
 * key={pathname} によって pathname が変わるたびに DOM を再マウントし、
 * CSS アニメーションを確実に再トリガーする。
 * 有効時は内部リンク遷移中に NavigationRouteLoader も表示する。
 */
function PageTransitionInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <NavigationRouteLoader />
      <div key={pathname} className="page-fade-in">
        {children}
      </div>
    </>
  );
}

export default function PageTransitionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="page-fade-in">{children}</div>}>
      <PageTransitionInner>{children}</PageTransitionInner>
    </Suspense>
  );
}

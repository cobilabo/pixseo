'use client';

import { useLayoutEffect, useRef } from 'react';

let scrollRevealObserver: IntersectionObserver | null = null;
const observedElements = new WeakSet<Element>();

function revealElement(element: Element): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      element.classList.add('is-visible');
    });
  });
}

function ensureScrollRevealObserver(): IntersectionObserver {
  if (scrollRevealObserver) return scrollRevealObserver;

  scrollRevealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        scrollRevealObserver?.unobserve(entry.target);
        revealElement(entry.target);
      });
    },
    {
      root: null,
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.05,
    }
  );

  return scrollRevealObserver;
}

function registerScrollRevealTargets(root: ParentNode): void {
  const observer = ensureScrollRevealObserver();
  root.querySelectorAll<HTMLElement>('.af-reveal:not(.is-visible)').forEach((element) => {
    if (observedElements.has(element)) return;
    observedElements.add(element);
    observer.observe(element);
  });
}

/**
 * Scroll-triggered fade-up for .af-reveal inside custom HTML blocks.
 * Inline scripts in dangerouslySetInnerHTML do not run, so behavior is provided here.
 */
export default function HtmlBlockScrollRevealEnhancer() {
  const anchorRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    document.documentElement.classList.add('js-af-scroll-reveal');

    const frameId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        registerScrollRevealTargets(document);
        const container = anchorRef.current?.closest('.custom-html-block');
        if (container) registerScrollRevealTargets(container);
      });
    });

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <span
      ref={anchorRef}
      className="sr-only"
      aria-hidden="true"
      data-html-scroll-reveal-enhancer=""
    />
  );
}
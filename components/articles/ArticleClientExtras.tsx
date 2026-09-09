'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import BlogCard from './BlogCard';
import { ARTICLE_CONTENT_STYLES } from '@/lib/article-content-styles';

interface ArticleClientExtrasProps {
  content: string;
  lang: string;
}

function ensureArticleContentStyles() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('#article-content-styles')) return;
  const style = document.createElement('style');
  style.id = 'article-content-styles';
  style.textContent = ARTICLE_CONTENT_STYLES;
  document.head.appendChild(style);
}

export default function ArticleClientExtras({ content, lang }: ArticleClientExtrasProps) {
  const [cardMounts, setCardMounts] = useState<Array<{ href: string; el: Element }>>([]);

  useEffect(() => {
    ensureArticleContentStyles();
  }, []);

  useEffect(() => {
    const root = document.querySelector('.article-content');
    if (!root) return;

    const mounts: Array<{ href: string; el: Element }> = [];
    root.querySelectorAll('.blogcard-placeholder').forEach((el) => {
      const raw = el.getAttribute('data-href') || '';
      let href = raw;
      try {
        href = decodeURIComponent(raw);
      } catch {
        href = raw;
      }
      if (href) mounts.push({ href, el });
    });
    setCardMounts(mounts);
  }, [content]);

  useEffect(() => {
    const loadInstagramScript = () => {
      if ((window as any).instgrm) {
        (window as any).instgrm.Embeds.process();
        return;
      }
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.instagram.com/embed.js';
      script.onload = () => {
        if ((window as any).instgrm) {
          (window as any).instgrm.Embeds.process();
        }
      };
      document.body.appendChild(script);
    };

    if (content.includes('instagram-media')) {
      loadInstagramScript();
    }

    if (content.includes('<script')) {
      const contentElement = document.querySelector('.article-content');
      if (contentElement) {
        const scripts = contentElement.querySelectorAll('script');
        scripts.forEach((oldScript) => {
          if (oldScript.hasAttribute('data-executed')) return;
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value);
          });
          if (oldScript.src) {
            newScript.src = oldScript.src;
          } else {
            newScript.textContent = oldScript.textContent;
          }
          oldScript.setAttribute('data-executed', 'true');
          document.body.appendChild(newScript);
        });
      }
    }
  }, [content]);

  return (
    <>
      {cardMounts.map((mount, index) =>
        createPortal(
          <BlogCard key={`blogcard-${index}`} href={mount.href} lang={lang} />,
          mount.el
        )
      )}
    </>
  );
}

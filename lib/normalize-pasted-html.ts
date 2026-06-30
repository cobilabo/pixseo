import {
  stripFontSizesFromElementTree,
  stripInlineFontSizesFromHtml,
} from '@/lib/strip-inline-font-sizes';

const GOOGLE_DOCS_MARKERS =
  /docs-internal-guid|xmlns:google|google-sheets|data-sheets-|mso-|bumper-block|#docs-internal-guid/i;

const INLINE_ANCHOR_WRAPPER_TAGS = new Set([
  'SPAN',
  'FONT',
  'B',
  'I',
  'U',
  'STRONG',
  'EM',
]);

const REFERENCE_LABEL_RE = /\u53C2\u7167[\uFF1A:]/;

/** テキスト中の http(s) URL または言語付き内部パス（exec 用・g フラグ） */
const PLAIN_URL_IN_TEXT_RE =
  /https?:\/\/[^\s<>"']+|\/(?:ja|en|zh|ko)\/[^\s<>"']+/gi;

/** 上記の存在判定用（g なし・lastIndex 問題を避ける） */
const HAS_PLAIN_URL_RE =
  /https?:\/\/[^\s<>"']+|\/(?:ja|en|zh|ko)\/[^\s<>"']+/i;

const SKIP_LINKIFY_TAGS = new Set([
  'A',
  'SCRIPT',
  'STYLE',
  'TEXTAREA',
  'PRE',
  'CODE',
]);

function trimTrailingUrlPunctuation(url: string): string {
  return url.replace(/[.,;:!?)\]」』\u3001\u3002]+$/u, '');
}

function isPlainUrl(text: string): boolean {
  const t = text.replace(/\u00a0/g, ' ').trim();
  return /^https?:\/\//i.test(t) || /^\/(?:ja|en|zh|ko)\//i.test(t);
}

/** Google Docs リダイレクト URL を実 URL に展開 */
function normalizeUrlForHref(raw: string): string {
  const trimmed = trimTrailingUrlPunctuation(raw.trim());
  try {
    const u = new URL(trimmed, 'https://the-ayumi.jp');
    if (u.hostname === 'www.google.com' && u.pathname === '/url') {
      const q = u.searchParams.get('q');
      if (q) return q;
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
  } catch {
    /* 相対パス */
  }
  return trimmed;
}

function shouldSkipLinkifyContainer(el: Element | null): boolean {
  if (!el) return true;
  if (SKIP_LINKIFY_TAGS.has(el.tagName)) return true;
  return !!el.closest('a');
}

function linkifyTextNode(textNode: Text, doc: Document): void {
  const text = textNode.textContent ?? '';
  if (!HAS_PLAIN_URL_RE.test(text)) return;
  PLAIN_URL_IN_TEXT_RE.lastIndex = 0;

  const frag = doc.createDocumentFragment();
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = PLAIN_URL_IN_TEXT_RE.exec(text)) !== null) {
    const start = match.index;
    if (start > lastIndex) {
      frag.appendChild(doc.createTextNode(text.slice(lastIndex, start)));
    }
    const raw = match[0];
    const url = trimTrailingUrlPunctuation(raw);
    const href = normalizeUrlForHref(url);
    const anchor = doc.createElement('a');
    anchor.setAttribute('href', href);
    anchor.textContent = url;
    frag.appendChild(anchor);
    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) {
    frag.appendChild(doc.createTextNode(text.slice(lastIndex)));
  }

  textNode.parentNode?.replaceChild(frag, textNode);
}

/** plain text の URL を <a href> に変換（既存の <a> 内は対象外） */
function linkifyPlainUrls(root: ParentNode, doc: Document): void {
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    if (shouldSkipLinkifyContainer(textNode.parentElement)) continue;
    const text = textNode.textContent ?? '';
    if (!text.trim()) continue;
    if (!HAS_PLAIN_URL_RE.test(text)) continue;
    textNodes.push(textNode);
  }

  for (const textNode of textNodes) {
    linkifyTextNode(textNode, doc);
  }
}

/** href のみで表示テキストが空の <a> と直後の URL テキスト/span を統合 */
function mergeOrphanUrlAnchors(root: ParentNode): void {
  root.querySelectorAll('a[href]').forEach((node) => {
    if (!(node instanceof HTMLAnchorElement)) return;
    if (node.textContent?.replace(/\u00a0/g, ' ').trim()) return;

    const href = node.getAttribute('href');
    if (!href || href.startsWith('#')) return;

    let sibling: ChildNode | null = node.nextSibling;
    while (sibling) {
      if (sibling.nodeType === Node.TEXT_NODE) {
        if (!(sibling.textContent || '').trim()) {
          sibling = sibling.nextSibling;
          continue;
        }
        return;
      }
      if (sibling.nodeType === Node.ELEMENT_NODE) {
        const el = sibling as Element;
        if (el.tagName === 'SUP' || el.tagName === 'BR') return;

        const t = el.textContent?.replace(/\u00a0/g, ' ').trim() ?? '';
        if (!isPlainUrl(t)) return;

        node.textContent = t;
        const normalizedHref = normalizeUrlForHref(t);
        if (normalizedHref) node.setAttribute('href', normalizedHref);

        if (
          el.tagName === 'SPAN' &&
          !el.querySelector('a') &&
          el.textContent?.replace(/\u00a0/g, ' ').trim() === t
        ) {
          el.remove();
        }
        return;
      }
      return;
    }
  });
}

export function isGoogleDocsPasteHtml(html: string): boolean {
  return GOOGLE_DOCS_MARKERS.test(html);
}

function flattenAnchorInlineWrappers(anchor: HTMLAnchorElement): void {
  if (anchor.querySelector('img, table, svg, video, iframe')) return;

  const children = Array.from(anchor.children);
  if (children.length === 0) return;

  const onlyInlineWrappers = children.every((el) =>
    INLINE_ANCHOR_WRAPPER_TAGS.has(el.tagName)
  );
  if (!onlyInlineWrappers) return;

  const text = anchor.textContent?.replace(/\u00a0/g, ' ').trim();
  if (text) anchor.textContent = text;
}

function findPrecedingReferenceLabel(anchor: Element): {
  element: Element | null;
  text: string;
} {
  const parent = anchor.parentElement;
  if (!parent) return { element: null, text: '' };

  const children = Array.from(parent.childNodes);
  const anchorIndex = children.indexOf(anchor);
  if (anchorIndex <= 0) return { element: null, text: '' };

  for (let i = anchorIndex - 1; i >= 0; i--) {
    const node = children[i];

    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || '').replace(/\u00a0/g, ' ').trim();
      if (!text) continue;
      if (REFERENCE_LABEL_RE.test(text)) return { element: null, text };
      break;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.closest('a')) break;

      const text = (el.textContent || '').replace(/\u00a0/g, ' ').trim();
      if (!text || el.tagName === 'BR') continue;
      if (REFERENCE_LABEL_RE.test(text)) return { element: el, text };
      break;
    }
  }

  return { element: null, text: '' };
}

function mergeOrphanReferenceLabels(root: ParentNode): void {
  root.querySelectorAll('a[href]').forEach((anchor) => {
    if (!(anchor instanceof HTMLAnchorElement)) return;

    const { element, text: label } = findPrecedingReferenceLabel(anchor);
    if (!label) return;

    anchor.textContent = label;
    element?.remove();
  });
}

export function normalizePastedHtml(html: string): string {
  if (!html?.trim()) return html;

  if (typeof DOMParser === 'undefined') {
    return stripInlineFontSizesFromHtml(html);
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.body;
  if (!root) return stripInlineFontSizesFromHtml(html);

  root.querySelectorAll('a[href]').forEach((anchor) => {
    if (anchor instanceof HTMLAnchorElement) {
      flattenAnchorInlineWrappers(anchor);
    }
  });

  if (isGoogleDocsPasteHtml(html)) {
    mergeOrphanReferenceLabels(root);
  }

  mergeOrphanUrlAnchors(root);
  linkifyPlainUrls(root, doc);

  stripFontSizesFromElementTree(root);

  return root.innerHTML;
}
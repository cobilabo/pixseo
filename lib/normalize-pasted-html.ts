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
  if (typeof DOMParser === 'undefined') return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.body;
  if (!root) return html;

  root.querySelectorAll('a[href]').forEach((anchor) => {
    if (anchor instanceof HTMLAnchorElement) {
      flattenAnchorInlineWrappers(anchor);
    }
  });

  if (isGoogleDocsPasteHtml(html)) {
    mergeOrphanReferenceLabels(root);
  }

  return root.innerHTML;
}
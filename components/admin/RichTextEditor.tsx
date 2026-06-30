'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { Theme, defaultTheme, HtmlShortcodeItem } from '@/types/theme';
import ImageGenerator from './ImageGenerator';
import { normalizePastedHtml } from '@/lib/normalize-pasted-html';
import { stripInlineFontSizesFromHtml } from '@/lib/strip-inline-font-sizes';

/** 記事本文エディタの HTML ソース全文編集タブ（一旦オフ・再有効化時は true に） */
const ENABLE_EDITOR_HTML_SOURCE_VIEW = false;

/** 目次プレースホルダー（エディタ内表示用・保存時は normalizeTocPlaceholder で簡略化されうる） */
const TOC_PLACEHOLDER_EDITOR_INNER_HTML = `<div class="toc-placeholder-inner"><div class="toc-placeholder-header"><span class="toc-placeholder-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg></span><span class="toc-placeholder-title">目次</span></div><p class="toc-placeholder-desc">記事内の見出し（H2・H3）から自動生成されます</p><button type="button" class="toc-placeholder-delete" data-action="delete-toc" title="目次を削除"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></div>`;

/** cleanWordPressHtml 適用済みの本文では div.image-figure + p.image-caption になることがある */

/**
 * 移行 HTML の `<div><img></div>` や、エディタ注入後の
 * `<div><img/><button class="image-figure-edit-btn"/>…</div>` を同一視する。
 * 注入ボタン以外の直下子が img ちょうど 1 つの div / figure。
 */
function isEditorImageBlockWrapper(el: HTMLElement, editorRoot: HTMLElement | null): boolean {
  const tag = el.tagName;
  if (tag !== 'DIV' && tag !== 'FIGURE') return false;
  if (editorRoot && el === editorRoot) return false;
  if (el.closest('.html-block, .toc-placeholder')) return false;

  const significant = Array.from(el.children).filter((c) => {
    if (!(c instanceof HTMLElement)) return true;
    return (
      !c.classList.contains('image-figure-edit-btn') &&
      !c.classList.contains('image-figure-delete-btn')
    );
  });

  return significant.length === 1 && significant[0].tagName === 'IMG';
}

function closestImageFigure(
  el: Element | null,
  editorRoot: HTMLElement | null = null
): HTMLElement | null {
  if (!el) return null;
  const byClass =
    (el.closest('figure.image-figure') as HTMLElement | null) ||
    (el.closest('div.image-figure') as HTMLElement | null) ||
    (el.closest('figure.wp-block-image') as HTMLElement | null);
  if (byClass) return byClass;

  const img =
    el instanceof HTMLImageElement ? el : (el.closest('img') as HTMLImageElement | null);
  if (!img) return null;

  let p: HTMLElement | null = img.parentElement;
  while (p) {
    if (editorRoot && p === editorRoot) break;
    if (isEditorImageBlockWrapper(p, editorRoot)) return p;
    if (p.tagName === 'FIGURE' && p.querySelector('img')) return p;
    if (p.classList.contains('image-figure')) return p;
    // エディタ直下のブロック 1 枚の画像（キャプション付きの裸 div 等）
    if (
      editorRoot &&
      p.parentElement === editorRoot &&
      p.getElementsByTagName('img').length === 1 &&
      p.getElementsByTagName('img')[0] === img &&
      !p.closest('.html-block, .toc-placeholder')
    ) {
      return p;
    }
    p = p.parentElement;
  }
  return null;
}

/** キー削除用: 前後の兄弟が「画像ブロックのルート」か */
function isDeletableImageBlockRoot(el: HTMLElement, editor: HTMLElement): boolean {
  if (!editor.contains(el) || el.closest('.html-block, .toc-placeholder')) return false;
  if (el.matches('figure.image-figure, div.image-figure, figure.wp-block-image')) return true;
  if (isEditorImageBlockWrapper(el, editor)) return true;
  if (el.parentElement === editor && el.getElementsByTagName('img').length === 1) return true;
  return false;
}

/** キャレットがエディタ直下ブロックの先頭にあるとき、そのブロック要素を返す */
function getContainingEditorChildIfCaretAtStart(
  range: Range,
  editor: HTMLElement
): HTMLElement | null {
  if (!range.collapsed) return null;
  let node: Node = range.startContainer;
  let offset = range.startOffset;

  while (node !== editor) {
    const parent = node.parentNode;
    if (!parent) return null;

    if (node.nodeType === Node.TEXT_NODE) {
      if (offset > 0) return null;
      offset = Array.prototype.indexOf.call(parent.childNodes, node);
      node = parent;
      continue;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      if (offset > 0) return null;
      if (parent === editor) {
        return node as HTMLElement;
      }
      offset = Array.prototype.indexOf.call(parent.childNodes, node);
      node = parent;
    } else {
      return null;
    }
  }
  return null;
}

/** キャレットがエディタ直下ブロックの末尾にあるとき、そのブロック要素を返す（Delete 用） */
function getContainingEditorChildIfCaretAtEnd(
  range: Range,
  editor: HTMLElement
): HTMLElement | null {
  if (!range.collapsed) return null;
  let node: Node = range.startContainer;
  let offset = range.startOffset;

  while (node !== editor) {
    const parent = node.parentNode;
    if (!parent) return null;

    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node as Text).length;
      if (offset < len) return null;
      offset = Array.prototype.indexOf.call(parent.childNodes, node) + 1;
      node = parent;
      continue;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      if (offset < node.childNodes.length) return null;
      if (parent === editor) {
        return node as HTMLElement;
      }
      offset = Array.prototype.indexOf.call(parent.childNodes, node) + 1;
      node = parent;
    } else {
      return null;
    }
  }
  return null;
}

function placeCaretAtStart(el: HTMLElement) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  const first = el.firstChild;
  if (first) {
    if (first.nodeType === Node.TEXT_NODE) {
      range.setStart(first, 0);
    } else {
      range.setStartBefore(first);
    }
  } else {
    range.setStart(el, 0);
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

/** ツールバー注入対象の画像ラッパーを列挙（クラス付き + 素の div/figure+img） */
function collectImageFigureRoots(editor: HTMLElement): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const add = (h: HTMLElement) => {
    if (!editor.contains(h)) return;
    if (h.closest('.html-block, .toc-placeholder')) return;
    seen.add(h);
  };

  editor.querySelectorAll<HTMLElement>(
    'figure.image-figure, div.image-figure, figure.wp-block-image'
  ).forEach(add);

  editor.querySelectorAll<HTMLElement>('div, figure').forEach((el) => {
    if (seen.has(el)) return;
    if (isEditorImageBlockWrapper(el, editor)) add(el);
  });

  return Array.from(seen);
}

/** pointer / click の target が Element でない場合の安全な起点 */
function eventTargetElement(ev: Event): Element | null {
  const t = ev.target;
  if (!t || !(t instanceof Node)) return null;
  return t instanceof Element ? t : t.parentElement;
}

function hitImageFigureToolbar(ev: Event): boolean {
  const el = eventTargetElement(ev);
  return !!el?.closest('.image-figure-edit-btn, .image-figure-delete-btn');
}

/** 保存時と同様に注入ボタンを除いた innerHTML（親 value との同期判定用） */
function canonicalEditorInnerHtml(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll('.image-figure-delete-btn, .image-figure-edit-btn')
    .forEach((b) => b.remove());
  return clone.innerHTML;
}

/** 保存用 HTML（画像編集ボタン除去 + インライン font-size 除去） */
function extractCanonicalHtmlFromEditor(root: HTMLElement): string {
  return stripInlineFontSizesFromHtml(canonicalEditorInnerHtml(root));
}

type EditorViewMode = 'visual' | 'source';

/** HTMLフォーマッター（ブロック編集・全文ソース表示用） */
function formatHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  let formatted = html;
  let indent = 0;
  const indentSize = 2;

  formatted = formatted
    .replace(/></g, '>\n<')
    .replace(/\n\s*\n+/g, '\n');

  const lines = formatted.split('\n');
  const formattedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line && i > 0 && i < lines.length - 1) {
      formattedLines.push('');
      continue;
    }
    if (!line) continue;

    if (line.startsWith('</')) {
      indent = Math.max(0, indent - indentSize);
    }

    formattedLines.push(' '.repeat(indent) + line);

    if (line.startsWith('<') && !line.startsWith('</') && !line.endsWith('/>') && !line.includes('</')) {
      if (!line.match(/<(script|style|textarea|pre)/i)) {
        indent += indentSize;
      }
    }

    if (line.startsWith('</')) {
      if (i < lines.length - 1 && !lines[i + 1].trim().startsWith('</')) {
        indent = Math.max(0, indent - indentSize);
      }
    }
  }

  return formattedLines.join('\n');
}

/** 選択範囲に重なるテキスト区間（各區間は単一 Text ノード内 → surroundContents が常に成功） */
function collectTextSegmentsInRange(range: Range): { t: Text; start: number; end: number }[] {
  const segments: { t: Text; start: number; end: number }[] = [];
  const root =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as Node)
      : range.commonAncestorContainer.parentNode;
  if (!root) return segments;

  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node as Text;
      if (t.parentElement?.closest('.html-block, .toc-placeholder')) return;
      if (!range.intersectsNode(t)) return;
      let start = 0;
      let end = t.length;
      if (range.startContainer === t) start = range.startOffset;
      if (range.endContainer === t) end = range.endOffset;
      start = Math.max(0, Math.min(start, t.length));
      end = Math.max(start, Math.min(end, t.length));
      if (start < end) segments.push({ t, start, end });
      return;
    }
    for (let c = node.firstChild; c; c = c.nextSibling) visit(c);
  };

  visit(root);
  return segments;
}

function ensureTocPlaceholderChrome(root: HTMLElement | null) {
  if (!root) return;
  const nodes = root.querySelectorAll<HTMLElement>(
    '.toc-placeholder, [data-toc="auto"]'
  );
  nodes.forEach((el) => {
    el.classList.add('not-prose');
    const hasChrome = el.querySelector(
      '.toc-placeholder-inner [data-action="delete-toc"]'
    );
    if (hasChrome) return;
    el.setAttribute('contenteditable', 'false');
    if (!el.getAttribute('data-toc')) el.setAttribute('data-toc', 'auto');
    el.classList.add('toc-placeholder', 'not-prose');
    el.innerHTML = TOC_PLACEHOLDER_EDITOR_INNER_HTML;
  });
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const { currentTenant } = useMediaTenant();
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageInputMethod, setImageInputMethod] = useState<'upload' | 'url' | 'ai'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageCaption, setImageCaption] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageCopyright, setImageCopyright] = useState('');
  const [showImageEditModal, setShowImageEditModal] = useState(false);
  const [editImageInputMethod, setEditImageInputMethod] = useState<'upload' | 'url' | 'ai'>(
    'upload'
  );
  const [editImageSrc, setEditImageSrc] = useState('');
  const [editImageAlt, setEditImageAlt] = useState('');
  const [editImageCaption, setEditImageCaption] = useState('');
  const [editImageCopyright, setEditImageCopyright] = useState('');
  const editingFigureRef = useRef<HTMLElement | null>(null);
  /** 画像ブロックの img に直接 listener を付けるため、常に最新のモーダルオープン処理を参照 */
  const openImageFigureEditRef = useRef<(figure: HTMLElement) => void>(() => {});
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [showHtmlModal, setShowHtmlModal] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const [showFontSizeModal, setShowFontSizeModal] = useState(false);
  const [fontSize, setFontSize] = useState('16');
  // HTMLブロック用
  const [htmlBlockModes, setHtmlBlockModes] = useState<Record<string, 'source' | 'preview'>>({});
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const draggingBlockIdRef = useRef<string | null>(null);
  /** 直近でエディタと一致させた本文（親の value との差分同期に使う） */
  const lastCanonicalHtmlRef = useRef<string | undefined>(undefined);
  /** フォントサイズモーダル表示時に選択が失われるため、開く直前の Range を保持 */
  const fontSizeSavedRangeRef = useRef<Range | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [editorViewMode, setEditorViewMode] = useState<EditorViewMode>('visual');
  const [sourceHtml, setSourceHtml] = useState(value);

  openImageFigureEditRef.current = (figure: HTMLElement) => {
    const img = figure.querySelector('img');
    if (!img) return;
    const copyEl = figure.querySelector('.image-copyright');
    const capEl = figure.querySelector('figcaption, p.image-caption');
    editingFigureRef.current = figure;
    setEditImageSrc(img.getAttribute('src') || '');
    setEditImageAlt(img.getAttribute('alt') || '');
    setEditImageCaption(capEl?.textContent?.trim() || '');
    setEditImageCopyright(copyEl?.textContent?.trim() || '');
    setEditImageInputMethod('upload');
    setShowImageEditModal(true);
  };

  // デザイン設定を取得
  useEffect(() => {
    const fetchDesignSettings = async () => {
      if (!currentTenant) return;
      try {
        const currentTenantId = localStorage.getItem('currentTenantId');
        if (!currentTenantId) return;

        const response = await fetch('/api/admin/theme', {
          headers: {
            'x-media-id': currentTenantId,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setTheme(data.theme || defaultTheme);
        }
      } catch (error) {
        console.error('デザイン設定の取得に失敗:', error);
      }
    };
    fetchDesignSettings();
  }, [currentTenant]);

  // 外部 value とエディタ DOM を同期し、目次プレースホルダーにエディタ用 UI を付与（useLayoutEffect で useEffect より先に確定）
  // 親の value が簡略マーカーのままだと装飾後 DOM と常に不一致になり、毎回 innerHTML を潰すため
  // 「親から渡された value が変わったときだけ」貼り直し、装飾後は onChange で親を揃える。
  useLayoutEffect(() => {
    if (ENABLE_EDITOR_HTML_SOURCE_VIEW && editorViewMode === 'source') {
      if (lastCanonicalHtmlRef.current !== value) {
        setSourceHtml(value);
        lastCanonicalHtmlRef.current = value;
      }
      return;
    }

    if (!editorRef.current) return;
    const ed = editorRef.current;
    const prevCanonical = lastCanonicalHtmlRef.current;
    const valueChangedFromParent = prevCanonical !== value;
    const canonicalNow = canonicalEditorInnerHtml(ed);

    // 注入した編集・削除ボタンは innerHTML に含まれるが保存 value には無いため、
    // value !== ed.innerHTML だと常に不一致になり、入力のたびに DOM を貼り直してカーソルが先頭へ飛ぶ。
    if (valueChangedFromParent && value != null && value !== canonicalNow) {
      ed.innerHTML = value;
    }

    ensureTocPlaceholderChrome(ed);

    const canonical = canonicalEditorInnerHtml(ed);

    if (canonical !== value) {
      onChangeRef.current(canonical);
    }

    lastCanonicalHtmlRef.current = canonical;
  }, [value, editorViewMode]);

  // .image-figure に編集・削除ボタンを注入（保存時には除去される）
  useEffect(() => {
    if (
      !editorRef.current ||
      (ENABLE_EDITOR_HTML_SOURCE_VIEW && editorViewMode !== 'visual')
    ) {
      return;
    }
    const figures = collectImageFigureRoots(editorRef.current);

    figures.forEach((figure) => {
      figure.style.position = 'relative';
      figure.querySelectorAll('img').forEach((img) => {
        img.setAttribute('draggable', 'false');
      });
      if (!figure.querySelector('.image-figure-edit-btn')) {
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'image-figure-edit-btn';
        editBtn.setAttribute('data-action', 'edit-figure');
        editBtn.title = '画像の設定を編集';
        editBtn.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>';
        figure.appendChild(editBtn);
      }
      if (!figure.querySelector('.image-figure-delete-btn')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'image-figure-delete-btn';
        btn.setAttribute('data-action', 'delete-figure');
        btn.title = '画像を削除';
        btn.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>';
        figure.appendChild(btn);
      }
    });
  }, [value, editorViewMode]);

  /** 画像ブロック: capture で window から composedPath を辿り、figure 直付けより確実に拾う */
  useEffect(() => {
    const onPointerDownCapture = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const ed = editorRef.current;
      if (!ed) return;

      const path = e.composedPath();
      const leaf = path[0];
      if (!(leaf instanceof Node) || !ed.contains(leaf)) return;
      if (hitImageFigureToolbar(e)) return;

      for (const node of path) {
        if (!(node instanceof Element)) continue;
        if (!ed.contains(node)) continue;
        if (node.closest('.html-block-preview-content, .toc-placeholder')) continue;

        const figure = closestImageFigure(node, ed);
        if (
          figure &&
          ed.contains(figure) &&
          !figure.closest('.html-block-preview-content, .toc-placeholder') &&
          figure.querySelector('img')
        ) {
          e.preventDefault();
          e.stopPropagation();
          openImageFigureEditRef.current(figure);
          return;
        }
      }
    };

    window.addEventListener('pointerdown', onPointerDownCapture, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDownCapture, true);
    };
  }, []);

  // 既存のHTMLブロックを検出して初期化
  useEffect(() => {
    if (
      !editorRef.current ||
      (ENABLE_EDITOR_HTML_SOURCE_VIEW && editorViewMode !== 'visual')
    ) {
      return;
    }

    const htmlBlocks = editorRef.current.querySelectorAll('.html-block[data-html-id]');
    const newModes: Record<string, 'source' | 'preview'> = {};
    
    htmlBlocks.forEach((block) => {
      const blockId = block.getAttribute('data-html-id');
      const currentMode = block.getAttribute('data-mode') as 'source' | 'preview' | null;
      if (blockId && !htmlBlockModes[blockId]) {
        newModes[blockId] = currentMode || 'source';
      }
      
      // ソースモードのtextareaの内容をdata-html-contentから復元
      if (currentMode === 'source' || !currentMode) {
        const textarea = block.querySelector('.html-block-textarea') as HTMLTextAreaElement;
        const savedContent = block.getAttribute('data-html-content');
        if (textarea && savedContent) {
          try {
            // URLエンコードされたコンテンツをデコード
            const decodedContent = decodeURIComponent(savedContent);
            // textareaのvalueはそのままセット（HTMLエスケープ不要）
            textarea.value = decodedContent;
          } catch (e) {
            console.error('Failed to restore HTML block content:', e);
          }
        }
      }
    });
    
    if (Object.keys(newModes).length > 0) {
      setHtmlBlockModes(prev => ({ ...prev, ...newModes }));
    }
  }, [value, htmlBlockModes, editorViewMode]);

  // HTMLブロック内のイベントを処理
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // ボタンクリックのハンドラ
    const handleClick = (e: MouseEvent) => {
      const target = eventTargetElement(e);
      if (!target) return;
      const button = target.closest('[data-action]') as HTMLElement;
      
      if (button) {
        e.preventDefault();
        e.stopPropagation();
        
        const action = button.getAttribute('data-action');
        const blockId = button.getAttribute('data-block-id');

        if (action === 'delete-toc') {
          const tocBlock = editor.querySelector('.toc-placeholder');
          if (tocBlock) {
            tocBlock.remove();
            if (editorRef.current) {
              const html = editorRef.current.innerHTML;
              onChange(html);
            }
          }
          return;
        }

        if (action === 'edit-figure') {
          const figure = closestImageFigure(button, editorRef.current);
          if (figure && editorRef.current) {
            openImageFigureEditRef.current(figure);
          }
          return;
        }

        if (action === 'delete-figure') {
          const figure = closestImageFigure(button, editorRef.current);
          if (figure) {
            figure.remove();
            if (editorRef.current) {
              // 削除ボタンを除去してから保存
              const clone = editorRef.current.cloneNode(true) as HTMLElement;
              clone
                .querySelectorAll('.image-figure-delete-btn, .image-figure-edit-btn')
                .forEach((b) => b.remove());
              onChange(clone.innerHTML);
            }
          }
          return;
        }
        
        if (!blockId) return;
        
        if (action === 'toggle-mode') {
          // HTMLブロックのモード切替
          const block = editor.querySelector(`[data-html-id="${blockId}"]`) as HTMLElement;
          if (!block) return;
          
          const currentMode = block.getAttribute('data-mode') as 'source' | 'preview' || 'source';
          const newMode = currentMode === 'source' ? 'preview' : 'source';
          
          // ソースモードからプレビューに切り替える場合、textareaの内容を保存
          if (currentMode === 'source') {
            const textarea = block.querySelector('.html-block-textarea') as HTMLTextAreaElement;
            if (textarea) {
              // textareaの値をそのまま保存（改行も保持）
              block.setAttribute('data-html-content', encodeURIComponent(textarea.value));
            }
          }
          
          const htmlContent = decodeURIComponent(block.getAttribute('data-html-content') || '');
          
          // モードを切り替え
          block.setAttribute('data-mode', newMode);
          
          if (newMode === 'preview') {
            block.innerHTML = `<div class="html-block-toolbar" data-toolbar-for="${blockId}"><span class="html-block-drag-handle" draggable="true" title="ドラッグして移動">⋮⋮</span><div class="html-block-tabs"><button type="button" class="html-block-btn" data-action="toggle-mode" data-block-id="${blockId}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>HTML</button><button type="button" class="html-block-btn active" data-action="toggle-mode" data-block-id="${blockId}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>プレビュー</button></div><div class="html-block-spacer"></div><button type="button" class="html-block-menu-btn html-block-delete-btn" data-action="delete" data-block-id="${blockId}" title="削除"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></div><div class="html-block-preview-content">${htmlContent}</div>`;
          } else {
            // HTMLコンテンツをそのままエスケープして表示（フォーマットせず元の形式を保持）
            const escapedHtml = htmlContent
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
            
            block.innerHTML = `<div class="html-block-toolbar" data-toolbar-for="${blockId}"><span class="html-block-drag-handle" draggable="true" title="ドラッグして移動">⋮⋮</span><div class="html-block-tabs"><button type="button" class="html-block-btn active" data-action="toggle-mode" data-block-id="${blockId}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>HTML</button><button type="button" class="html-block-btn" data-action="toggle-mode" data-block-id="${blockId}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>プレビュー</button></div><div class="html-block-spacer"></div><button type="button" class="html-block-menu-btn html-block-delete-btn" data-action="delete" data-block-id="${blockId}" title="削除"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></div><textarea class="html-block-textarea" data-block-id="${blockId}" spellcheck="false">${escapedHtml}</textarea>`;
          }
          
          setHtmlBlockModes(prev => ({ ...prev, [blockId]: newMode }));
          
          // 変更を通知
          if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            onChange(html);
          }
        } else if (action === 'delete') {
          if (!confirm('このHTMLブロックを削除しますか？')) return;
          
          const block = editor.querySelector(`[data-html-id="${blockId}"]`);
          if (block) {
            block.remove();
            setHtmlBlockModes(prev => {
              const newModes = { ...prev };
              delete newModes[blockId];
              return newModes;
            });
            
            // 変更を通知
            if (editorRef.current) {
              const html = editorRef.current.innerHTML;
              onChange(html);
            }
          }
        }
      }
    };

    // textareaの変更を監視
    const handleTextareaInput = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('html-block-textarea')) {
        const blockId = target.getAttribute('data-block-id');
        if (blockId) {
          const textarea = target as HTMLTextAreaElement;
          const block = editor.querySelector(`[data-html-id="${blockId}"]`) as HTMLElement;
          if (block) {
            // textareaの値をそのまま保存（改行も保持）
            block.setAttribute('data-html-content', encodeURIComponent(textarea.value));
          }
        }
      }
    };

    // ドラッグ用の変数（クロージャ内で保持）
    let draggedElement: HTMLElement | null = null;
    let isDragging = false;

    // mousedownでドラッグ開始
    const handleMouseDown = (e: MouseEvent) => {
      const target = eventTargetElement(e);
      if (!target) return;
      const dragHandle = target.closest('.html-block-drag-handle') as HTMLElement;
      
      if (dragHandle) {
        e.preventDefault();
        e.stopPropagation();
        const htmlBlock = dragHandle.closest('.html-block') as HTMLElement;
      if (htmlBlock) {
          draggedElement = htmlBlock;
          isDragging = true;
          htmlBlock.classList.add('dragging');
          draggingBlockIdRef.current = htmlBlock.getAttribute('data-html-id');
          setDraggingBlockId(htmlBlock.getAttribute('data-html-id'));
          
          // カーソルを変更
          document.body.style.cursor = 'grabbing';
        }
      }
    };

    // mousemoveでドラッグ中の処理
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !draggedElement || !editorRef.current) return;
      
      // 他のHTMLブロックを探してドロップ位置を表示
      const htmlBlocks = editorRef.current.querySelectorAll('.html-block');
      htmlBlocks.forEach(block => {
        if (block === draggedElement) return;
        
        const rect = block.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          
        block.classList.remove('drop-above', 'drop-below');
          
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          if (e.clientY < midY) {
            block.classList.add('drop-above');
          } else {
            block.classList.add('drop-below');
          }
        }
      });
    };

    // mouseupでドロップ
    const handleMouseUp = () => {
      // カーソルを元に戻す
      document.body.style.cursor = '';
      
      if (!isDragging || !draggedElement || !editorRef.current) {
        isDragging = false;
        draggedElement = null;
        return;
      }
      
      // ドロップ先を探す
      const htmlBlocks = editorRef.current.querySelectorAll('.html-block');
      let targetBlock: Element | null = null;
      let insertBefore = true;
      
      htmlBlocks.forEach(block => {
        if (block === draggedElement) return;
        
        if (block.classList.contains('drop-above')) {
          targetBlock = block;
          insertBefore = true;
        } else if (block.classList.contains('drop-below')) {
          targetBlock = block;
          insertBefore = false;
        }
      });
      
      // 移動実行
      if (targetBlock && draggedElement) {
        const target = targetBlock as HTMLElement;
        if (insertBefore) {
          target.parentNode?.insertBefore(draggedElement, target);
            } else {
          target.parentNode?.insertBefore(draggedElement, target.nextSibling);
            }
            
            // 変更を通知
        if (editorRef.current) {
          const html = editorRef.current.innerHTML;
          onChange(html);
        }
      }
      
      // クリーンアップ
      htmlBlocks.forEach(block => {
        block.classList.remove('dragging', 'drop-above', 'drop-below');
      });
      
      isDragging = false;
      draggedElement = null;
      draggingBlockIdRef.current = null;
      setDraggingBlockId(null);
    };

    editor.addEventListener('click', handleClick);
    editor.addEventListener('input', handleTextareaInput);
    editor.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      editor.removeEventListener('click', handleClick);
      editor.removeEventListener('input', handleTextareaInput);
      editor.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [onChange]);

  // テキスト選択時 or カーソル移動時にツールバーを表示
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // エディタ内での選択かチェック
        if (editorRef.current?.contains(range.commonAncestorContainer)) {
          const rect = range.getBoundingClientRect();
          const editorRect = editorRef.current.getBoundingClientRect();
          
          // 選択中またはカーソルがエディタ内にある場合
          if (!selection.isCollapsed || document.activeElement === editorRef.current) {
            // ツールバーのサイズを考慮
            const toolbarHeight = 50;
            const toolbarMaxWidth = Math.min(600, window.innerWidth * 0.9); // 最大幅を90vwに制限
            const toolbarWidth = toolbarMaxWidth;
            
            // rectのサイズが0の場合（改行など）は、カーソル位置を使用
            let top: number;
            let left: number;
            
            if (rect.width === 0 && rect.height === 0) {
              // カーソル位置を使用
              const rangeRect = range.getClientRects();
              if (rangeRect.length > 0) {
                const cursorRect = rangeRect[0];
                top = cursorRect.top - toolbarHeight - 10;
                left = cursorRect.left;
              } else {
                // フォールバック: エディターの中央上部に表示
                top = editorRect.top + 20;
                left = editorRect.left + editorRect.width / 2;
              }
            } else {
              top = rect.top - toolbarHeight - 10; // 10pxのマージン
              left = rect.left + (rect.width > 0 ? rect.width / 2 : 0);
            }
            
            // 画面上部に出ないように調整
            if (top < 60) {
              // ツールバーを選択範囲の下に表示
              if (rect.height > 0) {
                top = rect.bottom + 10;
              } else {
                top = Math.max(60, top + toolbarHeight + 20);
              }
            }
            
            // 画面下部に出ないように調整
            const windowHeight = window.innerHeight;
            if (top + toolbarHeight > windowHeight - 20) {
              top = Math.max(20, windowHeight - toolbarHeight - 20);
            }
            
            // 画面左側に出ないように調整（サイドバーの幅256px + マージンを考慮）
            const windowWidth = window.innerWidth;
            const sidebarWidth = window.innerWidth >= 1024 ? 256 : 0; // lg:breakpoint以上でサイドバー表示
            const toolbarLeft = left - toolbarWidth / 2;
            const minLeft = sidebarWidth + 20; // サイドバー + マージン
            if (toolbarLeft < minLeft) {
              left = minLeft + toolbarWidth / 2;
            }
            
            // 画面右側に出ないように調整
            const margin = 20;
            const toolbarRight = left + toolbarWidth / 2;
            if (toolbarRight > windowWidth - margin) {
              left = windowWidth - toolbarWidth / 2 - margin;
            }
            
            // 有効な位置であることを確認
            if (top >= 0 && left >= 0 && top < windowHeight && left < windowWidth) {
              setToolbarPosition({ top, left });
              setShowToolbar(true);
              return;
            }
          }
        }
      }
      setShowToolbar(false);
    };

    const handleClick = () => {
      // エディタ内でクリックした場合もツールバーを表示
      if (document.activeElement === editorRef.current) {
        handleSelectionChange();
      }
    };

    const editor = editorRef.current;
    document.addEventListener('selectionchange', handleSelectionChange);
    editor?.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      editor?.removeEventListener('click', handleClick);
    };
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      const html = extractCanonicalHtmlFromEditor(editorRef.current);
      onChange(html);
    }
  };

  const switchEditorView = (mode: EditorViewMode) => {
    if (mode === editorViewMode) return;

    if (mode === 'source') {
      const html = editorRef.current
        ? extractCanonicalHtmlFromEditor(editorRef.current)
        : value;
      setSourceHtml(formatHtml(html));
      lastCanonicalHtmlRef.current = html;
      onChangeRef.current(html);
      setShowToolbar(false);
      setEditorViewMode('source');
      return;
    }

    const ed = editorRef.current;
    if (ed) {
      ed.innerHTML = sourceHtml;
      ensureTocPlaceholderChrome(ed);
      const canonical = extractCanonicalHtmlFromEditor(ed);
      lastCanonicalHtmlRef.current = canonical;
      if (canonical !== value) {
        onChangeRef.current(canonical);
      }
    }
    setEditorViewMode('visual');
  };

  const handleSourceHtmlChange = (html: string) => {
    setSourceHtml(html);
    lastCanonicalHtmlRef.current = html;
    onChangeRef.current(html);
  };

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData.getData('text/html');
    if (!html?.trim()) return;

    e.preventDefault();
    const normalized = normalizePastedHtml(html);
    document.execCommand('insertHTML', false, normalized);
    handleInput();
  };

  /** 画像ブロック直前/直後で Backspace / Delete が効かないブラザ対策 */
  const handleEditorKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    if (e.defaultPrevented) return;
    const editor = editorRef.current;
    if (!editor) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return;

    if (e.key === 'Backspace') {
      if (range.startContainer === editor && range.startOffset > 0) {
        const prevChild = editor.childNodes[range.startOffset - 1];
        const stay = editor.childNodes[range.startOffset];
        if (
          prevChild instanceof HTMLElement &&
          isDeletableImageBlockRoot(prevChild, editor)
        ) {
          e.preventDefault();
          prevChild.remove();
          handleInput();
          if (stay instanceof HTMLElement) placeCaretAtStart(stay);
          return;
        }
      }

      const blockStart = getContainingEditorChildIfCaretAtStart(range, editor);
      if (blockStart) {
        const prev = blockStart.previousElementSibling;
        if (prev instanceof HTMLElement && isDeletableImageBlockRoot(prev, editor)) {
          e.preventDefault();
          prev.remove();
          handleInput();
          placeCaretAtStart(blockStart);
        }
      }
      return;
    }

    if (e.key === 'Delete') {
      if (range.startContainer === editor && range.startOffset < editor.childNodes.length) {
        const nextChild = editor.childNodes[range.startOffset];
        if (
          nextChild instanceof HTMLElement &&
          isDeletableImageBlockRoot(nextChild, editor)
        ) {
          e.preventDefault();
          nextChild.remove();
          handleInput();
          return;
        }
      }

      const blockEnd = getContainingEditorChildIfCaretAtEnd(range, editor);
      if (blockEnd) {
        const next = blockEnd.nextElementSibling;
        if (next instanceof HTMLElement && isDeletableImageBlockRoot(next, editor)) {
          e.preventDefault();
          next.remove();
          handleInput();
          placeCaretAtStart(blockEnd);
        }
      }
    }
  };

  const applyImageFigureEdit = () => {
    const figure = editingFigureRef.current;
    if (!figure || !editorRef.current) return;
    const img = figure.querySelector('img');
    if (!img) return;

    const srcTrim = editImageSrc.trim();
    if (!srcTrim) {
      alert('画像のURLを入力してください');
      return;
    }

    img.setAttribute('src', srcTrim);
    img.setAttribute('alt', editImageAlt.trim());

    const copyrightText = editImageCopyright.trim();
    let copyEl = figure.querySelector('.image-copyright');
    if (copyrightText) {
      if (!copyEl) {
        copyEl = document.createElement('div');
        copyEl.className = 'image-copyright';
        (copyEl as HTMLElement).style.fontSize = '0.75rem';
        (copyEl as HTMLElement).style.color = '#6b7280';
        (copyEl as HTMLElement).style.marginBottom = '0.5rem';
        figure.insertBefore(copyEl, img);
      }
      copyEl.textContent = copyrightText;
    } else {
      copyEl?.remove();
    }

    const captionText = editImageCaption.trim();
    let capEl = figure.querySelector(
      'figcaption, p.image-caption'
    ) as HTMLElement | null;
    if (captionText) {
      if (!capEl) {
        const useFigcaption = figure.tagName.toLowerCase() === 'figure';
        capEl = useFigcaption
          ? document.createElement('figcaption')
          : document.createElement('p');
        capEl.className = 'image-caption';
        capEl.style.fontSize = '0.875rem';
        capEl.style.color = '#6b7280';
        capEl.style.marginTop = '0.5rem';
        capEl.style.textAlign = 'center';
        figure.appendChild(capEl);
      }
      capEl.textContent = captionText;
    } else {
      capEl?.remove();
    }

    editingFigureRef.current = null;
    setShowImageEditModal(false);
    setEditImageInputMethod('upload');
    setEditImageSrc('');
    setEditImageAlt('');
    setEditImageCaption('');
    setEditImageCopyright('');
    handleInput();
    editorRef.current.focus();
  };

  const closeImageEditModal = () => {
    editingFigureRef.current = null;
    setShowImageEditModal(false);
    setEditImageInputMethod('upload');
    setEditImageSrc('');
    setEditImageAlt('');
    setEditImageCaption('');
    setEditImageCopyright('');
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const insertShortcode = (shortcode: string) => {
    const selection = window.getSelection();
    if (selection && editorRef.current) {
      const range = selection.getRangeAt(0);
      const node = document.createTextNode(shortcode);
      range.insertNode(node);
      range.setStartAfter(node);
      range.setEndAfter(node);
      selection.removeAllRanges();
      selection.addRange(range);
      handleInput();
    }
  };

  // 画像アップロード
  const handleImageUpload = async (file: File) => {
    if (!currentTenant) {
      alert('サービスが選択されていません');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
        headers: {
          'x-media-id': currentTenant.id,
        },
      });

      if (response.ok) {
        const data = await response.json();
        insertImageWithCaption(data.url);
      } else {
        alert('画像のアップロードに失敗しました');
      }
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      alert('画像のアップロードに失敗しました');
    } finally {
      setUploadingImage(false);
    }
  };

  /** 編集モーダル用: アップロード後は URL のみ差し替え（挿入はしない） */
  const handleEditImageUpload = async (file: File) => {
    if (!currentTenant) {
      alert('サービスが選択されていません');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
        headers: {
          'x-media-id': currentTenant.id,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEditImageSrc(data.url);
      } else {
        alert('画像のアップロードに失敗しました');
      }
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      alert('画像のアップロードに失敗しました');
    } finally {
      setUploadingImage(false);
    }
  };

  // 画像URLから挿入
  const handleImageUrlInsert = () => {
    if (imageUrl) {
      insertImageWithCaption(imageUrl);
    }
  };

  // 画像モーダルを開く前にカーソル位置を保存
  const openImageModal = () => {
    if (!editorRef.current) {
      setShowImageModal(true);
      return;
    }

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        setSavedRange(range.cloneRange());
      }
    } else {
      const range = document.createRange();
      if (selection && selection.anchorNode && editorRef.current.contains(selection.anchorNode)) {
        range.setStart(selection.anchorNode, selection.anchorOffset);
        range.collapse(true);
        setSavedRange(range);
      }
    }
    setShowImageModal(true);
  };

  // 画像をキャプション付きで挿入
  const insertImageWithCaption = (url: string) => {
    if (!editorRef.current) return;

    let range: Range | null = null;

    // 保存されたカーソル位置を優先
    if (savedRange && editorRef.current.contains(savedRange.commonAncestorContainer)) {
      range = savedRange.cloneRange();
    } else {
      // フォールバック：現在の選択範囲 or エディタ末尾
      const selection = window.getSelection();
      editorRef.current.focus();
      if (selection && selection.rangeCount > 0) {
        const sel = selection.getRangeAt(0);
        if (editorRef.current.contains(sel.commonAncestorContainer)) {
          range = sel;
        }
      }
      if (!range) {
        range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
      }
    }

    const figure = document.createElement('figure');
    figure.className = 'image-figure';
    figure.style.margin = '1.5rem 0';
    
    // 著作権表記
    if (imageCopyright) {
      const copyright = document.createElement('div');
      copyright.className = 'image-copyright';
      copyright.textContent = imageCopyright;
      copyright.style.fontSize = '0.75rem';
      copyright.style.color = '#6b7280';
      copyright.style.marginBottom = '0.5rem';
      figure.appendChild(copyright);
    }
    
    // 画像（alt 専用入力があれば優先、なければキャプションを代替テキストに使う）
    const img = document.createElement('img');
    img.src = url;
    img.alt =
      imageAlt.trim() !== '' ? imageAlt.trim() : imageCaption || '';
    img.setAttribute('draggable', 'false');
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.borderRadius = '0.5rem';
    figure.appendChild(img);
    
    // キャプション
    if (imageCaption) {
      const figcaption = document.createElement('figcaption');
      figcaption.className = 'image-caption';
      figcaption.textContent = imageCaption;
      figcaption.style.fontSize = '0.875rem';
      figcaption.style.color = '#6b7280';
      figcaption.style.marginTop = '0.5rem';
      figcaption.style.textAlign = 'center';
      figure.appendChild(figcaption);
    }

    editorRef.current.focus();
    range.insertNode(figure);
    range.setStartAfter(figure);
    range.setEndAfter(figure);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    handleInput();
    setSavedRange(null);
    setShowImageModal(false);
    setImageUrl('');
    setImageCaption('');
    setImageAlt('');
    setImageCopyright('');
  };

  // テーブル挿入
  const insertTable = () => {
    let tableHTML = '<table class="custom-table" style="width: 100%; border-collapse: collapse; margin: 1.5rem 0;">';
    
    // ヘッダー行
    tableHTML += '<thead><tr>';
    for (let j = 0; j < tableCols; j++) {
      tableHTML += '<th style="border: 1px solid #d1d5db; padding: 0.75rem; background-color: #f3f4f6; font-weight: 600;">ヘッダー</th>';
    }
    tableHTML += '</tr></thead>';
    
    // データ行
    tableHTML += '<tbody>';
    for (let i = 1; i < tableRows; i++) {
      tableHTML += '<tr>';
      for (let j = 0; j < tableCols; j++) {
        tableHTML += '<td style="border: 1px solid #d1d5db; padding: 0.75rem;">セル</td>';
      }
      tableHTML += '</tr>';
    }
    tableHTML += '</tbody></table>';
    
    document.execCommand('insertHTML', false, tableHTML);
    handleInput();
    setShowTableModal(false);
  };

  // 参照ブロック挿入
  const insertReferenceBlock = () => {
    const text = prompt('参照元を入力:');
    if (text) {
      const referenceHTML = `<div class="reference-block" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 1rem; margin: 1.5rem 0; border-radius: 0.5rem;"><strong style="color: #1e40af;">参照：</strong><span style="color: #1e40af;">${text}</span></div>`;
      document.execCommand('insertHTML', false, referenceHTML);
      handleInput();
    }
  };

  // 目次プレースホルダー挿入
  const insertTableOfContents = () => {
    if (!editorRef.current) return;

    const existing = editorRef.current.querySelector('.toc-placeholder');
    if (existing) {
      alert('目次は記事内に1つだけ挿入できます。既存の目次を削除してから再度挿入してください。');
      return;
    }

    const tocBlock = document.createElement('div');
    tocBlock.className = 'toc-placeholder not-prose';
    tocBlock.setAttribute('contenteditable', 'false');
    tocBlock.setAttribute('data-toc', 'auto');
    tocBlock.innerHTML = TOC_PLACEHOLDER_EDITOR_INNER_HTML;

    const selection = window.getSelection();
    let range: Range;

    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
      if (!editorRef.current.contains(range.commonAncestorContainer)) {
        range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
      }
    } else {
      range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
    }

    range.insertNode(tocBlock);

    const br = document.createElement('br');
    if (tocBlock.nextSibling) {
      tocBlock.parentNode?.insertBefore(br, tocBlock.nextSibling);
    } else {
      tocBlock.parentNode?.appendChild(br);
    }

    range.setStartAfter(br);
    range.collapse(true);
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    handleInput();
  };

  // 引用ブロック挿入
  const insertQuoteBlock = () => {
    document.execCommand('formatBlock', false, '<blockquote>');
    handleInput();
  };

  // HTML挿入モーダルを開く前にカーソル位置を保存
  const openHtmlModal = () => {
    if (!editorRef.current) {
      setShowHtmlModal(true);
      return;
    }

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      // エディタ内での選択かチェック
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        // カーソル位置を保存
        setSavedRange(range.cloneRange());
      }
    } else {
      // 選択範囲がない場合は、現在のカーソル位置を取得
      const range = document.createRange();
      if (selection && selection.anchorNode && editorRef.current.contains(selection.anchorNode)) {
        range.setStart(selection.anchorNode, selection.anchorOffset);
        range.collapse(true);
        setSavedRange(range);
      }
    }
    setShowHtmlModal(true);
  };

  // HTML挿入（HTMLブロックとして挿入）
  const insertHtml = () => {
    if (!htmlContent.trim()) {
      alert('HTMLコードを入力してください');
      return;
    }

    if (!editorRef.current) {
      alert('エディターが初期化されていません');
      return;
    }

    try {
      let range: Range | null = null;
      
      // 保存されたカーソル位置を使用
      if (savedRange && editorRef.current.contains(savedRange.commonAncestorContainer)) {
        range = savedRange.cloneRange();
      } else {
        // 保存された位置が無効な場合は、現在の選択範囲を使用
        const selection = window.getSelection();
        editorRef.current.focus();
        
        if (selection && selection.rangeCount > 0) {
          range = selection.getRangeAt(0);
          
          // エディタ内での選択かチェック
          if (!editorRef.current.contains(range.commonAncestorContainer)) {
            // エディタ外の場合は、エディタの最後に挿入
            range = document.createRange();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
          }
        } else {
          // 選択範囲がない場合は、カーソル位置に挿入
          range = document.createRange();
          if (selection && selection.anchorNode && editorRef.current.contains(selection.anchorNode)) {
            range.setStart(selection.anchorNode, selection.anchorOffset);
            range.collapse(true);
          } else {
            // カーソルがエディタ内にない場合、エディタの最後に挿入
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
          }
        }
      }
      
      if (!range) {
        alert('カーソル位置を取得できませんでした');
        return;
      }
      
      // エディターにフォーカスを設定
      editorRef.current.focus();
      
      // 保存された範囲がまだ有効か確認し、必要に応じて再設定
      try {
        // 範囲が有効かテスト
        range.getBoundingClientRect();
      } catch (e) {
        // 範囲が無効な場合は、現在のカーソル位置を使用
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          range = selection.getRangeAt(0);
          if (!editorRef.current.contains(range.commonAncestorContainer)) {
            range = document.createRange();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
          }
        } else {
          range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
        }
      }
      
      // HTMLブロックとして挿入
      const blockId = `html-block-${Date.now()}`;
      const htmlBlock = document.createElement('div');
      htmlBlock.className = 'html-block';
      htmlBlock.setAttribute('data-html-id', blockId);
      htmlBlock.setAttribute('data-mode', 'source');
      htmlBlock.setAttribute('contenteditable', 'false');
      htmlBlock.setAttribute('draggable', 'true');
      // HTMLコンテンツをdata属性に保存（エスケープ）
      htmlBlock.setAttribute('data-html-content', encodeURIComponent(htmlContent.trim()));
      
      // ツールバーとソースコード表示を含むHTMLを構築
      const formattedHtml = formatHtml(htmlContent.trim());
      htmlBlock.innerHTML = createHtmlBlockContent(blockId, formattedHtml, 'source');
      
      // 新しいブロックのモードを設定
      setHtmlBlockModes(prev => ({ ...prev, [blockId]: 'source' }));
      
      // ブロックを挿入
      range.insertNode(htmlBlock);
      
      // 挿入後に改行を追加（次の入力のため）
      const br = document.createElement('br');
      if (htmlBlock.nextSibling) {
        htmlBlock.parentNode?.insertBefore(br, htmlBlock.nextSibling);
      } else {
        htmlBlock.parentNode?.appendChild(br);
      }
      
      // カーソルを挿入した要素の後に移動
      range.setStartAfter(br);
      range.collapse(true);
      
      // 選択範囲を更新
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // エディターの内容を更新
      handleInput();
      
      // 保存された範囲をクリア
      setSavedRange(null);
      
      // モーダルを閉じる
      setShowHtmlModal(false);
      setHtmlContent('');
      
    } catch (error) {
      console.error('HTML挿入エラー:', error);
      alert('HTMLの挿入に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
      setSavedRange(null);
    }
  };

  // HTMLエスケープ
  const escapeHtml = (html: string): string => {
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // HTMLブロックのコンテンツを作成
  const createHtmlBlockContent = (blockId: string, formattedHtml: string, mode: 'source' | 'preview'): string => {
    if (mode === 'preview') {
      // プレビューモード：ツールバー + 実際のHTML
      const htmlContent = decodeURIComponent(
        editorRef.current?.querySelector(`[data-html-id="${blockId}"]`)?.getAttribute('data-html-content') || ''
      ) || formattedHtml;
      return `<div class="html-block-toolbar" data-toolbar-for="${blockId}"><span class="html-block-drag-handle" draggable="true" title="ドラッグして移動">⋮⋮</span><div class="html-block-tabs"><button type="button" class="html-block-btn" data-action="toggle-mode" data-block-id="${blockId}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>HTML</button><button type="button" class="html-block-btn active" data-action="toggle-mode" data-block-id="${blockId}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>プレビュー</button></div><div class="html-block-spacer"></div><button type="button" class="html-block-menu-btn html-block-delete-btn" data-action="delete" data-block-id="${blockId}" title="削除"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></div><div class="html-block-preview-content">${htmlContent}</div>`;
    } else {
      // ソースモード：ツールバー + textarea
      return `<div class="html-block-toolbar" data-toolbar-for="${blockId}"><span class="html-block-drag-handle" draggable="true" title="ドラッグして移動">⋮⋮</span><div class="html-block-tabs"><button type="button" class="html-block-btn active" data-action="toggle-mode" data-block-id="${blockId}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>HTML</button><button type="button" class="html-block-btn" data-action="toggle-mode" data-block-id="${blockId}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>プレビュー</button></div><div class="html-block-spacer"></div><button type="button" class="html-block-menu-btn html-block-delete-btn" data-action="delete" data-block-id="${blockId}" title="削除"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></div><textarea class="html-block-textarea" data-block-id="${blockId}" spellcheck="false">${escapeHtml(formattedHtml)}</textarea>`;
    }
  };

  // HTMLアンエスケープ
  const unescapeHtml = (html: string): string => {
    return html
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&amp;/g, '&');
  };

  // フォントサイズ変更
  const applyFontSize = () => {
    if (!editorRef.current) return;
    const editor = editorRef.current;

    const selection = window.getSelection();
    let range: Range | null = null;
    const saved = fontSizeSavedRangeRef.current;
    if (saved) {
      try {
        if (
          editor.contains(saved.startContainer) &&
          editor.contains(saved.endContainer)
        ) {
          range = saved.cloneRange();
        }
      } catch {
        range = null;
      }
    }
    if (!range && selection && selection.rangeCount > 0) {
      const r = selection.getRangeAt(0);
      if (editor.contains(r.commonAncestorContainer)) {
        range = r.cloneRange();
      }
    }
    if (!range) {
      alert('テキストを選択してください');
      return;
    }

    selection?.removeAllRanges();
    selection?.addRange(range);

    // 選択範囲がエディタ内にあるかチェック
    if (!editor.contains(range.commonAncestorContainer)) {
      alert('エディタ内のテキストを選択してください');
      return;
    }

    // 選択範囲が空の場合は、カーソル位置にテキストノードを作成
    if (range.collapsed) {
      const textNode = document.createTextNode('\u200B'); // ゼロ幅スペース
      range.insertNode(textNode);
      range.selectNodeContents(textNode);
    }

    const px = `${fontSize}px`;
    const segments = collectTextSegmentsInRange(range);
    let lastSpan: HTMLElement | null = null;

    if (segments.length > 0) {
      for (const { t, start, end } of segments) {
        const r = document.createRange();
        r.setStart(t, start);
        r.setEnd(t, end);
        const span = document.createElement('span');
        span.style.fontSize = px;
        r.surroundContents(span);
        lastSpan = span;
      }
    } else {
      const span = document.createElement('span');
      span.style.fontSize = px;
      try {
        range.surroundContents(span);
      } catch {
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
      }
      lastSpan = span;
    }

    const selAfter = window.getSelection();
    selAfter?.removeAllRanges();
    const newRange = document.createRange();
    if (lastSpan) {
      newRange.setStartAfter(lastSpan);
      newRange.collapse(true);
      selAfter?.addRange(newRange);
    }

    handleInput();
    fontSizeSavedRangeRef.current = null;
    setShowFontSizeModal(false);
    editor.focus();
  };

  // フォントサイズモーダルを開く際に、選択範囲のフォントサイズを取得
  const openFontSizeModal = () => {
    fontSizeSavedRangeRef.current = null;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current) {
      const range = selection.getRangeAt(0);
      
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        try {
          fontSizeSavedRangeRef.current = range.cloneRange();
        } catch {
          fontSizeSavedRangeRef.current = null;
        }
        // 選択範囲または親要素からフォントサイズを取得
        let element: Node | null = range.commonAncestorContainer;
        if (element.nodeType === Node.TEXT_NODE) {
          element = element.parentElement;
        }
        
        if (element && element.nodeType === Node.ELEMENT_NODE) {
          const computedStyle = window.getComputedStyle(element as Element);
          const fontSize = computedStyle.fontSize;
          if (fontSize) {
            const fontSizeNum = parseFloat(fontSize);
            if (!isNaN(fontSizeNum)) {
              setFontSize(Math.round(fontSizeNum).toString());
            }
          }
        }
      }
    }
    setShowFontSizeModal(true);
  };

  // ツールバーボタンコンポーネント
  const ToolbarButton = ({ 
    onClick, 
    title, 
    children 
  }: { 
    onClick: () => void; 
    title: string; 
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()} // フォーカスを失わないように
      className="px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
      title={title}
    >
      {children}
    </button>
  );

  // ツールバーの左端位置を計算（サイドバー幅256px + マージンを考慮）
  const getToolbarLeftPosition = () => {
    const sidebarWidth = typeof window !== 'undefined' && window.innerWidth >= 1024 ? 256 : 0;
    const minLeft = sidebarWidth + 20; // サイドバー + マージン
    const toolbarWidth = 600; // ツールバーの概算幅
    
    // ツールバーの中心位置から左端位置を計算
    let leftEdge = toolbarPosition.left - toolbarWidth / 2;
    
    // 左端がサイドバーより左にならないように調整
    if (leftEdge < minLeft) {
      leftEdge = minLeft;
    }
    
    // 右端が画面外に出ないように調整
    const maxLeft = (typeof window !== 'undefined' ? window.innerWidth : 1200) - toolbarWidth - 20;
    if (leftEdge > maxLeft) {
      leftEdge = Math.max(minLeft, maxLeft);
    }
    
    return leftEdge;
  };

  return (
    <div className="relative" style={{ position: 'relative', zIndex: 1 }}>
      {/* フローティングツールバー（選択時/カーソル移動時） */}
      {showToolbar &&
        (!ENABLE_EDITOR_HTML_SOURCE_VIEW || editorViewMode === 'visual') && (
        <div
          className="fixed z-[100] bg-white border border-gray-200 rounded-xl shadow-custom p-2 flex gap-1 animate-fadeIn"
          style={{ 
            top: `${toolbarPosition.top}px`, 
            left: `${getToolbarLeftPosition()}px`,
            whiteSpace: 'nowrap',
            flexWrap: 'nowrap'
          }}
        >
          <ToolbarButton onClick={() => execCommand('bold')} title="太字 (Ctrl+B)">
            <strong className="text-sm">B</strong>
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand('italic')} title="斜体 (Ctrl+I)">
            <em className="text-sm">I</em>
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand('underline')} title="下線 (Ctrl+U)">
            <u className="text-sm">U</u>
          </ToolbarButton>
          
          <div className="w-px bg-gray-300 mx-1" />
          
          <ToolbarButton onClick={() => execCommand('formatBlock', '<h2>')} title="見出し2">
            <span className="text-xs">H2</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand('formatBlock', '<h3>')} title="見出し3">
            <span className="text-xs">H3</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand('formatBlock', '<h4>')} title="見出し4">
            <span className="text-xs">H4</span>
          </ToolbarButton>
          
          <div className="w-px bg-gray-300 mx-1" />
          
          <ToolbarButton
            onClick={() => {
              const url = prompt('リンクURL:');
              if (url) execCommand('createLink', url);
            }}
            title="リンク"
          >
            🔗
          </ToolbarButton>
          
          <ToolbarButton onClick={openImageModal} title="画像を挿入">
            🖼️
          </ToolbarButton>

          <div className="w-px bg-gray-300 mx-1" />

          <ToolbarButton onClick={() => execCommand('insertUnorderedList')} title="箇条書き">
            ●
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand('insertOrderedList')} title="番号付きリスト">
            <span className="text-xs">1.</span>
          </ToolbarButton>

          <div className="w-px bg-gray-300 mx-1" />

          <ToolbarButton onClick={() => setShowTableModal(true)} title="表を挿入">
            📊
          </ToolbarButton>
          <ToolbarButton onClick={insertQuoteBlock} title="引用">
            💬
          </ToolbarButton>
          <ToolbarButton onClick={insertTableOfContents} title="目次を挿入">
            <span className="text-xs">目次</span>
          </ToolbarButton>
          
          <div className="w-px bg-gray-300 mx-1" />
          
          <ToolbarButton onClick={openHtmlModal} title="HTML挿入">
            &lt;/&gt;
          </ToolbarButton>
          
          <div className="w-px bg-gray-300 mx-1" />
          
          <ToolbarButton onClick={openFontSizeModal} title="フォントサイズ">
            <span className="text-xs">A</span>
            <span className="text-[10px]">大小</span>
          </ToolbarButton>
        </div>
      )}

      {ENABLE_EDITOR_HTML_SOURCE_VIEW && (
        <div className="flex items-center gap-1 mb-2 border-b border-gray-200 pb-2">
          <button
            type="button"
            onClick={() => switchEditorView('visual')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              editorViewMode === 'visual'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            ビジュアル
          </button>
          <button
            type="button"
            onClick={() => switchEditorView('source')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              editorViewMode === 'source'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            HTMLソース
          </button>
          {editorViewMode === 'source' && (
            <span className="ml-2 text-xs text-gray-500">HTMLを直接編集できます</span>
          )}
        </div>
      )}

      {/* エディター */}
      <div className="relative" style={{ minHeight: '500px' }}>
        {ENABLE_EDITOR_HTML_SOURCE_VIEW && editorViewMode === 'source' ? (
          <textarea
            value={sourceHtml}
            onChange={(e) => handleSourceHtmlChange(e.target.value)}
            className="min-h-[500px] w-full p-4 font-mono text-sm leading-relaxed text-gray-800 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            spellCheck={false}
            aria-label="記事本文 HTMLソース"
          />
        ) : null}
        <div
          ref={editorRef}
          contentEditable={
            !ENABLE_EDITOR_HTML_SOURCE_VIEW || editorViewMode === 'visual'
          }
          suppressContentEditableWarning={ENABLE_EDITOR_HTML_SOURCE_VIEW}
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={handleEditorKeyDown}
          onDragOver={(e) => {
            if (draggingBlockId) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }
          }}
          onDrop={(e) => {
            if (draggingBlockId) {
              e.preventDefault();
              const target = e.target as HTMLElement;
              const targetBlock = target.closest('.html-block') as HTMLElement;
              
              if (targetBlock && editorRef.current) {
                const targetBlockId = targetBlock.getAttribute('data-html-id');
                if (targetBlockId && targetBlockId !== draggingBlockId) {
                  const draggedBlock = editorRef.current.querySelector(`[data-html-id="${draggingBlockId}"]`);
                  if (draggedBlock) {
                    const rect = targetBlock.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    
                    if (e.clientY < midY) {
                      targetBlock.parentNode?.insertBefore(draggedBlock, targetBlock);
                    } else {
                      targetBlock.parentNode?.insertBefore(draggedBlock, targetBlock.nextSibling);
                    }
                    
                    handleInput();
                  }
                }
              }
              setDraggingBlockId(null);
            }
          }}
          className={`min-h-[500px] p-6 focus:outline-none prose prose-lg max-w-none bg-white border border-gray-300 rounded-xl article-content ${
            ENABLE_EDITOR_HTML_SOURCE_VIEW && editorViewMode === 'source'
              ? 'hidden'
              : ''
          }`}
          style={{
            whiteSpace: 'pre-wrap',
            color: theme.textColor,
          }}
          data-placeholder={placeholder || '本文を入力...'}
        />
        
      </div>

      {/* 画像挿入モーダル */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[150]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-custom text-gray-900">
            <h3 className="text-xl font-bold mb-4 text-gray-900">画像を挿入</h3>
            
            {/* タブ切り替え */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setImageInputMethod('upload')}
                className={`flex-1 px-3 py-2 rounded-xl font-medium transition-colors text-sm ${
                  imageInputMethod === 'upload' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                アップロード
              </button>
              <button
                type="button"
                onClick={() => setImageInputMethod('ai')}
                className={`flex-1 px-3 py-2 rounded-xl font-medium transition-colors text-sm ${
                  imageInputMethod === 'ai' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🎨 AI生成
              </button>
              <button
                type="button"
                onClick={() => setImageInputMethod('url')}
                className={`flex-1 px-3 py-2 rounded-xl font-medium transition-colors text-sm ${
                  imageInputMethod === 'url' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                URL指定
              </button>
            </div>

            {imageInputMethod === 'upload' ? (
              <div>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors mb-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    className="hidden"
                    id="image-upload-editor"
                    disabled={uploadingImage}
                  />
                  <label htmlFor="image-upload-editor" className="cursor-pointer">
                    <div className="mb-3">
                      <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">
                      {uploadingImage ? 'アップロード中...' : 'クリックして画像を選択'}
                    </p>
                  </label>
                </div>
                
                {/* 著作権表記 */}
                <input
                  type="text"
                  value={imageCopyright}
                  onChange={(e) => setImageCopyright(e.target.value)}
                  placeholder="著作権表記（例：©企業名）"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                />

                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  代替テキスト（alt）<span className="text-gray-400 font-normal">任意</span>
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="スクリーンリーダー用。未入力時はキャプションを使います"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1"
                />
                <p className="text-xs text-gray-500 mb-3">
                  SEO・アクセシビリティ用。キャプションと別の説明にしたい場合に入力してください。
                </p>
                
                {/* キャプション */}
                <input
                  type="text"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="画像キャプション（例：画像元：～）"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : imageInputMethod === 'ai' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  代替テキスト（alt）<span className="text-gray-400 font-normal">任意</span>
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="スクリーンリーダー用。未入力時はキャプションを使います"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3"
                />
                <ImageGenerator
                  onImageGenerated={(url) => {
                    setImageUrl(url);
                    // AI生成画像を直接挿入
                    insertImageWithCaption(url);
                    // モーダルを閉じる
                    setShowImageModal(false);
                    setImageUrl('');
                    setImageCaption('');
                    setImageAlt('');
                    setImageCopyright('');
                  }}
                  articleTitle=""
                  articleContent={value}
                />
              </div>
            ) : (
              <div>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                />
                
                {/* 著作権表記 */}
                <input
                  type="text"
                  value={imageCopyright}
                  onChange={(e) => setImageCopyright(e.target.value)}
                  placeholder="著作権表記（例：©企業名）"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                />

                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  代替テキスト（alt）<span className="text-gray-400 font-normal">任意</span>
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="スクリーンリーダー用。未入力時はキャプションを使います"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1"
                />
                <p className="text-xs text-gray-500 mb-3">
                  SEO・アクセシビリティ用。キャプションと別の説明にしたい場合に入力してください。
                </p>
                
                {/* キャプション */}
                <input
                  type="text"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="画像キャプション（例：画像元：～）"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                />
                
                <button
                  type="button"
                  onClick={handleImageUrlInsert}
                  disabled={!imageUrl}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  画像を挿入
                </button>
              </div>
            )}

            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowImageModal(false);
                  setImageUrl('');
                  setImageCaption('');
                  setImageAlt('');
                  setImageCopyright('');
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-900"
                disabled={uploadingImage}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 挿入済み画像の編集（画像挿入モーダルと同一のタブ UI） */}
      {showImageEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[150]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-custom text-gray-900">
            <h3 className="text-xl font-bold mb-4 text-gray-900">画像の設定を編集</h3>

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setEditImageInputMethod('upload')}
                className={`flex-1 px-3 py-2 rounded-xl font-medium transition-colors text-sm ${
                  editImageInputMethod === 'upload'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                アップロード
              </button>
              <button
                type="button"
                onClick={() => setEditImageInputMethod('ai')}
                className={`flex-1 px-3 py-2 rounded-xl font-medium transition-colors text-sm ${
                  editImageInputMethod === 'ai'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🎨 AI生成
              </button>
              <button
                type="button"
                onClick={() => setEditImageInputMethod('url')}
                className={`flex-1 px-3 py-2 rounded-xl font-medium transition-colors text-sm ${
                  editImageInputMethod === 'url'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                URL指定
              </button>
            </div>

            {editImageInputMethod === 'upload' ? (
              <div>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors mb-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleEditImageUpload(file);
                    }}
                    className="hidden"
                    id="image-upload-editor-edit"
                    disabled={uploadingImage}
                  />
                  <label htmlFor="image-upload-editor-edit" className="cursor-pointer">
                    <div className="mb-3">
                      <svg
                        className="w-16 h-16 text-gray-400 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">
                      {uploadingImage ? 'アップロード中...' : 'クリックして画像を選択'}
                    </p>
                  </label>
                </div>

                <input
                  type="text"
                  value={editImageCopyright}
                  onChange={(e) => setEditImageCopyright(e.target.value)}
                  placeholder="著作権表記（例：©企業名）"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                />

                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  代替テキスト（alt）<span className="text-gray-400 font-normal">任意</span>
                </label>
                <input
                  type="text"
                  value={editImageAlt}
                  onChange={(e) => setEditImageAlt(e.target.value)}
                  placeholder="スクリーンリーダー用。未入力時はキャプションを使います"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1"
                />
                <p className="text-xs text-gray-500 mb-3">
                  SEO・アクセシビリティ用。キャプションと別の説明にしたい場合に入力してください。
                </p>

                <input
                  type="text"
                  value={editImageCaption}
                  onChange={(e) => setEditImageCaption(e.target.value)}
                  placeholder="画像キャプション（例：画像元：～）"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : editImageInputMethod === 'ai' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  代替テキスト（alt）<span className="text-gray-400 font-normal">任意</span>
                </label>
                <input
                  type="text"
                  value={editImageAlt}
                  onChange={(e) => setEditImageAlt(e.target.value)}
                  placeholder="スクリーンリーダー用。未入力時はキャプションを使います"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3"
                />
                <ImageGenerator
                  onImageGenerated={(url) => {
                    setEditImageSrc(url);
                  }}
                  articleTitle=""
                  articleContent={value}
                />
              </div>
            ) : (
              <div>
                <input
                  type="url"
                  value={editImageSrc}
                  onChange={(e) => setEditImageSrc(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                />

                <input
                  type="text"
                  value={editImageCopyright}
                  onChange={(e) => setEditImageCopyright(e.target.value)}
                  placeholder="著作権表記（例：©企業名）"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                />

                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  代替テキスト（alt）<span className="text-gray-400 font-normal">任意</span>
                </label>
                <input
                  type="text"
                  value={editImageAlt}
                  onChange={(e) => setEditImageAlt(e.target.value)}
                  placeholder="スクリーンリーダー用。未入力時はキャプションを使います"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1"
                />
                <p className="text-xs text-gray-500 mb-3">
                  SEO・アクセシビリティ用。キャプションと別の説明にしたい場合に入力してください。
                </p>

                <input
                  type="text"
                  value={editImageCaption}
                  onChange={(e) => setEditImageCaption(e.target.value)}
                  placeholder="画像キャプション（例：画像元：～）"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                />
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={applyImageFigureEdit}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                反映
              </button>
              <button
                type="button"
                onClick={closeImageEditModal}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-900"
                disabled={uploadingImage}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* テーブル挿入モーダル */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[150]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-custom text-gray-900">
            <h3 className="text-xl font-bold mb-4 text-gray-900">表を挿入</h3>
            
            {/* 行数 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                行数
              </label>
              <input
                type="number"
                min="2"
                max="20"
                value={tableRows}
                onChange={(e) => setTableRows(parseInt(e.target.value) || 2)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* 列数 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                列数
              </label>
              <input
                type="number"
                min="2"
                max="10"
                value={tableCols}
                onChange={(e) => setTableCols(parseInt(e.target.value) || 2)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={insertTable}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                挿入
              </button>
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-900"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HTML挿入モーダル */}
      {showHtmlModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[150]">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 shadow-custom max-h-[90vh] overflow-y-auto text-gray-900">
            <h3 className="text-xl font-bold mb-4 text-gray-900">HTML挿入</h3>
            <p className="text-sm text-gray-600 mb-4">
              スクリプトタグ、Googleマップ、YouTube埋め込みなどのHTMLコードを直接挿入できます。
            </p>

            {/* ショートコード選択プルダウン */}
            {theme.htmlShortcodes && theme.htmlShortcodes.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ショートコードから挿入
                </label>
                <select
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    if (selectedId) {
                      const shortcode = theme.htmlShortcodes?.find(s => s.id === selectedId);
                      if (shortcode) {
                        setHtmlContent(shortcode.htmlCode);
                      }
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  defaultValue=""
                >
                  <option value="">-- ショートコードを選択 --</option>
                  {theme.htmlShortcodes.map((shortcode) => (
                    <option key={shortcode.id} value={shortcode.id}>
                      {shortcode.label || '(ラベル未設定)'}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                HTMLコード
              </label>
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="例: <script>...</script> または <iframe src=&quot;...&quot;></iframe>"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-gray-900"
                style={{ color: '#111827' }}
                rows={10}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800">
                <strong>使用例:</strong><br />
                Googleマップ: <code className="text-xs">&lt;iframe src=&quot;https://www.google.com/maps/embed?pb=...&quot;&gt;&lt;/iframe&gt;</code><br />
                YouTube: <code className="text-xs">&lt;iframe src=&quot;https://www.youtube.com/embed/VIDEO_ID&quot;&gt;&lt;/iframe&gt;</code><br />
                スクリプト: <code className="text-xs">&lt;script&gt;...&lt;/script&gt;</code>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  insertHtml();
                }}
                disabled={!htmlContent.trim()}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                挿入
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowHtmlModal(false);
                  setHtmlContent('');
                  setSavedRange(null);
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-900"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フォントサイズ変更モーダル */}
      {showFontSizeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[150]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-custom text-gray-900">
            <h3 className="text-xl font-bold mb-4 text-gray-900">フォントサイズ変更</h3>
            <p className="text-sm text-gray-600 mb-4">
              テキストを選択してから、フォントサイズを変更してください。
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                フォントサイズ (px)
              </label>
              <input
                type="number"
                min="8"
                max="72"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                style={{ color: '#111827' }}
                placeholder="16"
              />
            </div>

            {/* よく使うサイズのクイック選択 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                よく使うサイズ
              </label>
              <div className="flex flex-wrap gap-2">
                {['12', '14', '16', '18', '20', '24', '28', '32'].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setFontSize(size);
                    }}
                    className={`px-3 py-2 rounded-lg border transition-colors ${
                      fontSize === size
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {size}px
                  </button>
                ))}
              </div>
            </div>

            {/* プレビュー */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-2">プレビュー:</p>
              <p style={{ fontSize: `${fontSize}px` }} className="text-gray-800">
                サンプルテキスト (Sample Text)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  applyFontSize();
                }}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                適用
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!editorRef.current) return;
                  const ed = editorRef.current;
                  let range: Range | null = null;
                  const saved = fontSizeSavedRangeRef.current;
                  if (saved) {
                    try {
                      if (ed.contains(saved.startContainer) && ed.contains(saved.endContainer)) {
                        range = saved.cloneRange();
                      }
                    } catch {
                      range = null;
                    }
                  }
                  const sel = window.getSelection();
                  if (!range && sel && sel.rangeCount > 0) {
                    const r = sel.getRangeAt(0);
                    if (ed.contains(r.commonAncestorContainer)) range = r.cloneRange();
                  }
                  if (!range) {
                    fontSizeSavedRangeRef.current = null;
                    setShowFontSizeModal(false);
                    return;
                  }
                  sel?.removeAllRanges();
                  sel?.addRange(range);
                  // 選択範囲内のspan要素からfontSizeスタイルを削除
                  const spanElements =
                    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
                      ? (range.commonAncestorContainer as Element).querySelectorAll(
                          'span[style*="font-size"]'
                        )
                      : [];

                  spanElements.forEach((span) => {
                    const element = span as HTMLElement;
                    if (element.style.fontSize) {
                      element.style.fontSize = '';
                      if (!element.style.cssText.trim()) {
                        element.outerHTML = element.innerHTML;
                      }
                    }
                  });

                  handleInput();
                  fontSizeSavedRangeRef.current = null;
                  setShowFontSizeModal(false);
                  ed.focus();
                }}
                className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 text-sm text-gray-900"
              >
                リセット
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fontSizeSavedRangeRef.current = null;
                  setShowFontSizeModal(false);
                  setFontSize('16');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-900"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* エディタ内のスタイル適用 */}
      <style jsx global>{`
        [contenteditable="true"] {
          line-height: 2.0;
          letter-spacing: 0.02em;
        }

        [contenteditable="true"] p {
          line-height: 2.0;
          letter-spacing: 0.02em;
          margin-bottom: 1.5em;
        }

        [contenteditable="true"] h2 {
          color: #111827;
          margin: 2em 0 1em 0;
          padding-bottom: 0.5em;
          font-size: 1.375rem;
          font-weight: 700;
          line-height: 1.6;
          letter-spacing: 0.02em;
          position: relative;
          border-bottom: none;
        }
        
        [contenteditable="true"] h2::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 6px;
          background-color: ${theme.primaryColor || '#3b82f6'};
          border-radius: 3px;
        }

        [contenteditable="true"] h3 {
          color: #1f2937;
          margin: 1.8em 0 0.8em 0;
          padding-bottom: 0.5em;
          padding-left: 0;
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.6;
          letter-spacing: 0.02em;
          position: relative;
          border-bottom: none;
          border-left: none;
        }
        
        [contenteditable="true"] h3::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background-color: ${theme.primaryColor || '#3b82f6'};
          border-radius: 1.5px;
        }

        [contenteditable="true"] h4 {
          color: #374151;
          margin: 1.5em 0 0.6em 0;
          padding-bottom: 0.25em;
          font-size: 1.125rem;
          font-weight: 600;
          line-height: 1.6;
          letter-spacing: 0.02em;
          border-bottom: 2px solid ${theme.primaryColor || '#3b82f6'};
        }

        [contenteditable="true"] a {
          color: ${theme.linkColor};
          text-decoration: underline;
        }

        [contenteditable="true"] a:hover {
          color: ${theme.linkHoverColor};
        }

        /* リスト */
        [contenteditable="true"] ul,
        [contenteditable="true"] ol {
          line-height: 2.0;
          letter-spacing: 0.02em;
          counter-reset: list-counter;
          list-style: none;
          padding-left: 0;
          margin: 1.5rem 0;
        }

        [contenteditable="true"] ol {
          counter-reset: list-counter;
        }

        [contenteditable="true"] li {
          margin-bottom: 0.75em;
          padding: 0.75em 1em;
          background: transparent;
          border: 2px solid ${theme.borderColor || '#e5e7eb'};
          border-radius: 8px;
          position: relative;
          counter-increment: list-counter;
          font-size: 0.9em;
        }

        [contenteditable="true"] ol > li::before {
          content: "No. " counter(list-counter);
          display: inline-block;
          margin-right: 0.5em;
          font-weight: 700;
          color: ${theme.primaryColor || '#3b82f6'};
          font-size: 0.875em;
          position: static;
        }

        [contenteditable="true"] ul > li::before {
          content: "";
        }

        /* 引用 */
        [contenteditable="true"] blockquote {
          background-color: ${theme.quoteBackgroundColor};
          border-left: 4px solid ${theme.quoteBorderColor};
          color: ${theme.quoteTextColor};
          padding: 1rem 1.5rem;
          margin: 1.5rem 0;
          border-radius: 0.5rem;
          font-style: italic;
        }

        /* 参照ブロック */
        [contenteditable="true"] .reference-block {
          background-color: ${theme.referenceBackgroundColor};
          border-left: 4px solid ${theme.referenceBorderColor};
          color: ${theme.referenceTextColor};
          padding: 1rem;
          margin: 1.5rem 0;
          border-radius: 0.5rem;
        }

        /* テーブル */
        [contenteditable="true"] table.custom-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin: 1.5rem 0;
          border: 1px solid ${theme.tableBorderColor};
          border-radius: 8px;
          overflow: hidden;
          font-size: 0.875rem;
        }

        [contenteditable="true"] table.custom-table th {
          background-color: ${theme.tableHeaderBackgroundColor};
          color: ${theme.tableHeaderTextColor};
          border-bottom: 2px solid ${theme.tableBorderColor};
          padding: 0.75rem;
          font-weight: 600;
          text-align: left;
        }

        [contenteditable="true"] table.custom-table thead tr:first-child th:first-child {
          border-top-left-radius: 7px;
        }

        [contenteditable="true"] table.custom-table thead tr:first-child th:last-child {
          border-top-right-radius: 7px;
        }

        [contenteditable="true"] table.custom-table td {
          border-bottom: 1px solid ${theme.tableBorderColor};
          padding: 0.75rem;
        }

        [contenteditable="true"] table.custom-table tbody tr:last-child td {
          border-bottom: none;
        }

        [contenteditable="true"] table.custom-table tbody tr:last-child td:first-child {
          border-bottom-left-radius: 7px;
        }

        [contenteditable="true"] table.custom-table tbody tr:last-child td:last-child {
          border-bottom-right-radius: 7px;
        }

        [contenteditable="true"] table.custom-table tr:nth-child(even) {
          background-color: ${theme.tableStripedColor};
        }

        /* 画像関連 */
        [contenteditable="true"] .image-figure {
          position: relative;
          margin: 1.5rem 0;
          min-height: 60px;
        }

        [contenteditable="true"] .image-copyright {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }

        [contenteditable="true"] .image-caption {
          font-size: 0.875rem;
          color: #6b7280;
          margin-top: 0.5rem;
          text-align: center;
        }

        /* 画像編集ボタン（非表示時はクリックを透過させ、画像の pointerdown が届くようにする） */
        @media (hover: hover) and (pointer: fine) {
          [contenteditable="true"] .image-figure-edit-btn,
          [contenteditable="true"] .image-figure-delete-btn {
            pointer-events: none;
          }
          [contenteditable="true"] .image-figure:hover .image-figure-edit-btn,
          [contenteditable="true"] .image-figure:hover .image-figure-delete-btn,
          [contenteditable="true"] .image-figure-edit-btn:focus,
          [contenteditable="true"] .image-figure-delete-btn:focus {
            pointer-events: auto;
          }
        }

        [contenteditable="true"] .image-figure-edit-btn {
          position: absolute;
          top: 8px;
          right: 44px;
          background: rgba(37, 99, 235, 0.9);
          color: white;
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.15s;
          z-index: 10;
          padding: 0;
          line-height: 1;
        }

        [contenteditable="true"] .image-figure:hover .image-figure-edit-btn,
        [contenteditable="true"] .image-figure-edit-btn:focus {
          opacity: 1;
        }

        [contenteditable="true"] .image-figure-edit-btn:hover {
          background: rgba(29, 78, 216, 1);
          opacity: 1;
        }

        /* 画像削除ボタン */
        [contenteditable="true"] .image-figure-delete-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(239, 68, 68, 0.85);
          color: white;
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.15s;
          z-index: 10;
          padding: 0;
          line-height: 1;
        }

        [contenteditable="true"] .image-figure:hover .image-figure-delete-btn,
        [contenteditable="true"] .image-figure-delete-btn:focus {
          opacity: 1;
        }

        [contenteditable="true"] .image-figure-delete-btn:hover {
          background: rgba(220, 38, 38, 1);
          opacity: 1;
        }

        /* HTMLブロック共通 */
        [contenteditable="true"] .html-block {
          display: block !important;
          position: relative;
          margin: 1rem 0;
          border: none;
          border-radius: 0;
          background-color: transparent;
          overflow: visible;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        /* HTMLブロックツールバー */
        [contenteditable="true"] .html-block .html-block-toolbar {
          display: flex !important;
          align-items: center;
          gap: 0;
          padding: 0;
          margin: 0;
          background-color: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 4px 4px 0 0;
          width: 100% !important;
          box-sizing: border-box !important;
          height: 36px;
          pointer-events: auto !important;
        }

        [contenteditable="true"] .html-block .html-block-toolbar * {
          pointer-events: auto !important;
        }

        /* ドラッグハンドル */
        [contenteditable="true"] .html-block .html-block-drag-handle {
          display: flex !important;
          align-items: center;
          justify-content: center;
          cursor: grab;
          padding: 0 10px;
          height: 100%;
          color: #9ca3af;
          font-weight: bold;
          user-select: none;
          letter-spacing: 1px;
          font-size: 14px;
          border-right: 1px solid #e5e7eb;
          flex-shrink: 0;
        }

        [contenteditable="true"] .html-block .html-block-drag-handle:hover {
          color: #374151;
          background-color: #f3f4f6;
        }

        /* タブグループ */
        [contenteditable="true"] .html-block .html-block-tabs {
          display: flex !important;
          align-items: center;
          height: 100%;
          flex-shrink: 0;
        }

        /* HTMLブロックボタン（タブスタイル） */
        [contenteditable="true"] .html-block .html-block-btn {
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 14px;
          height: 100%;
          font-size: 12px;
          font-weight: 500;
          color: #6b7280;
          background-color: transparent;
          border: none;
          border-right: 1px solid #e5e7eb;
          border-radius: 0;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        [contenteditable="true"] .html-block .html-block-btn:hover {
          color: #111827;
          background-color: #f3f4f6;
        }

        [contenteditable="true"] .html-block .html-block-btn.active {
          color: #111827;
          background-color: #f3f4f6;
          font-weight: 600;
        }

        [contenteditable="true"] .html-block .html-block-btn svg {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
        }

        /* スペーサー */
        [contenteditable="true"] .html-block .html-block-spacer {
          flex: 1;
        }

        /* メニューボタン */
        [contenteditable="true"] .html-block .html-block-menu-btn {
          display: flex !important;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 100%;
          color: #9ca3af;
          background-color: transparent;
          border: none;
          border-left: 1px solid #e5e7eb;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        [contenteditable="true"] .html-block .html-block-menu-btn:hover {
          color: #374151;
          background-color: #f3f4f6;
        }

        [contenteditable="true"] .html-block .html-block-menu-btn svg {
          width: 16px;
          height: 16px;
        }

        [contenteditable="true"] .html-block .html-block-delete-btn:hover {
          background-color: #fee2e2 !important;
          color: #dc2626 !important;
        }

        /* HTMLブロック textarea */
        [contenteditable="true"] .html-block .html-block-textarea {
          display: block !important;
          width: 100% !important;
          min-height: 80px;
          margin: 0;
          margin-top: -1px;
          padding: 12px;
          font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
          font-size: 13px;
          line-height: 1.6;
          color: #1f2937;
          background-color: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 0 0 4px 4px;
          resize: vertical;
          outline: none;
          box-sizing: border-box !important;
        }

        [contenteditable="true"] .html-block .html-block-textarea:focus {
          background-color: #fefce8;
          border-color: #3b82f6;
        }

        /* HTMLブロック プレビューコンテンツ */
        [contenteditable="true"] .html-block .html-block-preview-content {
          display: block !important;
          margin: 0;
          margin-top: -1px;
          padding: 12px;
          background-color: transparent;
          border: none;
          border-radius: 0;
          width: 100% !important;
          box-sizing: border-box !important;
          pointer-events: none;
        }

        [contenteditable="true"] .html-block .html-block-preview-content * {
          pointer-events: none;
        }

        [contenteditable="true"]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
        }

        /* メインアプリと同じスタイル */
        .article-content {
          line-height: 2.0 !important;
          letter-spacing: 0.02em !important;
        }
        .article-content p {
          line-height: 2.0 !important;
          letter-spacing: 0.02em !important;
          margin-bottom: 1.5em !important;
        }
        .article-content h2 {
          font-size: 1.375em !important;
          line-height: 1.6 !important;
          letter-spacing: 0.02em !important;
          margin-top: 2em !important;
          margin-bottom: 1em !important;
          font-weight: 700 !important;
          padding-bottom: 0.5em !important;
          color: #111827 !important;
          position: relative !important;
          border-bottom: none !important;
        }
        .article-content h2::after {
          content: '' !important;
          position: absolute !important;
          bottom: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 6px !important;
          background-color: ${theme.primaryColor || '#3b82f6'} !important;
          border-radius: 3px !important;
        }
        .article-content h3 {
          font-size: 1.25em !important;
          line-height: 1.6 !important;
          letter-spacing: 0.02em !important;
          margin-top: 1.8em !important;
          margin-bottom: 0.8em !important;
          font-weight: 600 !important;
          padding-bottom: 0.5em !important;
          padding-left: 0 !important;
          position: relative !important;
          border-bottom: none !important;
          border-left: none !important;
        }
        .article-content h3::after {
          content: '' !important;
          position: absolute !important;
          bottom: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 3px !important;
          background-color: ${theme.primaryColor || '#3b82f6'} !important;
          border-radius: 1.5px !important;
        }
        .article-content h4 {
          font-size: 1.125em !important;
          line-height: 1.6 !important;
          letter-spacing: 0.02em !important;
          margin-top: 1.5em !important;
          margin-bottom: 0.6em !important;
          font-weight: 600 !important;
          padding-bottom: 0.25em !important;
          border-bottom: 2px solid ${theme.primaryColor || '#3b82f6'} !important;
        }
        .article-content ul,
        .article-content ol {
          line-height: 2.0 !important;
          letter-spacing: 0.02em !important;
          counter-reset: list-counter !important;
          list-style: none !important;
          padding-left: 0 !important;
        }
        .article-content ol {
          counter-reset: list-counter !important;
        }
        .article-content li {
          margin-bottom: 0.75em !important;
          padding: 0.75em 1em !important;
          background: transparent !important;
          border: 2px solid ${theme.borderColor || '#e5e7eb'} !important;
          border-radius: 8px !important;
          position: relative !important;
          counter-increment: list-counter !important;
          font-size: 0.9em !important;
        }
        .article-content ol > li::before {
          content: "No. " counter(list-counter) !important;
          display: inline-block !important;
          margin-right: 0.5em !important;
          font-weight: 700 !important;
          color: ${theme.primaryColor || '#3b82f6'} !important;
          font-size: 0.875em !important;
        }
        .article-content ul > li::before {
          content: "" !important;
        }
        .article-content table {
          width: 100% !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
          margin: 2em 0 !important;
          font-size: 0.875em !important;
          border-radius: 8px !important;
          overflow: hidden !important;
          border: 1px solid ${theme.borderColor || '#e5e7eb'} !important;
        }
        .article-content table thead {
          background-color: ${theme.blockBackgroundColor || '#f9fafb'} !important;
        }
        .article-content table th {
          padding: 0.75em 1em !important;
          text-align: left !important;
          font-weight: 600 !important;
          border-bottom: 2px solid ${theme.borderColor || '#e5e7eb'} !important;
        }
        .article-content table thead tr:first-child th:first-child {
          border-top-left-radius: 7px !important;
        }
        .article-content table thead tr:first-child th:last-child {
          border-top-right-radius: 7px !important;
        }
        .article-content table td {
          padding: 0.75em 1em !important;
          border-bottom: 1px solid ${theme.borderColor || '#e5e7eb'} !important;
        }
        .article-content table tbody tr:last-child td {
          border-bottom: none !important;
        }
        .article-content table tbody tr:last-child td:first-child {
          border-bottom-left-radius: 7px !important;
        }
        .article-content table tbody tr:last-child td:last-child {
          border-bottom-right-radius: 7px !important;
        }
        .article-content table tbody tr:hover {
          background-color: ${theme.blockBackgroundColor || '#f9fafb'} !important;
        }
      `}</style>
    </div>
  );
}

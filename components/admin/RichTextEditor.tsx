'use client';

import { useEffect, useRef, useState } from 'react';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { Theme, defaultTheme } from '@/types/theme';
import ImageGenerator from './ImageGenerator';

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
  const [imageCopyright, setImageCopyright] = useState('');
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [showHtmlModal, setShowHtmlModal] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [showFontSizeModal, setShowFontSizeModal] = useState(false);
  const [fontSize, setFontSize] = useState('16');
  const [viewMode, setViewMode] = useState<'wysiwyg' | 'source'>('wysiwyg');
  const [sourceCode, setSourceCode] = useState('');

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

  // 初期値をセット
  useEffect(() => {
    if (editorRef.current && !editorRef.current.hasAttribute('data-initialized')) {
      editorRef.current.setAttribute('data-initialized', 'true');
      const initialValue = value || '';
      if (initialValue) {
        editorRef.current.innerHTML = initialValue;
        // ソースコードも初期化（フォーマット済み）
        const formattedValue = initialValue
          .replace(/></g, '>\n<')
          .replace(/\n\s*\n+/g, '\n');
        setSourceCode(formattedValue);
      } else {
        setSourceCode('');
      }
    }
  }, []);

  // valueが外部から変更されたときにソースコードも更新
  useEffect(() => {
    if (viewMode === 'source') {
      // ソースコードモードでは、valueが変更されたときにフォーマットして表示
      // フォーマット前のvalueと比較するため、sourceCodeを逆フォーマットして比較
      const currentValue = (sourceCode || '')
        .replace(/\n\s*/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();
      const newValue = (value || '').trim();
      if (newValue !== currentValue && value !== undefined && value !== null) {
        const formattedValue = newValue
          .replace(/></g, '>\n<')
          .replace(/\n\s*\n+/g, '\n');
        setSourceCode(formattedValue);
      } else if (!newValue && sourceCode) {
        // valueが空になった場合は、sourceCodeも空にする
        setSourceCode('');
      }
    }
    if (viewMode === 'wysiwyg' && editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      if (value !== currentHtml && value) {
        editorRef.current.innerHTML = value;
        editorRef.current.setAttribute('data-initialized', 'true');
      }
    }
  }, [value, viewMode]);

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
            
            // 画面左側に出ないように調整
            const windowWidth = window.innerWidth;
            const toolbarLeft = left - toolbarWidth / 2;
            const margin = 20; // マージンを大きくする
            if (toolbarLeft < margin) {
              left = toolbarWidth / 2 + margin;
            }
            
            // 画面右側に出ないように調整
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

    document.addEventListener('selectionchange', handleSelectionChange);
    editorRef.current?.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      editorRef.current?.removeEventListener('click', handleClick);
    };
  }, []);

  const handleInput = () => {
    if (editorRef.current && viewMode === 'wysiwyg') {
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  // ソースコードモードからWYSIWYGモードに切り替え
  const switchToWysiwyg = () => {
    if (editorRef.current) {
      // ソースコードの内容をエディターに設定
      // 改行を削除して元のHTML形式に戻す
      const htmlToSet = (sourceCode || '')
        .replace(/\n\s*/g, ' ') // 改行とインデントをスペースに変換
        .replace(/>\s+</g, '><') // タグ間の余分なスペースを削除
        .trim();
      editorRef.current.innerHTML = htmlToSet;
      onChange(htmlToSet);
      // エディターを再初期化
      editorRef.current.setAttribute('data-initialized', 'true');
      // フォーカスを設定して内容が表示されるようにする
      editorRef.current.focus();
    }
    setViewMode('wysiwyg');
  };

  // WYSIWYGモードからソースコードモードに切り替え
  const switchToSource = () => {
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML || '';
      // ソースコードモードに切り替える際に、改行を追加して見やすくする（表示用のみ）
      // ただし、元のHTMLは保持するため、onChangeは呼ばない
      if (currentHtml.trim()) {
        const formattedHtml = currentHtml
          .replace(/></g, '>\n<')
          .replace(/\n\s*\n+/g, '\n');
        setSourceCode(formattedHtml);
      } else {
        setSourceCode('');
      }
      // onChangeは呼ばない（元のHTMLを保持）
    } else {
      // エディターが存在しない場合は、現在のvalueを使用
      if (value && value.trim()) {
        const formattedValue = value
          .replace(/></g, '>\n<')
          .replace(/\n\s*\n+/g, '\n');
        setSourceCode(formattedValue);
      } else {
        setSourceCode('');
      }
    }
    setViewMode('source');
  };

  // HTMLフォーマッター（簡易版）
  const formatHtml = (html: string): string => {
    if (!html || typeof html !== 'string') return '';
    
    let formatted = html;
    let indent = 0;
    const indentSize = 2;
    
    // タグの前後に改行を追加
    formatted = formatted
      .replace(/></g, '>\n<')
      .replace(/\n\s*\n+/g, '\n'); // 連続する改行を1つに
    
    const lines = formatted.split('\n');
    const formattedLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // 空行はスキップしない（表示用の改行として保持）
      if (!line && i > 0 && i < lines.length - 1) {
        formattedLines.push('');
        continue;
      }
      if (!line) continue;
      
      // 閉じタグの場合はインデントを減らす
      if (line.startsWith('</')) {
        indent = Math.max(0, indent - indentSize);
      }
      
      // インデントを追加
      formattedLines.push(' '.repeat(indent) + line);
      
      // 開きタグで閉じタグでない場合はインデントを増やす
      if (line.startsWith('<') && !line.startsWith('</') && !line.endsWith('/>') && !line.includes('</')) {
        // スクリプトタグやスタイルタグ内はインデントしない
        if (!line.match(/<(script|style|textarea|pre)/i)) {
          indent += indentSize;
        }
      }
      
      // 閉じタグの場合は次の行のインデントを調整
      if (line.startsWith('</')) {
        // 次の行が閉じタグでない場合のみインデントを調整
        if (i < lines.length - 1 && !lines[i + 1].trim().startsWith('</')) {
          indent = Math.max(0, indent - indentSize);
        }
      }
    }
    
    return formattedLines.join('\n');
  };

  // ソースコード変更時の処理
  const handleSourceCodeChange = (newSourceCode: string) => {
    setSourceCode(newSourceCode);
    // 改行を削除して元のHTML形式に戻してから保存
    const cleanedHtml = newSourceCode
      .replace(/\n\s*/g, ' ') // 改行とインデントをスペースに変換
      .replace(/>\s+</g, '><') // タグ間の余分なスペースを削除
      .trim();
    onChange(cleanedHtml);
  };
  
  // ソースコードをフォーマット
  const formatSourceCode = () => {
    // 現在のvalueからフォーマット（改行を削除してからフォーマット）
    const cleanedHtml = (sourceCode || '')
      .replace(/\n\s*/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
    const formatted = formatHtml(cleanedHtml);
    setSourceCode(formatted);
    // onChangeは呼ばない（フォーマットは表示用のみ）
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

  // 画像URLから挿入
  const handleImageUrlInsert = () => {
    if (imageUrl) {
      insertImageWithCaption(imageUrl);
    }
  };

  // 画像をキャプション付きで挿入
  const insertImageWithCaption = (url: string) => {
    const selection = window.getSelection();
    if (selection && editorRef.current) {
      const range = selection.getRangeAt(0);
      
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
      
      // 画像
      const img = document.createElement('img');
      img.src = url;
      img.alt = imageCaption || '';
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
      
      range.insertNode(figure);
      range.setStartAfter(figure);
      range.setEndAfter(figure);
      selection.removeAllRanges();
      selection.addRange(range);
      
      handleInput();
      setShowImageModal(false);
      setImageUrl('');
      setImageCaption('');
      setImageCopyright('');
    }
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

  // 引用ブロック挿入
  const insertQuoteBlock = () => {
    document.execCommand('formatBlock', false, '<blockquote>');
    handleInput();
  };

  // HTML挿入
  const insertHtml = () => {
    if (htmlContent.trim() && editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // エディタ内での選択かチェック
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          // insertHTMLコマンドを使用
          document.execCommand('insertHTML', false, htmlContent.trim());
          handleInput();
          setShowHtmlModal(false);
          setHtmlContent('');
          editorRef.current.focus();
          return;
        }
      }
      
      // 選択範囲がない場合は、カーソル位置に挿入
      if (editorRef.current) {
        const range = document.createRange();
        const selection = window.getSelection();
        
        if (selection && selection.rangeCount > 0) {
          range.setStart(selection.anchorNode || editorRef.current, selection.anchorOffset);
          range.collapse(true);
        } else {
          // カーソルがエディタ内にある場合
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
        }
        
        const fragment = range.createContextualFragment(htmlContent.trim());
        range.insertNode(fragment);
        
        // カーソルを挿入した要素の後に移動
        range.setStartAfter(fragment.lastChild || fragment);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        handleInput();
        setShowHtmlModal(false);
        setHtmlContent('');
        editorRef.current.focus();
      }
    }
  };

  // フォントサイズ変更
  const applyFontSize = () => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      alert('テキストを選択してください');
      return;
    }
    
    const range = selection.getRangeAt(0).cloneRange();
    
    // 選択範囲がエディタ内にあるかチェック
    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      alert('エディタ内のテキストを選択してください');
      return;
    }
    
    // 選択範囲が空の場合は、カーソル位置にテキストノードを作成
    if (range.collapsed) {
      const textNode = document.createTextNode('\u200B'); // ゼロ幅スペース
      range.insertNode(textNode);
      range.selectNodeContents(textNode);
    }
    
    // 選択範囲をspanで囲んでフォントサイズを適用
    const span = document.createElement('span');
    span.style.fontSize = `${fontSize}px`;
    
    try {
      range.surroundContents(span);
    } catch (e) {
      // 選択範囲が適切でない場合は、選択範囲全体をspanで囲む
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
    }
    
    // カーソルを選択範囲の後に移動
    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.setStartAfter(span);
    newRange.collapse(true);
    selection.addRange(newRange);
    
    handleInput();
    setShowFontSizeModal(false);
    editorRef.current.focus();
  };

  // フォントサイズモーダルを開く際に、選択範囲のフォントサイズを取得
  const openFontSizeModal = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current) {
      const range = selection.getRangeAt(0);
      
      if (editorRef.current.contains(range.commonAncestorContainer)) {
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

  return (
    <div className="relative" style={{ position: 'relative', zIndex: 1 }}>
      {/* ビューモード切り替えタブ */}
      <div className="flex gap-2 mb-2 border-b border-gray-200">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            switchToWysiwyg();
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === 'wysiwyg'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          ビジュアル
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            switchToSource();
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === 'source'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          ソースコード
        </button>
      </div>

      {/* フローティングツールバー（選択時/カーソル移動時） */}
      {showToolbar && viewMode === 'wysiwyg' && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-custom p-2 flex gap-1 transform -translate-x-1/2 animate-fadeIn"
          style={{ 
            top: `${toolbarPosition.top}px`, 
            left: `${toolbarPosition.left}px`,
            maxWidth: '90vw'
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
          
          <ToolbarButton onClick={() => setShowImageModal(true)} title="画像を挿入">
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
          <ToolbarButton onClick={insertReferenceBlock} title="参照">
            📎
          </ToolbarButton>
          
          <div className="w-px bg-gray-300 mx-1" />
          
          <ToolbarButton onClick={() => setShowHtmlModal(true)} title="HTML挿入">
            &lt;/&gt;
          </ToolbarButton>
          
          <div className="w-px bg-gray-300 mx-1" />
          
          <ToolbarButton onClick={openFontSizeModal} title="フォントサイズ">
            <span className="text-xs">A</span>
            <span className="text-[10px]">大小</span>
          </ToolbarButton>
        </div>
      )}

      {/* エディター */}
      <div className="relative" style={{ minHeight: '500px' }}>
        {/* ビジュアルエディター */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="min-h-[500px] p-6 focus:outline-none prose prose-lg max-w-none bg-white border border-gray-300 rounded-xl article-content"
          style={{
            whiteSpace: 'pre-wrap',
            color: theme.textColor,
            display: viewMode === 'wysiwyg' ? 'block' : 'none',
            position: viewMode === 'wysiwyg' ? 'relative' : 'absolute',
            visibility: viewMode === 'wysiwyg' ? 'visible' : 'hidden',
            zIndex: viewMode === 'wysiwyg' ? 1 : -1,
          }}
          data-placeholder={placeholder || '本文を入力...'}
        />
        
        {/* ソースコードエディター */}
        <div 
          className="relative" 
          style={{ 
            display: viewMode === 'source' ? 'block' : 'none',
            position: viewMode === 'source' ? 'relative' : 'absolute',
            visibility: viewMode === 'source' ? 'visible' : 'hidden',
            zIndex: viewMode === 'source' ? 2 : -1,
          }}
        >
          <div className="absolute top-2 right-2 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                formatSourceCode();
              }}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="HTMLを整形"
            >
              整形
            </button>
          </div>
          <textarea
            value={sourceCode}
            onChange={(e) => handleSourceCodeChange(e.target.value)}
            className="w-full min-h-[500px] p-6 font-mono text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="HTMLコードを入力..."
            style={{
              fontFamily: 'monospace',
              lineHeight: '1.6',
              tabSize: 2,
              color: '#111827',
              whiteSpace: 'pre',
              backgroundColor: '#ffffff',
            }}
          />
        </div>
      </div>

      {/* 画像挿入モーダル */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-custom">
            <h3 className="text-xl font-bold mb-4">画像を挿入</h3>
            
            {/* タブ切り替え */}
            <div className="flex gap-2 mb-4">
              <button
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
                <ImageGenerator
                  onImageGenerated={(url) => {
                    setImageUrl(url);
                    // AI生成画像を直接挿入
                    insertImageWithCaption(url);
                    // モーダルを閉じる
                    setShowImageModal(false);
                    setImageUrl('');
                    setImageCaption('');
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
                
                {/* キャプション */}
                <input
                  type="text"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="画像キャプション（例：画像元：～）"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                />
                
                <button
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
                onClick={() => {
                  setShowImageModal(false);
                  setImageUrl('');
                  setImageCaption('');
                  setImageCopyright('');
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-custom">
            <h3 className="text-xl font-bold mb-4">表を挿入</h3>
            
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
                onClick={insertTable}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                挿入
              </button>
              <button
                onClick={() => setShowTableModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HTML挿入モーダル */}
      {showHtmlModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 shadow-custom max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">HTML挿入</h3>
            <p className="text-sm text-gray-600 mb-4">
              スクリプトタグ、Googleマップ、YouTube埋め込みなどのHTMLコードを直接挿入できます。
            </p>
            
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
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フォントサイズ変更モーダル */}
      {showFontSizeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-custom">
            <h3 className="text-xl font-bold mb-4">フォントサイズ変更</h3>
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
                  // フォントサイズをリセット（デフォルトに戻す）
                  const selection = window.getSelection();
                  if (selection && selection.rangeCount > 0 && editorRef.current) {
                    const range = selection.getRangeAt(0);
                    if (editorRef.current.contains(range.commonAncestorContainer)) {
                      // 選択範囲内のspan要素からfontSizeスタイルを削除
                      const spanElements = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
                        ? (range.commonAncestorContainer as Element).querySelectorAll('span[style*="font-size"]')
                        : [];
                      
                      spanElements.forEach((span) => {
                        const element = span as HTMLElement;
                        if (element.style.fontSize) {
                          element.style.fontSize = '';
                          // スタイルが空になったらspanタグを削除
                          if (!element.style.cssText.trim()) {
                            element.outerHTML = element.innerHTML;
                          }
                        }
                      });
                      
                      handleInput();
                      setShowFontSizeModal(false);
                      editorRef.current.focus();
                    }
                  }
                }}
                className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 text-sm"
              >
                リセット
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowFontSizeModal(false);
                  setFontSize('16');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50"
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
          margin: 1.5rem 0;
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

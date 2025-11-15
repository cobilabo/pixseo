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
      editorRef.current.innerHTML = value;
    }
  }, []);

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
            // ツールバーの高さを考慮（約50px）
            const toolbarHeight = 50;
            let top = rect.top - toolbarHeight - 10; // 10pxのマージン
            const left = rect.left + rect.width / 2;
            
            // 画面上部に出ないように調整
            if (top < 60) {
              // ツールバーを選択範囲の下に表示
              top = rect.bottom + 10;
            }
            
            // 画面下部に出ないように調整
            const windowHeight = window.innerHeight;
            if (top + toolbarHeight > windowHeight - 20) {
              top = windowHeight - toolbarHeight - 20;
            }
            
            setToolbarPosition({ top, left });
            setShowToolbar(true);
            return;
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
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
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
    <div className="relative">
      {/* フローティングツールバー（選択時/カーソル移動時） */}
      {showToolbar && (
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
        </div>
      )}

      {/* エディター */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[500px] p-6 focus:outline-none prose prose-sm max-w-none bg-white border border-gray-300 rounded-xl"
        style={{
          whiteSpace: 'pre-wrap',
          color: theme.textColor,
        }}
        data-placeholder={placeholder || '本文を入力...'}
      />

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

      {/* エディタ内のスタイル適用 */}
      <style jsx global>{`
        [contenteditable="true"] h2 {
          color: ${theme.menuTextColor || '#ffffff'};
          background-color: ${theme.menuBackgroundColor || '#1f2937'};
          margin: 1.5rem 0 1rem 0;
          padding: 0.5rem 0.75rem;
          font-size: 1.5rem;
          font-weight: 700;
          border-radius: 8px;
          border: none;
          border-left: none;
          border-bottom: none;
        }

        [contenteditable="true"] h3 {
          color: #1f2937;
          margin: 1.25rem 0 0.75rem 0;
          padding-bottom: 0.5rem;
          padding-left: 0;
          font-size: 1.25rem;
          font-weight: 600;
          border-bottom: 3px solid ${theme.primaryColor || '#3b82f6'};
          border-left: none;
        }

        [contenteditable="true"] h4 {
          color: #374151;
          margin: 1rem 0 0.5rem 0;
          padding-bottom: 0.25rem;
          font-size: 1.125rem;
          font-weight: 600;
          border-bottom: 2px solid ${theme.primaryColor || '#3b82f6'};
        }

        [contenteditable="true"] a {
          color: ${theme.linkColor};
          text-decoration: underline;
        }

        [contenteditable="true"] a:hover {
          color: ${theme.linkHoverColor};
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
          border-collapse: collapse;
          margin: 1.5rem 0;
          border: 1px solid ${theme.tableBorderColor};
        }

        [contenteditable="true"] table.custom-table th {
          background-color: ${theme.tableHeaderBackgroundColor};
          color: ${theme.tableHeaderTextColor};
          border: 1px solid ${theme.tableBorderColor};
          padding: 0.75rem;
          font-weight: 600;
          text-align: left;
        }

        [contenteditable="true"] table.custom-table td {
          border: 1px solid ${theme.tableBorderColor};
          padding: 0.75rem;
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
      `}</style>
    </div>
  );
}

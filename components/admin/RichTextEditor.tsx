'use client';

import { useEffect, useRef, useState } from 'react';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { Theme, defaultTheme } from '@/types/theme';

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
  const [imageInputMethod, setImageInputMethod] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // デザイン設定を取得
  useEffect(() => {
    const fetchDesignSettings = async () => {
      if (!currentTenant) return;
      try {
        const currentTenantId = localStorage.getItem('currentTenantId');
        if (!currentTenantId) return;

        const response = await fetch('/api/admin/design', {
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
        execCommand('insertImage', data.url);
        setShowImageModal(false);
        setImageUrl('');
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
      execCommand('insertImage', imageUrl);
      setShowImageModal(false);
      setImageUrl('');
    }
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
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-2 flex gap-1 transform -translate-x-1/2 animate-fadeIn"
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
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">画像を挿入</h3>
            
            {/* タブ切り替え */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setImageInputMethod('upload')}
                className={`flex-1 px-4 py-2 rounded-xl font-medium transition-colors ${
                  imageInputMethod === 'upload' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                アップロード
              </button>
              <button
                onClick={() => setImageInputMethod('url')}
                className={`flex-1 px-4 py-2 rounded-xl font-medium transition-colors ${
                  imageInputMethod === 'url' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                URL指定
              </button>
            </div>

            {imageInputMethod === 'upload' ? (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
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
            ) : (
              <div>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleImageUrlInsert}
                  disabled={!imageUrl}
                  className="w-full mt-3 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* エディタ内のスタイル適用 */}
      <style jsx global>{`
        [contenteditable="true"] h2 {
          color: ${theme.h2Color};
          ${theme.h2Style === 'border-left' ? `
            border-left: 4px solid ${theme.h2BorderColor};
            padding-left: 1rem;
            background-color: ${theme.h2BackgroundColor};
          ` : ''}
          ${theme.h2Style === 'border-bottom' ? `
            border-bottom: 2px solid ${theme.h2BorderColor};
            padding-bottom: 0.5rem;
          ` : ''}
          ${theme.h2Style === 'background' ? `
            background-color: ${theme.h2BackgroundColor};
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
          ` : ''}
          ${theme.h2Style === 'rounded' ? `
            background-color: ${theme.h2BackgroundColor};
            padding: 0.5rem 1rem;
            border-radius: 1.5rem;
          ` : ''}
        }

        [contenteditable="true"] h3 {
          color: ${theme.h3Color};
          ${theme.h3Style === 'border-left' ? `
            border-left: 4px solid ${theme.h3BorderColor};
            padding-left: 1rem;
            background-color: ${theme.h3BackgroundColor};
          ` : ''}
          ${theme.h3Style === 'border-bottom' ? `
            border-bottom: 2px solid ${theme.h3BorderColor};
            padding-bottom: 0.5rem;
          ` : ''}
          ${theme.h3Style === 'background' ? `
            background-color: ${theme.h3BackgroundColor};
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
          ` : ''}
          ${theme.h3Style === 'rounded' ? `
            background-color: ${theme.h3BackgroundColor};
            padding: 0.5rem 1rem;
            border-radius: 1.5rem;
          ` : ''}
        }

        [contenteditable="true"] h4 {
          color: ${theme.h4Color};
          ${theme.h4Style === 'border-left' ? `
            border-left: 4px solid ${theme.h4BorderColor};
            padding-left: 1rem;
            background-color: ${theme.h4BackgroundColor};
          ` : ''}
          ${theme.h4Style === 'border-bottom' ? `
            border-bottom: 2px solid ${theme.h4BorderColor};
            padding-bottom: 0.5rem;
          ` : ''}
          ${theme.h4Style === 'background' ? `
            background-color: ${theme.h4BackgroundColor};
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
          ` : ''}
          ${theme.h4Style === 'rounded' ? `
            background-color: ${theme.h4BackgroundColor};
            padding: 0.5rem 1rem;
            border-radius: 1.5rem;
          ` : ''}
        }

        [contenteditable="true"] a {
          color: ${theme.linkColor};
          text-decoration: underline;
        }

        [contenteditable="true"] a:hover {
          color: ${theme.linkHoverColor};
        }

        [contenteditable="true"]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}

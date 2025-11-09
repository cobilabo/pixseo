'use client';

import { useEffect, useRef, useState } from 'react';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { Theme, defaultTheme } from '@/types/theme';
import { apiClient } from '@/lib/api-client';

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
  const [uploadingImage, setUploadingImage] = useState(false);

  // デザイン設定を取得
  useEffect(() => {
    const fetchDesignSettings = async () => {
      if (!currentTenant) return;
      try {
        const response = await apiClient.get('/admin/design');
        const data = await response.json();
        setTheme(data.theme || defaultTheme);
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

  // テキスト選択時にツールバーを表示
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // エディタ内での選択かチェック
        if (editorRef.current?.contains(range.commonAncestorContainer)) {
          setToolbarPosition({
            top: rect.top + window.scrollY - 50,
            left: rect.left + window.scrollX + rect.width / 2,
          });
          setShowToolbar(true);
        }
      } else {
        setShowToolbar(false);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
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
      className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
      title={title}
    >
      {children}
    </button>
  );

  return (
    <div className="relative">
      {/* 固定ツールバー（上部） */}
      <div className="sticky top-0 z-10 bg-white border border-gray-300 rounded-t-xl overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-300 p-3 flex flex-wrap gap-2">
          <ToolbarButton onClick={() => execCommand('bold')} title="太字 (Ctrl+B)">
            <strong className="text-gray-700">B</strong>
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand('italic')} title="斜体 (Ctrl+I)">
            <em className="text-gray-700">I</em>
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand('underline')} title="下線 (Ctrl+U)">
            <u className="text-gray-700">U</u>
          </ToolbarButton>

          <div className="w-px bg-gray-300 mx-1" />

          <ToolbarButton onClick={() => execCommand('formatBlock', '<h2>')} title="見出し2">
            H2
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand('formatBlock', '<h3>')} title="見出し3">
            H3
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand('formatBlock', '<h4>')} title="見出し4">
            H4
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand('formatBlock', '<p>')} title="段落">
            P
          </ToolbarButton>

          <div className="w-px bg-gray-300 mx-1" />

          <ToolbarButton onClick={() => execCommand('insertUnorderedList')} title="箇条書き">
            ●
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand('insertOrderedList')} title="番号付きリスト">
            1.
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

          <ToolbarButton 
            onClick={() => setShowImageModal(true)} 
            title="画像を挿入"
          >
            🖼️
          </ToolbarButton>

          <div className="w-px bg-gray-300 mx-1" />

          {/* ショートコード */}
          <select
            onChange={(e) => {
              if (e.target.value) {
                insertShortcode(e.target.value);
                e.target.value = '';
              }
            }}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm cursor-pointer"
          >
            <option value="">ショートコード</option>
            <option value='[button text="ボタン" url="#"]'>ボタン</option>
            <option value='[quote]引用文[/quote]'>引用</option>
            <option value='[reference]参照元[/reference]'>参照</option>
            <option value='[table]&#10;列1 | 列2 | 列3&#10;---&#10;データ1 | データ2 | データ3&#10;[/table]'>表</option>
          </select>
        </div>
      </div>

      {/* フローティングツールバー（選択時） */}
      {showToolbar && (
        <div
          className="fixed z-50 bg-gray-900 text-white rounded-lg shadow-2xl p-2 flex gap-2 transform -translate-x-1/2 animate-fadeIn"
          style={{ top: `${toolbarPosition.top}px`, left: `${toolbarPosition.left}px` }}
        >
          <button
            onClick={() => execCommand('bold')}
            onMouseDown={(e) => e.preventDefault()}
            className="px-3 py-1.5 hover:bg-gray-700 rounded transition-colors"
            title="太字"
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => execCommand('italic')}
            onMouseDown={(e) => e.preventDefault()}
            className="px-3 py-1.5 hover:bg-gray-700 rounded transition-colors"
            title="斜体"
          >
            <em>I</em>
          </button>
          <button
            onClick={() => execCommand('underline')}
            onMouseDown={(e) => e.preventDefault()}
            className="px-3 py-1.5 hover:bg-gray-700 rounded transition-colors"
            title="下線"
          >
            <u>U</u>
          </button>
          <div className="w-px bg-gray-600" />
          <button
            onClick={() => {
              const url = prompt('リンクURL:');
              if (url) execCommand('createLink', url);
            }}
            onMouseDown={(e) => e.preventDefault()}
            className="px-3 py-1.5 hover:bg-gray-700 rounded transition-colors"
            title="リンク"
          >
            🔗
          </button>
        </div>
      )}

      {/* エディター */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[500px] p-6 focus:outline-none prose prose-sm max-w-none bg-white border border-t-0 border-gray-300 rounded-b-xl"
        style={{
          whiteSpace: 'pre-wrap',
          color: theme.textColor,
        }}
        data-placeholder={placeholder || '本文を入力...'}
      />

      {/* 画像アップロードモーダル */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">画像をアップロード</h3>
            
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

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowImageModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
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

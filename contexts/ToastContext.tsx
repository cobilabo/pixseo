'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  showSuccessAndNavigate: (message: string, path: string) => void;
}

const TOAST_STORAGE_KEY = 'pending_toast';

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);

  // トーストを追加する関数（内部用）
  const addToastInternal = useCallback((message: string, type: ToastType) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    // 3秒後に自動的に消える
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  // ページ遷移時に保存されたトーストを確認（pathname が変わるたびに実行）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const savedToast = sessionStorage.getItem(TOAST_STORAGE_KEY);
    if (savedToast) {
      try {
        const { message, type } = JSON.parse(savedToast);
        sessionStorage.removeItem(TOAST_STORAGE_KEY);
        // 少し遅延させて表示（ページ遷移後のレンダリングを待つ）
        setTimeout(() => {
          addToastInternal(message, type);
        }, 100);
      } catch (e) {
        sessionStorage.removeItem(TOAST_STORAGE_KEY);
      }
    }
  }, [pathname, addToastInternal]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    if (typeof window !== 'undefined') {
      // セッションストレージに保存（ページ遷移後も表示できるように）
      sessionStorage.setItem(TOAST_STORAGE_KEY, JSON.stringify({ message, type }));
    }
    // 即座にも表示
    addToastInternal(message, type);
  }, [addToastInternal]);

  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const showError = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const showWarning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);
  const showInfo = useCallback((message: string) => showToast(message, 'info'), [showToast]);

  // 成功トーストを表示してからページ遷移
  const showSuccessAndNavigate = useCallback((message: string, path: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(TOAST_STORAGE_KEY, JSON.stringify({ message, type: 'success' }));
    }
    router.push(path);
  }, [router]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo, showSuccessAndNavigate }}>
      {children}
      
      {/* トースト表示エリア */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto
              flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
              animate-slideInRight
              min-w-[280px] max-w-[400px]
              ${toast.type === 'success' ? 'bg-green-600 text-white' : ''}
              ${toast.type === 'error' ? 'bg-red-600 text-white' : ''}
              ${toast.type === 'warning' ? 'bg-yellow-500 text-white' : ''}
              ${toast.type === 'info' ? 'bg-blue-600 text-white' : ''}
            `}
            onClick={() => removeToast(toast.id)}
          >
            {/* アイコン */}
            <div className="flex-shrink-0">
              {toast.type === 'success' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {toast.type === 'error' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {toast.type === 'warning' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {toast.type === 'info' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            
            {/* メッセージ */}
            <span className="text-sm font-medium">{toast.message}</span>
            
            {/* 閉じるボタン */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="ml-auto flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

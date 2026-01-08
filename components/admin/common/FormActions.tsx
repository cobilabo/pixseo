'use client';

import { useRouter } from 'next/navigation';

interface FormActionsProps {
  loading: boolean;
  onSubmit: () => void;
  submitTitle?: string;
  cancelTitle?: string;
}

export default function FormActions({ 
  loading, 
  onSubmit, 
  submitTitle = '保存',
  cancelTitle = 'キャンセル'
}: FormActionsProps) {
  const router = useRouter();

  return (
    <div className="fixed bottom-8 right-8 flex items-center gap-4 z-50">
      {/* キャンセルボタン */}
      <button
        type="button"
        onClick={() => router.back()}
        className="bg-gray-500 text-white w-14 h-14 rounded-full hover:bg-gray-600 transition-all hover:scale-110 flex items-center justify-center shadow-custom"
        title={cancelTitle}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* 保存ボタン */}
      <button
        type="submit"
        disabled={loading}
        onClick={onSubmit}
        className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-custom"
        title={submitTitle}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
    </div>
  );
}

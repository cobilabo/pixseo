'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { FormSubmission } from '@/types/form';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { useToast } from '@/contexts/ToastContext';

export default function FormSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;
  const { currentTenant } = useMediaTenant();
  const { showSuccess, showError } = useToast();

  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [formName, setFormName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant) {
      fetchSubmissions();
    }
  }, [currentTenant, formId]);

  const fetchSubmissions = async () => {
    try {
      // フォーム情報を取得
      const formResponse = await fetch(`/api/admin/forms/${formId}`, {
        headers: {
          'x-media-id': currentTenant?.id || '',
        },
      });
      if (formResponse.ok) {
        const form = await formResponse.json();
        setFormName(form.name);
      }

      // 送信データを取得
      const response = await fetch(`/api/admin/forms/${formId}/submissions`, {
        headers: {
          'x-media-id': currentTenant?.id || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      showError('送信データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (submissionId: string) => {
    if (!confirm('この送信データを削除してもよろしいですか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/forms/submissions/${submissionId}`, {
        method: 'DELETE',
        headers: {
          'x-media-id': currentTenant?.id || '',
        },
      });

      if (response.ok) {
        setSubmissions(submissions.filter(s => s.id !== submissionId));
        showSuccess('送信データを削除しました');
      } else {
        throw new Error('削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting submission:', error);
      showError('送信データの削除に失敗しました');
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        {loading ? null : (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                {formName} - 送信データ
              </h1>
              <button
                onClick={() => router.push('/admin/forms')}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                戻る
              </button>
            </div>

            {submissions.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">📭</div>
                <p className="text-gray-500">まだ送信データがありません</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="bg-white rounded-xl p-6 shadow-md"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-500">
                          送信日時: {new Date(submission.submittedAt).toLocaleString('ja-JP')}
                        </p>
                        {submission.ipAddress && submission.ipAddress !== 'unknown' && (
                          <p className="text-xs text-gray-400 mt-1">
                            IP: {submission.ipAddress}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(submission.id)}
                        className="px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm transition-colors"
                      >
                        削除
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(submission.data).map(([fieldId, value]) => (
                        <div key={fieldId} className="border-t border-gray-200 pt-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            {fieldId}
                          </p>
                          <p className="text-sm text-gray-900">
                            {Array.isArray(value) ? value.join(', ') : 
                             typeof value === 'boolean' ? (value ? 'はい' : 'いいえ') : 
                             value || '-'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </AdminLayout>
    </AuthGuard>
  );
}


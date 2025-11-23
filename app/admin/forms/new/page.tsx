'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FormBuilder from '@/components/admin/FormBuilder';
import { FormField } from '@/types/block';
import { useMediaTenant } from '@/contexts/MediaTenantContext';

export default function NewFormPage() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    emailNotification: {
      enabled: false,
      to: [''],
      subject: '',
    },
    afterSubmit: {
      type: 'message' as 'message' | 'redirect',
      message: 'お問い合わせありがとうございます。',
      redirectUrl: '',
    },
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      alert('フォーム名は必須です');
      return;
    }
    
    if (fields.length === 0) {
      alert('フィールドを少なくとも1つ追加してください');
      return;
    }

    if (!currentTenant) {
      alert('メディアテナントが選択されていません');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-media-id': currentTenant.id,
        },
        body: JSON.stringify({
          ...formData,
          fields,
          mediaId: currentTenant.id,
        }),
      });

      if (!response.ok) {
        throw new Error('フォームの作成に失敗しました');
      }

      const data = await response.json();
      alert('フォームを作成しました');
      router.push('/forms');
    } catch (error) {
      console.error('Error creating form:', error);
      alert('フォームの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="pb-32 animate-fadeIn">
          <form id="form-new-form" onSubmit={handleSubmit}>
            {/* 基本情報 */}
            <div className="bg-white rounded-xl p-6 mb-6 space-y-6">
              <FloatingInput
                label="フォーム名 *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <FloatingInput
                label="説明（任意）"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
              />

              {/* ステータス */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  フォームを公開する
                </label>
              </div>
            </div>

            {/* フォームビルダー */}
            <div className="bg-white rounded-xl p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">フォームフィールド</h3>
              <FormBuilder fields={fields} onChange={setFields} />
            </div>

            {/* 送信後の設定 */}
            <div className="bg-white rounded-xl p-6 mb-6 space-y-6">
              <h3 className="text-lg font-bold text-gray-900">送信後の設定</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  送信後の動作
                </label>
                <select
                  value={formData.afterSubmit.type}
                  onChange={(e) => setFormData({
                    ...formData,
                    afterSubmit: {
                      ...formData.afterSubmit,
                      type: e.target.value as 'message' | 'redirect',
                    },
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="message">メッセージを表示</option>
                  <option value="redirect">URLにリダイレクト</option>
                </select>
              </div>

              {formData.afterSubmit.type === 'message' ? (
                <FloatingInput
                  label="完了メッセージ"
                  value={formData.afterSubmit.message || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    afterSubmit: {
                      ...formData.afterSubmit,
                      message: e.target.value,
                    },
                  })}
                  multiline
                  rows={3}
                />
              ) : (
                <FloatingInput
                  label="リダイレクト先URL"
                  value={formData.afterSubmit.redirectUrl || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    afterSubmit: {
                      ...formData.afterSubmit,
                      redirectUrl: e.target.value,
                    },
                  })}
                  placeholder="https://example.com/thanks"
                />
              )}
            </div>

            {/* メール通知設定 */}
            <div className="bg-white rounded-xl p-6 space-y-6">
              <h3 className="text-lg font-bold text-gray-900">メール通知設定</h3>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="emailEnabled"
                  checked={formData.emailNotification.enabled}
                  onChange={(e) => setFormData({
                    ...formData,
                    emailNotification: {
                      ...formData.emailNotification,
                      enabled: e.target.checked,
                    },
                  })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="emailEnabled" className="text-sm text-gray-700">
                  送信時にメール通知を受け取る
                </label>
              </div>

              {formData.emailNotification.enabled && (
                <>
                  <FloatingInput
                    label="通知先メールアドレス"
                    type="email"
                    value={formData.emailNotification.to[0]}
                    onChange={(e) => setFormData({
                      ...formData,
                      emailNotification: {
                        ...formData.emailNotification,
                        to: [e.target.value],
                      },
                    })}
                    placeholder="admin@example.com"
                  />

                  <FloatingInput
                    label="メール件名"
                    value={formData.emailNotification.subject || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      emailNotification: {
                        ...formData.emailNotification,
                        subject: e.target.value,
                      },
                    })}
                    placeholder="新しいフォーム送信がありました"
                  />
                </>
              )}
            </div>
          </form>

          {/* フローティングボタン */}
          <div className="fixed bottom-8 right-8 flex items-center gap-4 z-50">
            <button
              type="button"
              onClick={() => router.push('/forms')}
              className="bg-gray-500 text-white w-14 h-14 rounded-full hover:bg-gray-600 transition-all hover:scale-110 flex items-center justify-center"
              title="キャンセル"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <button
              type="submit"
              form="form-new-form"
              disabled={loading}
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="保存"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}


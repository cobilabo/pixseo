'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FormBuilder from '@/components/admin/FormBuilder';
import { FormField } from '@/types/block';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { useToast } from '@/contexts/ToastContext';

export default function NewFormPage() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  const [activeTab, setActiveTab] = useState<'fields' | 'settings'>('fields');
  
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    isActive: boolean;
    emailNotification: {
      enabled: boolean;
      to: string[];
      subject?: string;
    };
    afterSubmit: {
      type: 'message' | 'redirect';
      message?: string;
      redirectUrl?: string;
    };
  }>({
    name: '',
    description: '',
    isActive: true,
    emailNotification: {
      enabled: false,
      to: [''],
      subject: '',
    },
    afterSubmit: {
      type: 'message',
      message: 'お問い合わせありがとうございます。',
      redirectUrl: '',
    },
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      showError('フォーム名は必須です');
      return;
    }
    
    if (fields.length === 0) {
      showError('フィールドを少なくとも1つ追加してください');
      return;
    }

    if (!currentTenant) {
      showError('メディアテナントが選択されていません');
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
      showSuccess('フォームをしました');
      router.push('/admin/forms');
    } catch (error) {
      console.error('Error creating form:', error);
      showError('フォームの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="px-4 pb-32 animate-fadeIn">
          <form id="form-new-form" onSubmit={handleSubmit}>
            {/* タブメニュー */}
            <div className="bg-white rounded-[1.75rem] mb-6">
              <div className="border-b border-gray-200">
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => setActiveTab('fields')}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                      activeTab === 'fields'
                        ? 'text-blue-600 border-b-2 border-blue-600 rounded-tl-[1.75rem]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    style={activeTab === 'fields' ? { backgroundColor: '#f9fafb' } : {}}
                  >
                    フィールド
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                      activeTab === 'settings'
                        ? 'text-blue-600 border-b-2 border-blue-600 rounded-tr-[1.75rem]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    style={activeTab === 'settings' ? { backgroundColor: '#f9fafb' } : {}}
                  >
                    フォーム設定
                  </button>
                </div>
              </div>

              {/* フィールドタブ */}
              {activeTab === 'fields' && (
                <div className="p-6">
                  <FormBuilder fields={fields} onChange={setFields} />
                </div>
              )}

              {/* フォーム設定タブ */}
              {activeTab === 'settings' && (
                <div className="p-6 space-y-6">
                  {/* 基本情報 */}
                  <FloatingInput
                    label="フォーム名 *"
                    value={formData.name}
                    onChange={(value) => setFormData({ ...formData, name: value })}
                    required
                  />

                  <FloatingInput
                    label="説明（任意）"
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
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

                  {/* 送信後の設定 */}
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-md font-bold text-gray-900">送信後の設定</h4>
                  </div>
                  
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
                      onChange={(value) => setFormData({
                        ...formData,
                        afterSubmit: {
                          ...formData.afterSubmit,
                          message: value,
                        },
                      })}
                      multiline
                      rows={3}
                    />
                  ) : (
                    <FloatingInput
                      label="リダイレクト先URL"
                      value={formData.afterSubmit.redirectUrl || ''}
                      onChange={(value) => setFormData({
                        ...formData,
                        afterSubmit: {
                          ...formData.afterSubmit,
                          redirectUrl: value,
                        },
                      })}
                      placeholder="https://example.com/thanks"
                    />
                  )}

                  {/* メール通知設定 */}
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-md font-bold text-gray-900 mb-4">メール通知設定</h4>
                  
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
                          onChange={(value) => setFormData({
                            ...formData,
                            emailNotification: {
                              ...formData.emailNotification,
                              to: [value],
                            },
                          })}
                          placeholder="admin@example.com"
                        />

                        <FloatingInput
                          label="メール件名"
                          value={formData.emailNotification.subject || ''}
                          onChange={(value) => setFormData({
                            ...formData,
                            emailNotification: {
                              ...formData.emailNotification,
                              subject: value,
                            },
                          })}
                          placeholder="新しいフォーム送信がありました"
                        />
                      </>
                    )}
                  </div>
                </div>
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


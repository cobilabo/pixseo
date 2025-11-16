'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { Writer } from '@/types/writer';
import { WritingStyle } from '@/types/writing-style';

export default function EditWriterPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState({
    iconUrl: '',
    iconAlt: '',
    backgroundImageUrl: '',
    backgroundImageAlt: '',
    handleName: '',
    bio: '',
  });
  
  // ライティング特徴管理
  const [writingStyles, setWritingStyles] = useState<WritingStyle[]>([]);
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [styleFormData, setStyleFormData] = useState({
    name: '',
    description: '',
    prompt: '',
  });

  useEffect(() => {
    const fetchWriter = async () => {
      try {
        const response = await fetch(`/api/admin/writers/${params.id}`);
        if (response.ok) {
          const data: Writer = await response.json();
          setFormData({
            iconUrl: data.icon || '',
            iconAlt: data.iconAlt || '',
            backgroundImageUrl: data.backgroundImage || '',
            backgroundImageAlt: data.backgroundImageAlt || '',
            handleName: data.handleName || '',
            bio: data.bio || '',
          });
        }
      } catch (error) {
        console.error('Error fetching writer:', error);
        alert('ライター情報の取得に失敗しました');
      } finally {
        setFetchLoading(false);
      }
    };

    fetchWriter();
    fetchWritingStyles();
  }, [params.id]);

  const fetchWritingStyles = async () => {
    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const response = await fetch(`/api/admin/writing-styles?writerId=${params.id}`, {
        headers: {
          'x-media-id': currentTenantId || '',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch writing styles');

      const data = await response.json();
      setWritingStyles(data.styles || []);
    } catch (error) {
      console.error('Error fetching writing styles:', error);
    }
  };

  const handleStyleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!styleFormData.name || !styleFormData.prompt) {
      alert('ライティング特徴名とプロンプトは必須です');
      return;
    }

    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const url = editingStyleId
        ? `/api/admin/writing-styles/${editingStyleId}`
        : '/api/admin/writing-styles';

      const response = await fetch(url, {
        method: editingStyleId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-media-id': currentTenantId || '',
        },
        body: JSON.stringify({
          ...styleFormData,
          writerId: params.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to save writing style');

      alert(editingStyleId ? '更新しました' : '作成しました');
      setStyleFormData({ name: '', description: '', prompt: '' });
      setEditingStyleId(null);
      fetchWritingStyles();
    } catch (error) {
      console.error('Error saving writing style:', error);
      alert('保存に失敗しました');
    }
  };

  const handleStyleEdit = (style: WritingStyle) => {
    setStyleFormData({
      name: style.name,
      description: style.description,
      prompt: style.prompt,
    });
    setEditingStyleId(style.id);
  };

  const handleStyleDelete = async (id: string) => {
    if (!confirm('このライティング特徴を削除しますか？')) return;

    try {
      const currentTenantId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentTenantId') 
        : null;

      const response = await fetch(`/api/admin/writing-styles/${id}`, {
        method: 'DELETE',
        headers: {
          'x-media-id': currentTenantId || '',
        },
      });

      if (!response.ok) throw new Error('Failed to delete writing style');

      alert('削除しました');
      fetchWritingStyles();
    } catch (error) {
      console.error('Error deleting writing style:', error);
      alert('削除に失敗しました');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/writers/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          icon: formData.iconUrl,
          iconAlt: formData.iconAlt,
          backgroundImage: formData.backgroundImageUrl,
          backgroundImageAlt: formData.backgroundImageAlt,
          handleName: formData.handleName,
          bio: formData.bio,
        }),
      });

      if (response.ok) {
        alert('ライターを更新しました');
        router.push('/writers');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'ライター更新に失敗しました');
      }
    } catch (error: any) {
      console.error('Error updating writer:', error);
      alert(error.message || 'ライターの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        {fetchLoading ? null : (
          <div className="max-w-4xl pb-32 animate-fadeIn">
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-xl p-6 space-y-6">
              {/* アイコン */}
              <FeaturedImageUpload
                value={formData.iconUrl}
                onChange={(url) => setFormData({ ...formData, iconUrl: url })}
                alt={formData.iconAlt}
                onAltChange={(alt) => setFormData({ ...formData, iconAlt: alt })}
                label="アイコン画像"
              />

              {/* 背景画像 */}
              <FeaturedImageUpload
                value={formData.backgroundImageUrl}
                onChange={(url) => setFormData({ ...formData, backgroundImageUrl: url })}
                alt={formData.backgroundImageAlt}
                onAltChange={(alt) => setFormData({ ...formData, backgroundImageAlt: alt })}
                label="背景画像"
              />

              {/* ハンドルネーム */}
              <FloatingInput
                label="ハンドルネーム *"
                value={formData.handleName}
                onChange={(value) => setFormData({ ...formData, handleName: value })}
                required
              />

              {/* 紹介文 */}
              <FloatingInput
                label="紹介文"
                value={formData.bio}
                onChange={(value) => setFormData({ ...formData, bio: value })}
                multiline
                rows={4}
              />
            </div>
          </form>

          {/* ライティング特徴管理セクション */}
          <div className="bg-white rounded-xl p-6 space-y-6 mt-6">
            <h2 className="text-xl font-bold text-gray-900">ライティング特徴管理</h2>
            <p className="text-sm text-gray-500">
              このライターのライティングスタイル（ですます調、フランクな口調など）を登録
            </p>

            {/* 新規作成・編集フォーム */}
            <form onSubmit={handleStyleSubmit} className="p-6 bg-gray-50 rounded-xl">
              <h3 className="text-lg font-semibold mb-4">
                {editingStyleId ? 'ライティング特徴編集' : '新規ライティング特徴作成'}
              </h3>
              
              <div className="space-y-4">
                <FloatingInput
                  label="ライティング特徴名（例: ですます調、フランクな口調）"
                  value={styleFormData.name}
                  onChange={(value) => setStyleFormData({ ...styleFormData, name: value })}
                  required
                />

                <FloatingInput
                  label="説明（任意）"
                  value={styleFormData.description}
                  onChange={(value) => setStyleFormData({ ...styleFormData, description: value })}
                  multiline
                  rows={2}
                />

                <FloatingInput
                  label="プロンプト（リライト時にGrok APIに渡す指示文）"
                  value={styleFormData.prompt}
                  onChange={(value) => setStyleFormData({ ...styleFormData, prompt: value })}
                  multiline
                  rows={6}
                  required
                  placeholder="例: 記事を以下のスタイルでリライトしてください：
- 「ですます」調を使用
- 親しみやすく温かみのある表現
- 読者に語りかけるような口調
- 専門用語は分かりやすく説明"
                />

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    {editingStyleId ? '更新' : '作成'}
                  </button>

                  {editingStyleId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStyleId(null);
                        setStyleFormData({ name: '', description: '', prompt: '' });
                      }}
                      className="bg-gray-300 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-400 transition-colors"
                    >
                      キャンセル
                    </button>
                  )}
                </div>
              </div>
            </form>

            {/* ライティング特徴一覧 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">登録済みライティング特徴</h3>
              
              {writingStyles.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  まだライティング特徴が登録されていません
                </p>
              ) : (
                writingStyles.map((style) => (
                  <div
                    key={style.id}
                    className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {style.name}
                        </h4>
                        {style.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {style.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStyleEdit(style)}
                          className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded-lg hover:bg-blue-50"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleStyleDelete(style.id)}
                          className="text-red-600 hover:text-red-800 px-3 py-1 rounded-lg hover:bg-red-50"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-100">
                      <p className="text-xs text-gray-500 mb-2">プロンプト:</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {style.prompt}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* フローティングボタン */}
          <div className="fixed bottom-8 right-8 flex items-center gap-4 z-50">
            {/* キャンセルボタン */}
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-500 text-white w-14 h-14 rounded-full hover:bg-gray-600 transition-all hover:scale-110 flex items-center justify-center"
              title="キャンセル"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 更新ボタン */}
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="ライターを更新"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
        )}
      </AdminLayout>
    </AuthGuard>
  );
}


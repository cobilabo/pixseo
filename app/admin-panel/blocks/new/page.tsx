'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import FloatingInput from '@/components/admin/FloatingInput';
import FloatingSelect from '@/components/admin/FloatingSelect';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { THEME_LAYOUTS, ThemeLayoutId } from '@/types/theme';
import { apiPost, apiGet } from '@/lib/api-client';

export default function NewBlockPage() {
  const router = useRouter();
  const { currentTenant } = useMediaTenant();
  const [loading, setLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeLayoutId>('cobi');
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    linkUrl: '',
    placement: '',
    isActive: true,
  });

  // 現在のテーマを取得
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const response = await apiGet('/api/admin/design');
        const data = await response.json();
        if (data.theme?.layoutTheme) {
          setCurrentTheme(data.theme.layoutTheme as ThemeLayoutId);
          // デフォルトで最初の配置場所を選択
          const firstPlacement = THEME_LAYOUTS[data.theme.layoutTheme as ThemeLayoutId]?.blockPlacements[0]?.value;
          if (firstPlacement && !formData.placement) {
            setFormData(prev => ({ ...prev, placement: firstPlacement }));
          }
        }
      } catch (error) {
        console.error('テーマの取得に失敗しました:', error);
      }
    };

    if (currentTenant) {
      fetchTheme();
    }
  }, [currentTenant]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.imageUrl) {
      alert('タイトルと画像は必須です');
      return;
    }

    if (!formData.placement) {
      alert('配置場所を選択してください');
      return;
    }

    if (!currentTenant) {
      alert('メディアが選択されていません');
      return;
    }

    setLoading(true);

    try {
      await apiPost('/api/admin/blocks', {
        ...formData,
        mediaId: currentTenant.id,
        layoutTheme: currentTheme,
      });

      alert('ブロックを作成しました');
      router.push('/blocks');
    } catch (error) {
      console.error('Error creating block:', error);
      alert('ブロックの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const themeLayout = THEME_LAYOUTS[currentTheme];
  const placementOptions = themeLayout?.blockPlacements.map(p => ({
    value: p.value,
    label: p.label,
  })) || [];

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="max-w-4xl pb-32 animate-fadeIn">
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900">新規ブロック作成</h2>

              {/* テーマ情報表示 */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>現在のテーマ:</strong> {themeLayout?.displayName}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  このテーマの配置場所から選択できます
                </p>
              </div>

              {/* ブロック画像 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  ブロック画像 *
                </label>
                <FeaturedImageUpload
                  value={formData.imageUrl}
                  onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                />
              </div>

              {/* タイトル */}
              <FloatingInput
                label="タイトル"
                value={formData.title}
                onChange={(value) => setFormData({ ...formData, title: value })}
                required
              />

              {/* 配置場所 */}
              <FloatingSelect
                label="配置場所"
                value={formData.placement}
                onChange={(value) => setFormData({ ...formData, placement: value })}
                options={placementOptions}
                required
              />

              {/* リンク先URL */}
              <FloatingInput
                label="リンク先URL（任意）"
                value={formData.linkUrl}
                onChange={(value) => setFormData({ ...formData, linkUrl: value })}
                type="url"
              />

              {/* 表示状態 */}
              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    すぐに表示する
                  </span>
                </label>
              </div>
            </div>
          </form>

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

            {/* 作成ボタン */}
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="bg-blue-600 text-white w-14 h-14 rounded-full hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="ブロック作成"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}


'use client';

/**
 * フォームブロックの設定
 */

import { useState, useEffect } from 'react';
import { Block, FormBlockConfig } from '@/types/block';
import { Form } from '@/types/form';
import { useMediaTenant } from '@/contexts/MediaTenantContext';

interface FormBlockSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

export default function FormBlockSettings({ block, onUpdate }: FormBlockSettingsProps) {
  const config = block.config as FormBlockConfig;
  const { currentTenant } = useMediaTenant();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant) {
      fetchForms();
    }
  }, [currentTenant]);

  const fetchForms = async () => {
    try {
      const response = await fetch('/api/admin/forms', {
        headers: {
          'x-media-id': currentTenant?.id || '',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // アクティブなフォームのみフィルタリング
        const activeForms = data.filter((form: Form) => form.isActive);
        setForms(activeForms);
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (updates: Partial<FormBlockConfig>) => {
    onUpdate({ config: { ...config, ...updates } });
  };

  const selectedForm = forms.find(f => f.id === config.formId);

  return (
    <div className="space-y-4">
      {/* フォーム選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          フォーム選択 *
        </label>
        {loading ? (
          <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
            読み込み中...
          </div>
        ) : forms.length === 0 ? (
          <div className="w-full px-3 py-2 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-700 text-sm">
            アクティブなフォームがありません。先にフォームを作成してください。
          </div>
        ) : (
          <select
            value={config.formId}
            onChange={(e) => updateConfig({ formId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          >
            <option value="">フォームを選択してください</option>
            {forms.map((form) => (
              <option key={form.id} value={form.id}>
                {form.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 選択中のフォーム情報 */}
      {selectedForm && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-800">{selectedForm.name}</p>
          {selectedForm.description && (
            <p className="text-xs text-blue-600 mt-1">{selectedForm.description}</p>
          )}
          <p className="text-xs text-blue-500 mt-1">
            フィールド数: {selectedForm.fields?.length || 0}
          </p>
        </div>
      )}

      {/* タイトル表示 */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showTitle"
          checked={config.showTitle !== false}
          onChange={(e) => updateConfig({ showTitle: e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="showTitle" className="text-sm text-gray-700">
          フォームタイトルを表示
        </label>
      </div>
    </div>
  );
}

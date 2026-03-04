'use client';

import { useState, useEffect } from 'react';
import { Block, RowBlockConfig, RowColumnConfig } from '@/types/block';
import { Form } from '@/types/form';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import FloatingInput from '@/components/admin/FloatingInput';

interface RowBlockSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

export default function RowBlockSettings({ block, onUpdate }: RowBlockSettingsProps) {
  const config = block.config as RowBlockConfig;
  const { currentTenant } = useMediaTenant();
  const [forms, setForms] = useState<Form[]>([]);
  const [formsLoading, setFormsLoading] = useState(true);

  useEffect(() => {
    if (currentTenant) {
      fetchForms();
    }
  }, [currentTenant]);

  const fetchForms = async () => {
    try {
      const response = await fetch('/api/admin/forms', {
        headers: { 'x-media-id': currentTenant?.id || '' },
      });
      if (response.ok) {
        const data = await response.json();
        setForms(data.filter((form: Form) => form.isActive));
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setFormsLoading(false);
    }
  };

  const columns = config.columns || [];
  const columnCount = config.columnCount || columns.length || 2;

  const updateConfig = (updates: Partial<RowBlockConfig>) => {
    onUpdate({ config: { ...config, ...updates } });
  };

  const updateColumn = (index: number, updates: Partial<RowColumnConfig>) => {
    const newColumns = [...columns];
    while (newColumns.length <= index) {
      newColumns.push({ type: 'html', html: '' });
    }
    newColumns[index] = { ...newColumns[index], ...updates };
    updateConfig({ columns: newColumns });
  };

  const handleColumnCountChange = (newCount: number) => {
    const newColumns = [...columns];
    while (newColumns.length < newCount) {
      newColumns.push({ type: 'html', html: '' });
    }
    updateConfig({ columnCount: newCount, columns: newColumns.slice(0, newCount) });
  };

  return (
    <div className="space-y-6">
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-700">
          複数カラムのレイアウトブロックです。各カラムにHTMLまたはフォームを配置できます。
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">カラム数</label>
        <select
          value={columnCount}
          onChange={(e) => handleColumnCountChange(parseInt(e.target.value, 10))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
        >
          {[1, 2, 3, 4].map(n => (
            <option key={n} value={n}>{n}カラム</option>
          ))}
        </select>
      </div>

      {Array.from({ length: columnCount }).map((_, i) => {
        const col = columns[i] || { type: 'html' as const, html: '' };
        const colType = col.type || 'html';
        const selectedForm = forms.find(f => f.id === col.formId);

        return (
          <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <span className="text-sm font-medium text-gray-700">カラム {i + 1}</span>
              </div>
              <div className="flex gap-1">
                {(['html', 'form'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateColumn(i, { type })}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      colType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {type === 'html' ? 'HTML' : 'フォーム'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              {colType === 'form' ? (
                <div className="space-y-3">
                  {formsLoading ? (
                    <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                      読み込み中...
                    </div>
                  ) : forms.length === 0 ? (
                    <div className="px-3 py-2 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-700 text-sm">
                      アクティブなフォームがありません
                    </div>
                  ) : (
                    <select
                      value={col.formId || ''}
                      onChange={(e) => updateColumn(i, { formId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                    >
                      <option value="">フォームを選択</option>
                      {forms.map((form) => (
                        <option key={form.id} value={form.id}>{form.name}</option>
                      ))}
                    </select>
                  )}
                  {selectedForm && (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-medium text-blue-800">{selectedForm.name}</p>
                      <p className="text-xs text-blue-500 mt-0.5">フィールド数: {selectedForm.fields?.length || 0}</p>
                    </div>
                  )}
                </div>
              ) : (
                <FloatingInput
                  label="HTML"
                  value={col.html || ''}
                  onChange={(html) => updateColumn(i, { html })}
                  multiline
                  rows={8}
                />
              )}
            </div>
          </div>
        );
      })}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">カラム間隔（px）</label>
        <select
          value={config.gap ?? 16}
          onChange={(e) => updateConfig({ gap: parseInt(e.target.value, 10) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
        >
          {[0, 4, 8, 12, 16, 24, 32, 48].map(n => (
            <option key={n} value={n}>{n}px</option>
          ))}
        </select>
      </div>
    </div>
  );
}

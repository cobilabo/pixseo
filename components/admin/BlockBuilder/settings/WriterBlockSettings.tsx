'use client';

/**
 * ライターブロックの設定
 */

import { Block, WriterBlockConfig } from '@/types/block';
import { useState, useEffect } from 'react';
import FloatingInput from '@/components/admin/FloatingInput';
import FloatingSelect from '@/components/admin/FloatingSelect';
import { apiGet } from '@/lib/api-client';

interface WriterBlockSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

interface Writer {
  id: string;
  name: string;
  icon?: string;
}

export default function WriterBlockSettings({ block, onUpdate }: WriterBlockSettingsProps) {
  const config = block.config as WriterBlockConfig;
  const [availableWriters, setAvailableWriters] = useState<Writer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWriters();
  }, []);

  const fetchWriters = async () => {
    try {
      const data = await apiGet<Writer[]>('/api/admin/writers');
      setAvailableWriters(data);
    } catch (error) {
      console.error('Error fetching writers:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (updates: Partial<WriterBlockConfig>) => {
    onUpdate({ config: { ...config, ...updates } });
  };

  const updateWriter = (index: number, updates: Partial<WriterBlockConfig['writers'][0]>) => {
    const newWriters = [...(config.writers || [])];
    newWriters[index] = { ...newWriters[index], ...updates };
    updateConfig({ writers: newWriters });
  };

  const addWriter = () => {
    const newWriters = [
      ...(config.writers || []),
      { writerId: '', jobTitle: '' },
    ];
    updateConfig({ writers: newWriters });
  };

  const removeWriter = (index: number) => {
    const newWriters = (config.writers || []).filter((_, i) => i !== index);
    updateConfig({ writers: newWriters });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* レイアウト */}
      <FloatingSelect
        label="レイアウト"
        value={config.layout || 'horizontal'}
        onChange={(value) => updateConfig({ layout: value as 'vertical' | 'horizontal' })}
        options={[
          { value: 'horizontal', label: '横並び' },
          { value: 'vertical', label: '縦並び' },
        ]}
        required
      />

      {/* ライター一覧 */}
      {(config.writers || []).map((writer, index) => (
        <div key={index} className="space-y-3 p-4 border border-gray-200 rounded-xl">
          {/* ライター選択 */}
          <FloatingSelect
            label="ライター"
            value={writer.writerId || ''}
            onChange={(value) => updateWriter(index, { writerId: value })}
            options={availableWriters.map(w => ({ value: w.id, label: w.name }))}
            required
          />

          {/* 肩書き */}
          <FloatingInput
            label="肩書き"
            value={writer.jobTitle || ''}
            onChange={(value) => updateWriter(index, { jobTitle: value })}
            required
          />

          {/* 削除ボタン */}
          <button
            type="button"
            onClick={() => removeWriter(index)}
            className="w-full py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            このライターを削除
          </button>
        </div>
      ))}

      {/* ライター追加ボタン */}
      <button
        type="button"
        onClick={addWriter}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
      >
        + ライターを追加
      </button>
    </div>
  );
}


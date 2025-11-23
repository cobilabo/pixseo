'use client';

/**
 * 画像&テキストブロックの設定
 */

import { Block, ImageTextBlockConfig } from '@/types/block';
import FloatingInput from '@/components/admin/FloatingInput';
import FloatingSelect from '@/components/admin/FloatingSelect';
import RichTextEditor from '@/components/admin/RichTextEditor';
import FeaturedImageUpload from '@/components/admin/FeaturedImageUpload';

interface ImageTextBlockSettingsProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}

export default function ImageTextBlockSettings({ block, onUpdate }: ImageTextBlockSettingsProps) {
  const config = block.config as ImageTextBlockConfig;

  const updateConfig = (updates: Partial<ImageTextBlockConfig>) => {
    onUpdate({ config: { ...config, ...updates } });
  };

  return (
    <div className="space-y-4">
      {/* 画像 */}
      <div>
        <FeaturedImageUpload
          label="画像"
          imageUrl={config.imageUrl}
          onImageChange={(imageUrl) => updateConfig({ imageUrl })}
        />
      </div>

      {/* 画像alt */}
      <FloatingInput
        label="画像altテキスト"
        value={config.imageAlt}
        onChange={(imageAlt) => updateConfig({ imageAlt })}
        required
      />

      {/* 画像位置 */}
      <FloatingSelect
        label="画像位置"
        value={config.imagePosition}
        onChange={(value) => updateConfig({ imagePosition: value as 'left' | 'right' })}
        options={[
          { value: 'left', label: '左' },
          { value: 'right', label: '右' },
        ]}
        required
      />

      {/* 見出し */}
      <FloatingInput
        label="見出し"
        value={config.heading}
        onChange={(heading) => updateConfig({ heading })}
        required
      />

      {/* テキスト */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          テキスト
        </label>
        <RichTextEditor
          value={config.text}
          onChange={(text) => updateConfig({ text })}
        />
      </div>
    </div>
  );
}


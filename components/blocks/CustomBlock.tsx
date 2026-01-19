import { CustomBlockConfig } from '@/types/block';
import { getCustomBlockByIdServer } from '@/lib/firebase/custom-blocks-server';

interface CustomBlockProps {
  config: CustomBlockConfig;
  showPanel?: boolean;
}

export default async function CustomBlock({ config, showPanel }: CustomBlockProps) {
  const customBlock = await getCustomBlockByIdServer(config.customBlockId);
  
  if (!customBlock) {
    return (
      <div className={showPanel ? 'bg-white rounded-lg shadow-md p-8' : ''}>
        <p className="text-gray-500">カスタムブロックが見つかりません</p>
      </div>
    );
  }

  return (
    <>
      {/* カスタムブロック専用のCSS */}
      {customBlock.css && (
        <style dangerouslySetInnerHTML={{ __html: customBlock.css }} />
      )}
      
      {/* カスタムブロックのHTML */}
      <div 
        className={showPanel ? 'bg-white rounded-lg shadow-md p-8' : ''}
        dangerouslySetInnerHTML={{ __html: customBlock.html }}
      />
    </>
  );
}

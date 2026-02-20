import { CustomBlockConfig } from '@/types/block';
import { Lang } from '@/types/lang';
import { getCustomBlockByIdServer } from '@/lib/firebase/custom-blocks-server';

interface CustomBlockProps {
  config: CustomBlockConfig;
  showPanel?: boolean;
  lang?: Lang;
}

export default async function CustomBlock({ config, showPanel, lang = 'ja' }: CustomBlockProps) {
  const customBlock = await getCustomBlockByIdServer(config.customBlockId);
  
  if (!customBlock) {
    return (
      <div className={showPanel ? 'bg-white rounded-lg shadow-md p-8' : ''}>
        <p className="text-gray-500">カスタムブロックが見つかりません</p>
      </div>
    );
  }

  const htmlMap: Record<string, string | undefined> = { en: customBlock.html_en, zh: customBlock.html_zh, ko: customBlock.html_ko };
  const html = (lang !== 'ja' && htmlMap[lang]?.trim()) ? htmlMap[lang]! : customBlock.html;

  return (
    <>
      {customBlock.css && (
        <style dangerouslySetInnerHTML={{ __html: customBlock.css }} />
      )}
      <div 
        className={showPanel ? 'bg-white rounded-lg shadow-md p-8' : ''}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}

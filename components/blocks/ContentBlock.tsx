/**
 * セクションブロックコンポーネント（統合ブロック）
 */

import Link from 'next/link';
import Image from 'next/image';
import { Block, ContentBlockConfig, CTAButtonConfig } from '@/types/block';
import { getFilterStyle } from '@/lib/utils/filter-helpers';
import { adminDb } from '@/lib/firebase/admin';
import { headers } from 'next/headers';

interface ContentBlockProps {
  block: Block;
  showPanel?: boolean;
  isMobile?: boolean;
}

interface Writer {
  id: string;
  handleName: string;
  icon?: string;
}

async function getWriter(writerId: string): Promise<Writer | null> {
  try {
    const doc = await adminDb.collection('writers').doc(writerId).get();
    if (!doc.exists) return null;
    const data = doc.data();
    return { 
      id: doc.id, 
      handleName: data?.handleName || '',
      icon: data?.icon,
    } as Writer;
  } catch (error) {
    console.error('Error fetching writer:', error);
    return null;
  }
}

export default async function ContentBlock({ block, showPanel = true, isMobile = false }: ContentBlockProps) {
  const config = block.config as ContentBlockConfig;
  
  // 現在の言語を取得
  const headersList = headers();
  const pathname = headersList.get('x-pathname') || '';
  const lang = pathname.split('/')[1] || 'ja';
  
  // 言語に応じたコンテンツを取得
  const heading = config[`heading_${lang}`] || config.heading || '';
  const description = config[`description_${lang}`] || config.description || '';
  const buttonText = config[`buttonText_${lang}`] || config.buttonText || 'VIEW MORE';
  
  // パネルOFFの場合は画面幅いっぱいにする
  const fullWidthStyle = !showPanel ? {
    width: '100vw',
    marginLeft: 'calc(50% - 50vw)',
    marginRight: 'calc(50% - 50vw)',
  } : {};
  
  // 配置クラス（SP時は強制的に中央配置）
  const alignmentClasses = {
    left: isMobile ? 'text-center' : 'text-left',
    center: 'text-center',
    right: isMobile ? 'text-center' : 'text-right',
  };
  
  const headingFontWeightClasses = {
    normal: 'font-normal',
    bold: 'font-bold',
  };
  
  const textFontWeightClasses = {
    normal: 'font-normal',
    bold: 'font-bold',
  };

  const buttonFontWeightClasses = {
    normal: 'font-normal',
    bold: 'font-bold',
  };

  // フォントサイズをremで指定（デフォルト: 1rem）
  const headingFontSize = config.headingFontSize || 1;
  const textFontSize = config.textFontSize || 1;

  // ボタンレイアウト
  const buttonLayoutClasses = {
    horizontal: 'flex flex-wrap gap-4 justify-center',
    '2x2': 'grid grid-cols-2 gap-4',
    vertical: 'flex flex-col gap-4',
  };

  // 画像の高さスタイル
  const imageHeightStyle = config.imageHeight ? { height: `${config.imageHeight}px` } : { minHeight: '24rem' };

  // フィルタースタイル（グラデーション対応）
  const filterStyle = getFilterStyle(
    config.filterType,
    config.filterColor,
    config.filterOpacity
  );

  // ライター情報を取得
  let writers: Array<Writer & { jobTitle?: string }> = [];
  if (config.showWriters && config.writers && config.writers.length > 0) {
    const writersData = await Promise.all(
      config.writers.map(async (w) => {
        const writer = await getWriter(w.writerId);
        if (!writer) return null;
        // 言語に応じたjobTitleを取得
        const jobTitle = w[`jobTitle_${lang}`] || w.jobTitle || '';
        return {
          ...writer,
          jobTitle,
        };
      })
    );
    writers = writersData.filter((w): w is NonNullable<typeof w> => w !== null);
  }

  // ボタンレンダリング関数
  const renderButton = (button: CTAButtonConfig, index: number) => {
    const isExternal = button.url ? button.url.startsWith('http') : false;
    
    // 言語に応じたボタンテキストを取得
    const buttonTextLocalized = button[`text_${lang}`] || button.text || '';
    
    // テキストボタン（デフォルト）
    if (!button.type || button.type === 'text') {
      return (
        <Link
          key={index}
          href={button.url || '#'}
          target={button.openInNewTab || isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className={`
            inline-block
            rounded-lg
            transition-all
            hover:scale-105
            shadow-md
            px-6 py-3
            ${buttonFontWeightClasses[button.fontWeight || 'normal']}
          `}
          style={{
            fontSize: `${button.fontSize || 1}rem`,
            backgroundColor: button.buttonColor || '#3b82f6',
            color: button.textColor || '#ffffff',
          }}
        >
          {buttonTextLocalized}
        </Link>
      );
    }
    
    // 画像ボタン
    if (button.type === 'image') {
      // 画像URLが設定されていない場合
      if (!button.imageUrl) {
        return (
          <div
            key={index}
            className="inline-block px-6 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 text-sm"
          >
            画像を設定してください
          </div>
        );
      }
      
      // 画像サイズの決定
      const imageWidth = button.imageWidth;
      const imageHeight = button.imageHeight;
      
      // サイズ指定のパターン
      let imageStyle: React.CSSProperties = {};
      let containerStyle: React.CSSProperties = {};
      
      if (imageWidth && imageHeight) {
        // 両方指定：その範囲内でアスペクト比保持
        containerStyle = {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          position: 'relative',
        };
      } else if (imageWidth && !imageHeight) {
        // 幅のみ指定：高さは自動
        imageStyle = {
          width: `${imageWidth}px`,
          height: 'auto',
        };
      } else if (!imageWidth && imageHeight) {
        // 高さのみ指定：幅は自動
        imageStyle = {
          width: 'auto',
          height: `${imageHeight}px`,
        };
      } else {
        // 両方未指定：デフォルトサイズ
        imageStyle = {
          width: '300px',
          height: 'auto',
        };
      }
      
      return (
        <Link
          key={index}
          href={button.url || '#'}
          target={button.openInNewTab || isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="inline-block transition-all hover:scale-105"
        >
          {imageWidth && imageHeight ? (
            // 両方指定：fillを使用
            <div style={containerStyle}>
              <Image
                src={button.imageUrl}
                alt={button.imageAlt || 'ボタン画像'}
                fill
                className="object-contain"
              />
            </div>
          ) : (
            // 片方のみまたは未指定：通常のimg要素を使用
            <img
              src={button.imageUrl}
              alt={button.imageAlt || 'ボタン画像'}
              style={imageStyle}
              className="block"
            />
          )}
        </Link>
      );
    }
    
    return null;
  };

  // ライターレンダリング関数
  const renderWriters = () => {
    if (!config.showWriters || writers.length === 0) return null;

    const layoutClass = config.writerLayout === 'vertical' 
      ? 'flex flex-col items-center gap-8'
      : 'flex flex-wrap justify-center gap-8';

    const writerNameColor = config.writerNameColor || '#111827';
    const jobTitleColor = config.jobTitleColor || '#6B7280';
    const writerButtonText = buttonText; // 言語対応済みのbuttonTextを使用
    const buttonTextColor = config.buttonTextColor || '#FFFFFF';
    const buttonBackgroundColor = config.buttonBackgroundColor || '#2563EB';
    const buttonBorderColor = config.buttonBorderColor || '#2563EB';

    return (
      <div className={`${layoutClass} my-8`}>
        {writers.map((writer) => (
          <div 
            key={writer.id} 
            className="flex flex-col items-center text-center"
            style={{ 
              width: config.writerLayout === 'vertical' ? '100%' : 'auto',
            }}
          >
            {/* ライターアイコン（正円） */}
            <div className="relative w-32 h-32 mb-4">
              {writer.icon ? (
                <Image
                  src={writer.icon}
                  alt={writer.handleName}
                  fill
                  className="object-cover rounded-full border-4 border-gray-200"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                  <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              )}
            </div>
            
            {/* ライター名 */}
            <h3 
              className="text-xl font-bold mb-2"
              style={{ color: writerNameColor }}
            >
              {writer.handleName}
            </h3>
            
            {/* 肩書き */}
            {writer.jobTitle && (
              <p 
                className="text-sm mb-4"
                style={{ color: jobTitleColor }}
              >
                {writer.jobTitle}
              </p>
            )}
            
            {/* VIEW MORE ボタン */}
            <Link 
              href={`/${lang}/writers/${writer.id}`}
              className="px-6 py-2 rounded-full font-medium text-sm transition-opacity hover:opacity-80"
              style={{ 
                color: buttonTextColor,
                backgroundColor: buttonBackgroundColor,
                border: `2px solid ${buttonBorderColor}`,
              }}
            >
              {writerButtonText}
            </Link>
          </div>
        ))}
      </div>
    );
  };

  // 画像がサイズ指定中央配置の場合
  if (config.showImage && config.imagePosition === 'center-size-based' && config.imageUrl) {
    const SectionTag = (config.showHeading && heading) ? 'section' : 'div';
    const HeadingTag = (config.showHeading && heading) ? 'h2' : 'div';
    
    // ラッパーのスタイル
    const imageWrapperStyle: React.CSSProperties = { position: 'relative' };
    
    if (config.imageWidth) {
      // 幅を指定：高さは自動でアスペクト比維持
      imageWrapperStyle.width = `${config.imageWidth}px`;
      imageWrapperStyle.maxWidth = '100%';
    } else if (config.imageHeight) {
      // 高さを指定：幅は自動でアスペクト比維持
      imageWrapperStyle.height = `${config.imageHeight}px`;
      imageWrapperStyle.display = 'flex';
      imageWrapperStyle.alignItems = 'center';
      imageWrapperStyle.justifyContent = 'center';
    } else {
      // 両方未指定の場合はデフォルト
      imageWrapperStyle.width = '100%';
    }
    
    return (
      <SectionTag 
        id={config.sectionId || undefined} 
        className="flex justify-center"
        style={fullWidthStyle}
      >
        <div 
          className={`relative overflow-hidden ${showPanel ? 'rounded-lg shadow-md' : ''}`}
          style={imageWrapperStyle}
        >
          {/* 画像 */}
          <img
            src={config.imageUrl}
            alt={config.imageAlt || ''}
            className="w-full h-full object-contain"
            style={config.imageHeight ? { height: `${config.imageHeight}px` } : { height: 'auto' }}
          />
          {filterStyle && <div style={filterStyle} />}
          
          {/* テキスト＋ライター＋ボタン（画像の上に重なる） */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 py-12" style={{ zIndex: 2 }}>
            {config.showHeading && heading && (
              <HeadingTag
                className={`
                  ${headingFontWeightClasses[config.headingFontWeight || 'bold']}
                  ${alignmentClasses[config.headingAlignment || 'center']}
                  text-white mb-4 whitespace-pre-wrap w-full
                `}
                style={{ 
                  fontSize: `${headingFontSize}rem`,
                  color: config.headingTextColor || 'white' 
                }}
              >
                {heading}
              </HeadingTag>
            )}
            {config.showText && description && (
              <p
                className={`
                  ${textFontWeightClasses[config.textFontWeight || 'normal']}
                  ${alignmentClasses[config.textAlignment || 'center']}
                  text-white mb-6 max-w-2xl whitespace-pre-wrap w-full
                `}
                style={{ 
                  fontSize: `${textFontSize}rem`,
                  color: config.textColor || 'white' 
                }}
              >
                {description}
              </p>
            )}
            {renderWriters()}
            {config.showButtons && config.buttons && config.buttons.length > 0 && (
              <div className={buttonLayoutClasses[config.buttonLayout || 'horizontal']}>
                {config.buttons.map(renderButton)}
              </div>
            )}
          </div>
        </div>
      </SectionTag>
    );
  }

  // 画像が背景で、かつ画像を表示する場合
  if (config.showImage && config.imagePosition === 'background' && config.imageUrl) {
    const SectionTag = (config.showHeading && heading) ? 'section' : 'div';
    const HeadingTag = (config.showHeading && heading) ? 'h2' : 'div';
    
    return (
      <SectionTag 
        id={config.sectionId || undefined}
        className={`relative w-full overflow-hidden ${showPanel ? 'rounded-lg shadow-md' : ''}`}
        style={{ ...fullWidthStyle, ...imageHeightStyle }}
      >
        <Image
          src={config.imageUrl}
          alt={config.imageAlt || ''}
          fill
          className="object-cover"
        />
        {filterStyle && <div style={filterStyle} />}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 py-12" style={{ zIndex: 2 }}>
          {config.showHeading && heading && (
            <HeadingTag
              className={`
                ${headingFontWeightClasses[config.headingFontWeight || 'bold']}
                ${alignmentClasses[config.headingAlignment || 'center']}
                text-white mb-4 whitespace-pre-wrap w-full
              `}
              style={{ 
                fontSize: `${headingFontSize}rem`,
                color: config.headingTextColor || 'white' 
              }}
            >
              {heading}
            </HeadingTag>
          )}
          {config.showText && description && (
            <p
              className={`
                ${textFontWeightClasses[config.textFontWeight || 'normal']}
                ${alignmentClasses[config.textAlignment || 'center']}
                text-white mb-6 max-w-2xl whitespace-pre-wrap w-full
              `}
              style={{ 
                fontSize: `${textFontSize}rem`,
                color: config.textColor || 'white' 
              }}
            >
              {description}
            </p>
          )}
          {renderWriters()}
          {config.showButtons && config.buttons && config.buttons.length > 0 && (
            <div className={buttonLayoutClasses[config.buttonLayout || 'horizontal']}>
              {config.buttons.map(renderButton)}
            </div>
          )}
        </div>
      </SectionTag>
    );
  }

  // 画像が左または右で、かつ画像を表示する場合（2カラムレイアウト）
  const isImageLeft = config.imagePosition === 'left';
  
  if (config.showImage && config.imageUrl && (config.imagePosition === 'left' || config.imagePosition === 'right')) {
    const SectionTag = (config.showHeading && heading) ? 'section' : 'div';
    const HeadingTag = (config.showHeading && heading) ? 'h2' : 'div';
    
    return (
      <SectionTag id={config.sectionId || undefined} className={`flex flex-col md:flex-row gap-6 items-center ${isImageLeft ? '' : 'md:flex-row-reverse'}`} style={fullWidthStyle}>
        {/* 画像部分 */}
        <div className="w-full md:w-1/2">
          <div 
            className={`relative w-full overflow-hidden ${showPanel ? 'rounded-lg shadow-md' : ''}`}
            style={config.imageHeight ? { height: `${config.imageHeight}px` } : { aspectRatio: '16/9' }}
          >
            <Image
              src={config.imageUrl}
              alt={config.imageAlt || ''}
              fill
              className="object-cover"
            />
            {filterStyle && <div style={filterStyle} />}
          </div>
        </div>
        
        {/* テキスト＋ライター＋ボタン部分 */}
        <div className="w-full md:w-1/2">
          {config.showHeading && heading && (
            <HeadingTag
              className={`
                ${headingFontWeightClasses[config.headingFontWeight || 'bold']}
                ${alignmentClasses[config.headingAlignment || 'left']}
                mb-4 whitespace-pre-wrap
              `}
              style={{ 
                fontSize: `${headingFontSize}rem`,
                color: config.headingTextColor || undefined 
              }}
            >
              {heading}
            </HeadingTag>
          )}
          {config.showText && description && (
            <p
              className={`
                ${textFontWeightClasses[config.textFontWeight || 'normal']}
                ${alignmentClasses[config.textAlignment || 'left']}
                mb-6 whitespace-pre-wrap
              `}
              style={{ 
                fontSize: `${textFontSize}rem`,
                color: config.textColor || undefined 
              }}
            >
              {description}
            </p>
          )}
          {renderWriters()}
          {config.showButtons && config.buttons && config.buttons.length > 0 && (
            <div className={buttonLayoutClasses[config.buttonLayout || 'horizontal']}>
              {config.buttons.map(renderButton)}
            </div>
          )}
        </div>
      </SectionTag>
    );
  }

  // 画像なしの場合、または画像を表示しない場合（テキスト＋ライター＋ボタンのみ）
  const SectionTag = (config.showHeading && config.heading) ? 'section' : 'div';
  const HeadingTag = (config.showHeading && config.heading) ? 'h2' : 'div';
  
  return (
    <SectionTag id={config.sectionId || undefined} className="py-8" style={fullWidthStyle}>
      {config.showHeading && config.heading && (
        <HeadingTag
          className={`
            ${headingFontWeightClasses[config.headingFontWeight || 'bold']}
            ${alignmentClasses[config.headingAlignment || 'center']}
            mb-4 whitespace-pre-wrap
          `}
          style={{ 
            fontSize: `${headingFontSize}rem`,
            color: config.headingTextColor || undefined 
          }}
        >
          {config.heading}
        </HeadingTag>
      )}
      {config.showText && config.description && (
        <p
          className={`
            ${textFontWeightClasses[config.textFontWeight || 'normal']}
            ${alignmentClasses[config.textAlignment || 'center']}
            mb-6 max-w-2xl mx-auto whitespace-pre-wrap
          `}
          style={{ 
            fontSize: `${textFontSize}rem`,
            color: config.textColor || undefined 
          }}
        >
          {config.description}
        </p>
      )}
      {renderWriters()}
      {config.showButtons && config.buttons && config.buttons.length > 0 && (
        <div className={`${buttonLayoutClasses[config.buttonLayout || 'horizontal']} max-w-2xl mx-auto`}>
          {config.buttons.map(renderButton)}
        </div>
      )}
    </SectionTag>
  );
}

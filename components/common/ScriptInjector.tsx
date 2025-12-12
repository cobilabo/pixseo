'use client';

import Script from 'next/script';
import { useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ScriptItem } from '@/types/theme';

interface ScriptInjectorProps {
  scripts: ScriptItem[];
  position: 'head' | 'body';
}

/**
 * パスがパターンにマッチするかチェック
 * ワイルドカード（*）をサポート
 */
function matchPath(pattern: string, currentPath: string): boolean {
  // 言語プレフィックスを除去（/ja/, /en/, /zh/, /ko/）
  const pathWithoutLang = currentPath.replace(/^\/(ja|en|zh|ko)/, '');
  const normalizedPath = pathWithoutLang || '/';
  
  // 完全一致
  if (pattern === normalizedPath) return true;
  
  // ワイルドカード対応
  if (pattern.includes('*')) {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\//g, '\\/');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(normalizedPath);
  }
  
  return false;
}

/**
 * 単一の発火条件をチェック
 */
function checkSingleTrigger(trigger: { type: string; customPaths?: string[] }, normalizedPath: string, pathname: string): boolean {
  switch (trigger.type) {
    case 'all':
      return true;
      
    case 'home':
      return normalizedPath === '/' || normalizedPath === '';
      
    case 'articles':
      return normalizedPath.startsWith('/articles/') && normalizedPath !== '/articles';
      
    case 'categories':
      return normalizedPath.startsWith('/categories/');
      
    case 'tags':
      return normalizedPath.startsWith('/tags/');
      
    case 'pages':
      // 記事、カテゴリ、タグ、検索、ライター以外のページ
      return !normalizedPath.startsWith('/articles') &&
             !normalizedPath.startsWith('/categories') &&
             !normalizedPath.startsWith('/tags') &&
             !normalizedPath.startsWith('/search') &&
             !normalizedPath.startsWith('/writers') &&
             normalizedPath !== '/' &&
             normalizedPath !== '';
      
    case 'search':
      return normalizedPath === '/search' || normalizedPath.startsWith('/search');
      
    case 'custom':
      if (!trigger.customPaths || trigger.customPaths.length === 0) return false;
      return trigger.customPaths.some(pattern => matchPath(pattern, pathname));
      
    default:
      return true;
  }
}

/**
 * 発火条件をチェック（複数条件はOR評価）
 */
function checkTriggers(script: ScriptItem, pathname: string): boolean {
  const triggers = script.triggers || [{ type: 'all' }];
  
  // 言語プレフィックスを除去
  const pathWithoutLang = pathname.replace(/^\/(ja|en|zh|ko)/, '');
  const normalizedPath = pathWithoutLang || '/';
  
  // いずれかの条件にマッチすればtrue（OR評価）
  return triggers.some(trigger => checkSingleTrigger(trigger, normalizedPath, pathname));
}

/**
 * スクリプト挿入コンポーネント
 * テーマ設定で設定されたスクリプトを動的に挿入する
 */
export default function ScriptInjector({ scripts, position }: ScriptInjectorProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  
  // テストモードかどうか
  const isTestMode = searchParams?.get('script_test') === '1';

  // デバイス判定（クライアントサイドのみ）
  useEffect(() => {
    const checkDevice = () => {
      // User-Agent によるモバイル判定
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
      const isMobileDevice = mobileKeywords.some(keyword => userAgent.includes(keyword));
      
      // 画面幅によるフォールバック判定
      const isNarrowScreen = window.innerWidth < 768;
      
      setIsMobile(isMobileDevice || isNarrowScreen);
    };

    checkDevice();
    
    // リサイズ時に再判定
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // スクリプトをフィルタリング
  const filteredScripts = scripts.filter((script) => {
    // 無効なスクリプトは除外
    if (!script.isEnabled) return false;
    
    // テストモードのスクリプトは、URLパラメータがある場合のみ表示
    if (script.isTest && !isTestMode) return false;
    
    // 位置でフィルタリング
    if (position === 'head' && script.position !== 'head' && script.position !== 'both') {
      return false;
    }
    if (position === 'body' && script.position !== 'body' && script.position !== 'both') {
      return false;
    }
    
    // デバイス判定がまだの場合はスキップ（body用スクリプトのみ）
    if (isMobile === null && script.device !== 'all') {
      return false;
    }
    
    // デバイスでフィルタリング
    if (script.device === 'pc' && isMobile) return false;
    if (script.device === 'mobile' && !isMobile) return false;
    
    // 発火条件でフィルタリング（複数条件はOR評価）
    if (!checkTriggers(script, pathname || '/')) return false;
    
    return true;
  });

  // スクリプトコードが<script>タグを含むかチェック
  const isScriptTag = (code: string): boolean => {
    return code.trim().toLowerCase().startsWith('<script');
  };

  // <script>タグからsrcを抽出
  const extractSrc = (code: string): string | null => {
    const srcMatch = code.match(/src=["']([^"']+)["']/);
    return srcMatch ? srcMatch[1] : null;
  };

  // <script>タグの中身を抽出
  const extractInlineScript = (code: string): string => {
    const match = code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    return match ? match[1].trim() : code;
  };

  // スクリプトコードを取得（position=bothの場合は別々のコードを使用）
  const getScriptCode = (script: ScriptItem): string => {
    if (script.position === 'both') {
      return position === 'head' ? (script.headCode || '') : (script.bodyCode || '');
    }
    return script.code || '';
  };

  // スクリプトのstrategyを決定
  // Next.js App RouterではbeforeInteractiveはクライアントコンポーネントで動作しないため
  // afterInteractiveを使用（ページのhydration後に実行）
  const getStrategy = (): 'afterInteractive' | 'lazyOnload' => {
    // headスクリプトは早めに実行、bodyスクリプトは遅延可能
    return 'afterInteractive';
  };

  return (
    <>
      {filteredScripts.map((script) => {
        const code = getScriptCode(script).trim();
        
        // コードが空の場合はスキップ
        if (!code) return null;
        
        const strategy = getStrategy();
        
        // <script src="...">形式の外部スクリプト
        if (isScriptTag(code)) {
          const src = extractSrc(code);
          if (src) {
            return (
              <Script
                key={`${script.id}-${position}`}
                id={`${script.id}-${position}`}
                src={src}
                strategy={strategy}
              />
            );
          }
          
          // インラインスクリプト（<script>タグ内のコード）
          const inlineCode = extractInlineScript(code);
          if (inlineCode) {
            return (
              <Script
                key={`${script.id}-${position}`}
                id={`${script.id}-${position}`}
                strategy={strategy}
                dangerouslySetInnerHTML={{ __html: inlineCode }}
              />
            );
          }
        }
        
        // 純粋なJavaScriptコード
        return (
          <Script
            key={`${script.id}-${position}`}
            id={`${script.id}-${position}`}
            strategy={strategy}
            dangerouslySetInnerHTML={{ __html: code }}
          />
        );
      })}
    </>
  );
}

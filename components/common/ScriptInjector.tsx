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

/** BOM と先頭の HTML コメント（GTM 等でよくある）を除く */
function stripLeadingHtmlNoise(code: string): string {
  let s = code.trim();
  if (s.charCodeAt(0) === 0xfeff) {
    s = s.slice(1).trim();
  }
  for (let i = 0; i < 30; i++) {
    const next = s.replace(/^\s*<!--[\s\S]*?-->\s*/, '').trim();
    if (next === s) break;
    s = next;
  }
  return s;
}

/** 先頭が <script になるよう、手前のマークアップを捨てる */
function trimToFirstScriptOpen(code: string): string {
  const idx = code.search(/<script\b/i);
  if (idx <= 0) return code;
  return code.slice(idx);
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

  // スクリプトコードが <script で始まるか（属性・閉じタグ有無を考慮）
  const isScriptTag = (code: string): boolean => {
    return /^\s*<script\b/i.test(code);
  };

  // <script>タグからsrcを抽出
  const extractSrc = (code: string): string | null => {
    const srcMatch = code.match(/src=["']([^"']+)["']/);
    return srcMatch ? srcMatch[1] : null;
  };

  // <script>タグから全ての属性を抽出（src以外）
  const extractAttributes = (code: string): Record<string, string> => {
    const attrs: Record<string, string> = {};
    // <script ... > の部分を取得
    const tagMatch = code.match(/<script([^>]*)>/i);
    if (!tagMatch) return attrs;
    
    const attrString = tagMatch[1];
    // 属性を抽出（name="value" または name='value' 形式）
    const attrRegex = /([a-zA-Z0-9_-]+)=["']([^"']*)["']/g;
    let match;
    while ((match = attrRegex.exec(attrString)) !== null) {
      const attrName = match[1];
      const attrValue = match[2];
      // srcは別途処理するので除外
      if (attrName.toLowerCase() !== 'src') {
        attrs[attrName] = attrValue;
      }
    }
    return attrs;
  };

  // <script>…</script> の内側のみ（閉じタグが無い場合は null。全文を JS として渡さない）
  const extractInlineScript = (code: string): string | null => {
    const match = code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    return match ? match[1].trim() : null;
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
        const raw = getScriptCode(script).trim();
        if (!raw) return null;

        let code = stripLeadingHtmlNoise(raw);
        code = trimToFirstScriptOpen(code);
        if (!code) return null;

        const strategy = getStrategy();

        // <script src="...">形式の外部スクリプト
        if (isScriptTag(code)) {
          const src = extractSrc(code);
          if (src) {
            const additionalAttrs = extractAttributes(code);
            return (
              <Script
                key={`${script.id}-${position}`}
                id={`${script.id}-${position}`}
                src={src}
                strategy={strategy}
                {...additionalAttrs}
              />
            );
          }

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

          if (/^\s*</.test(code)) {
            if (process.env.NODE_ENV === 'development') {
              console.warn(
                '[ScriptInjector] スキップ: script タグの解釈に失敗しました（src または閉じタグ付きインラインを確認）',
                script.id
              );
            }
            return null;
          }
        }

        // 先頭が「タグ」なのに script として解釈できない → HTML を JS として実行しない（Unexpected token '<' 防止）
        if (/^\s*</.test(code)) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(
              '[ScriptInjector] スキップ: script タグとして解釈できないマークアップです（テーマのスクリプト設定を確認してください）',
              script.id
            );
          }
          return null;
        }

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

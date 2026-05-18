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

interface ParsedScriptBlock {
  src: string | null;
  inline: string;
  attributes: Record<string, string>;
}

/**
 * テーマで設定された 1 件のスクリプトコード内から `<script>...</script>` ブロックを
 * 全て抽出する。
 *
 * 過去実装は「最初に見つけた <script> タグ 1 個」だけを対象にしていたため、
 * 例えば GA4 公式スニペットのような
 *   <script async src="...gtag/js?id=G-XXXX"></script>
 *   <script>gtag('config', 'G-XXXX');</script>
 * という二段スニペットを貼ると、2 個目の <script> 内のインライン JS
 * (`gtag('config', ...)` 等) が丸ごと捨てられ、計測タグが動かなかった。
 *
 * このヘルパーは複数ブロックを返すので、レンダリング側で各ブロックを
 * 個別の <Script> として注入する。
 *
 * 注意:
 *   - async / defer / id 属性は next/script 側の strategy / id で扱うため除外
 *   - type="module" は通す。それ以外の type (text/javascript 等) は除外
 *   - <noscript> や非 <script> マークアップは無視 (Next/Script で扱えないため)
 */
function parseScriptBlocks(code: string): ParsedScriptBlock[] {
  const blocks: ParsedScriptBlock[] = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    const attrString = m[1] ?? '';
    const inline = (m[2] ?? '').trim();
    const attrs: Record<string, string> = {};
    let src: string | null = null;
    const attrRegex =
      /([a-zA-Z_:][a-zA-Z0-9_:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let am: RegExpExecArray | null;
    while ((am = attrRegex.exec(attrString)) !== null) {
      const rawName = am[1];
      const name = rawName.toLowerCase();
      const value = am[2] ?? am[3] ?? am[4] ?? '';
      if (name === 'src') {
        src = value;
        continue;
      }
      if (name === 'async' || name === 'defer' || name === 'id') continue;
      if (name === 'type' && value && value.toLowerCase() !== 'module') continue;
      attrs[rawName] = value;
    }
    if (!src && !inline) continue;
    blocks.push({ src, inline, attributes: attrs });
  }
  return blocks;
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
    return 'afterInteractive';
  };

  return (
    <>
      {filteredScripts.flatMap((script): JSX.Element[] => {
        const raw = getScriptCode(script).trim();
        if (!raw) return [];

        const cleaned = stripLeadingHtmlNoise(raw);
        if (!cleaned) return [];

        const strategy = getStrategy();

        // 1) <script>...</script> ブロックを全て抽出する。
        //    GA4 / GTM のような「外部ロード + インライン設定」の二段スニペットでも
        //    両方が別々の <Script> として注入される。
        const blocks = parseScriptBlocks(cleaned);
        if (blocks.length > 0) {
          const nodes: JSX.Element[] = [];
          blocks.forEach((block, idx) => {
            const key = `${script.id}-${position}-${idx}`;
            if (block.src) {
              nodes.push(
                <Script
                  key={key}
                  id={key}
                  src={block.src}
                  strategy={strategy}
                  {...block.attributes}
                />
              );
            } else if (block.inline) {
              nodes.push(
                <Script
                  key={key}
                  id={key}
                  strategy={strategy}
                  dangerouslySetInnerHTML={{ __html: block.inline }}
                />
              );
            }
          });
          return nodes;
        }

        // 2) <script> タグが無く、かつ先頭が別の HTML タグ → JS として実行できないのでスキップ。
        //    (例: <noscript>...</noscript> など。誤って eval すると Unexpected token '<' で死ぬ)
        if (/^\s*</.test(cleaned)) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(
              '[ScriptInjector] スキップ: <script> タグとして解釈できないマークアップです（テーマのスクリプト設定を確認してください）',
              script.id
            );
          }
          return [];
        }

        // 3) 純粋な JS コード (タグなし) として実行する。
        const key = `${script.id}-${position}`;
        return [
          <Script
            key={key}
            id={key}
            strategy={strategy}
            dangerouslySetInnerHTML={{ __html: cleaned }}
          />,
        ];
      })}
    </>
  );
}

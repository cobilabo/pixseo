'use client';

import Script from 'next/script';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ScriptItem } from '@/types/theme';

interface ScriptInjectorProps {
  scripts: ScriptItem[];
  position: 'head' | 'body';
}

/**
 * スクリプト挿入コンポーネント
 * テーマ設定で設定されたスクリプトを動的に挿入する
 */
export default function ScriptInjector({ scripts, position }: ScriptInjectorProps) {
  const searchParams = useSearchParams();
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

  return (
    <>
      {filteredScripts.map((script) => {
        const code = script.code.trim();
        
        // <script src="...">形式の外部スクリプト
        if (isScriptTag(code)) {
          const src = extractSrc(code);
          if (src) {
            return (
              <Script
                key={`${script.id}-${position}`}
                id={script.id}
                src={src}
                strategy={position === 'head' ? 'beforeInteractive' : 'afterInteractive'}
              />
            );
          }
          
          // インラインスクリプト（<script>タグ内のコード）
          const inlineCode = extractInlineScript(code);
          if (inlineCode) {
            return (
              <Script
                key={`${script.id}-${position}`}
                id={script.id}
                strategy={position === 'head' ? 'beforeInteractive' : 'afterInteractive'}
                dangerouslySetInnerHTML={{ __html: inlineCode }}
              />
            );
          }
        }
        
        // 純粋なJavaScriptコード
        return (
          <Script
            key={`${script.id}-${position}`}
            id={script.id}
            strategy={position === 'head' ? 'beforeInteractive' : 'afterInteractive'}
            dangerouslySetInnerHTML={{ __html: code }}
          />
        );
      })}
    </>
  );
}


'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Lang, DEFAULT_LANG, isValidLang } from '@/types/lang';

interface LanguageContextType {
  currentLang: Lang;
  setLanguage: (lang: Lang) => void;
  switchLanguage: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ 
  children, 
  initialLang 
}: { 
  children: ReactNode; 
  initialLang: Lang;
}) {
  const [currentLang, setCurrentLang] = useState<Lang>(initialLang);
  const pathname = usePathname();
  const router = useRouter();

  // URLパスから言語を抽出して状態を更新
  useEffect(() => {
    const pathSegments = pathname.split('/').filter(Boolean);
    const langFromPath = pathSegments[0];
    
    if (langFromPath && isValidLang(langFromPath)) {
      setCurrentLang(langFromPath);
    } else {
      setCurrentLang(DEFAULT_LANG);
    }
  }, [pathname]);

  // 言語を変更する関数
  const setLanguage = (lang: Lang) => {
    setCurrentLang(lang);
  };

  // 言語を切り替えて対応するページに遷移
  const switchLanguage = (lang: Lang) => {
    const pathSegments = pathname.split('/').filter(Boolean);
    
    // 現在のパスから言語部分を置き換える
    if (pathSegments[0] && isValidLang(pathSegments[0])) {
      pathSegments[0] = lang;
    } else {
      pathSegments.unshift(lang);
    }
    
    const newPath = '/' + pathSegments.join('/');
    router.push(newPath);
  };

  return (
    <LanguageContext.Provider value={{ currentLang, setLanguage, switchLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

// カスタムフック
export function useLang() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLang must be used within a LanguageProvider');
  }
  return context;
}


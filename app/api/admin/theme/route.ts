import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { defaultTheme } from '@/types/theme';
import { translateText } from '@/lib/openai/translate';
import { SUPPORTED_LANGS } from '@/types/lang';
import { clearThemeCache } from '@/lib/firebase/theme-helper';

export const dynamic = 'force-dynamic';

/**
 * テキストが全て英語（アルファベット+スペース+記号）かどうかをチェック
 */
function isFullEnglish(text: string): boolean {
  if (!text || text.trim() === '') return false;
  // 英数字、スペース、一般的な記号のみで構成されているかチェック
  const englishOnlyPattern = /^[a-zA-Z0-9\s\.,!?;:'"()\-\/_&]+$/;
  return englishOnlyPattern.test(text);
}

// GET: デザイン設定を取得
export async function GET(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    
    if (!mediaId) {
      return NextResponse.json(
        { error: 'サービスが選択されていません' },
        { status: 400 }
      );
    }

    const tenantDoc = await adminDb.collection('mediaTenants').doc(mediaId).get();
    
    if (!tenantDoc.exists) {
      return NextResponse.json(
        { error: 'サービスが見つかりません' },
        { status: 404 }
      );
    }

    const data = tenantDoc.data();
    
    // themeが存在しない場合はデフォルトテーマを返す
    const theme = data?.theme || defaultTheme;
    
    return NextResponse.json({ theme });
  } catch (error: any) {
    console.error('[API /admin/design] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch design settings' },
      { status: 500 }
    );
  }
}

// PUT: デザイン設定を更新
export async function PUT(request: NextRequest) {
  try {
    const mediaId = request.headers.get('x-media-id');
    
    if (!mediaId) {
      return NextResponse.json(
        { error: 'サービスが選択されていません' },
        { status: 400 }
      );
    }

    const body = await request.json();
    let { theme } = body;

    if (!theme) {
      return NextResponse.json(
        { error: 'テーマデータが必要です' },
        { status: 400 }
      );
    }

    // 翻訳処理
    const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja');
    
    // FV設定の翻訳
    if (theme.firstView) {
      theme.firstView.catchphrase_ja = theme.firstView.catchphrase;
      theme.firstView.description_ja = theme.firstView.description;
      
      for (const lang of otherLangs) {
        try {
          theme.firstView[`catchphrase_${lang}`] = await translateText(theme.firstView.catchphrase || '', lang, 'FVキャッチコピー');
          theme.firstView[`description_${lang}`] = await translateText(theme.firstView.description || '', lang, 'FVディスクリプション');
        } catch (error) {
          console.error(`[Theme FV Translation Error] ${lang}:`, error);
          theme.firstView[`catchphrase_${lang}`] = theme.firstView.catchphrase;
          theme.firstView[`description_${lang}`] = theme.firstView.description;
        }
      }
    }
    
    // フッターコンテンツの翻訳
    if (theme.footerContents && Array.isArray(theme.footerContents)) {
      for (const content of theme.footerContents) {
        content.title_ja = content.title;
        content.description_ja = content.description;
        
        // 全文英語の場合は翻訳せず、全言語で同じ値を使用
        const isTitleEnglish = isFullEnglish(content.title || '');
        const isDescriptionEnglish = isFullEnglish(content.description || '');
        
        for (const lang of otherLangs) {
          try {
            if (isTitleEnglish) {
              content[`title_${lang}`] = content.title;
            } else {
              content[`title_${lang}`] = await translateText(content.title || '', lang, 'フッターコンテンツタイトル');
            }
            
            if (isDescriptionEnglish) {
              content[`description_${lang}`] = content.description;
            } else {
              content[`description_${lang}`] = await translateText(content.description || '', lang, 'フッターコンテンツ説明');
            }
          } catch (error) {
            console.error(`[Theme Footer Content Translation Error] ${lang}:`, error);
            content[`title_${lang}`] = content.title;
            content[`description_${lang}`] = content.description;
          }
        }
      }
    }
    
    // フッターテキストリンクセクションの翻訳
    if (theme.footerTextLinkSections && Array.isArray(theme.footerTextLinkSections)) {
      for (const section of theme.footerTextLinkSections) {
        section.title_ja = section.title;
        
        // 全文英語の場合は翻訳せず、全言語で同じ値を使用
        const isSectionTitleEnglish = isFullEnglish(section.title || '');
        
        for (const lang of otherLangs) {
          try {
            if (isSectionTitleEnglish) {
              section[`title_${lang}`] = section.title;
            } else {
              section[`title_${lang}`] = await translateText(section.title || '', lang, 'フッターセクションタイトル');
            }
          } catch (error) {
            console.error(`[Theme Footer Section Translation Error] ${lang}:`, error);
            section[`title_${lang}`] = section.title;
          }
        }
        
        // リンクテキストの翻訳
        if (section.links && Array.isArray(section.links)) {
          for (const link of section.links) {
            link.text_ja = link.text;
            
            // 全文英語の場合は翻訳せず、全言語で同じ値を使用
            const isLinkTextEnglish = isFullEnglish(link.text || '');
            
            for (const lang of otherLangs) {
              try {
                if (isLinkTextEnglish) {
                  link[`text_${lang}`] = link.text;
                } else {
                  link[`text_${lang}`] = await translateText(link.text || '', lang, 'フッターリンクテキスト');
                }
              } catch (error) {
                console.error(`[Theme Footer Link Translation Error] ${lang}:`, error);
                link[`text_${lang}`] = link.text;
              }
            }
          }
        }
      }
    }
    
    // メニュー設定の翻訳
    if (theme.menuSettings) {
      theme.menuSettings.topLabel_ja = theme.menuSettings.topLabel || 'トップ';
      theme.menuSettings.articlesLabel_ja = theme.menuSettings.articlesLabel || '記事一覧';
      theme.menuSettings.searchLabel_ja = theme.menuSettings.searchLabel || '検索';
      
      // 全文英語の場合は翻訳せず、全言語で同じ値を使用
      const isTopLabelEnglish = isFullEnglish(theme.menuSettings.topLabel || '');
      const isArticlesLabelEnglish = isFullEnglish(theme.menuSettings.articlesLabel || '');
      const isSearchLabelEnglish = isFullEnglish(theme.menuSettings.searchLabel || '');
      
      for (const lang of otherLangs) {
        try {
          if (isTopLabelEnglish) {
            theme.menuSettings[`topLabel_${lang}`] = theme.menuSettings.topLabel;
          } else {
            theme.menuSettings[`topLabel_${lang}`] = await translateText(theme.menuSettings.topLabel || 'トップ', lang, 'メニューラベル');
          }
          
          if (isArticlesLabelEnglish) {
            theme.menuSettings[`articlesLabel_${lang}`] = theme.menuSettings.articlesLabel;
          } else {
            theme.menuSettings[`articlesLabel_${lang}`] = await translateText(theme.menuSettings.articlesLabel || '記事一覧', lang, 'メニューラベル');
          }
          
          if (isSearchLabelEnglish) {
            theme.menuSettings[`searchLabel_${lang}`] = theme.menuSettings.searchLabel;
          } else {
            theme.menuSettings[`searchLabel_${lang}`] = await translateText(theme.menuSettings.searchLabel || '検索', lang, 'メニューラベル');
          }
        } catch (error) {
          console.error(`[Theme Menu Translation Error] ${lang}:`, error);
          theme.menuSettings[`topLabel_${lang}`] = theme.menuSettings.topLabel;
          theme.menuSettings[`articlesLabel_${lang}`] = theme.menuSettings.articlesLabel;
          theme.menuSettings[`searchLabel_${lang}`] = theme.menuSettings.searchLabel;
        }
      }
      
      // カスタムメニューの翻訳
      if (theme.menuSettings.customMenus && Array.isArray(theme.menuSettings.customMenus)) {
        for (const menu of theme.menuSettings.customMenus) {
          menu.label_ja = menu.label;
          
          // 全文英語の場合は翻訳せず、全言語で同じ値を使用
          const isMenuLabelEnglish = isFullEnglish(menu.label || '');
          
          for (const lang of otherLangs) {
            try {
              if (isMenuLabelEnglish) {
                menu[`label_${lang}`] = menu.label;
              } else {
                menu[`label_${lang}`] = await translateText(menu.label || '', lang, 'カスタムメニューラベル');
              }
            } catch (error) {
              console.error(`[Theme Custom Menu Translation Error] ${lang}:`, error);
              menu[`label_${lang}`] = menu.label;
            }
          }
        }
      }
    }

    await adminDb.collection('mediaTenants').doc(mediaId).update({
      theme,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // テーマキャッシュをクリア
    clearThemeCache(mediaId);

    return NextResponse.json({ 
      message: 'デザイン設定を更新しました',
      theme 
    });
  } catch (error: any) {
    console.error('[API /admin/design] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update design settings' },
      { status: 500 }
    );
  }
}


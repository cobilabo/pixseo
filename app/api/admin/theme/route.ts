import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { defaultTheme } from '@/types/theme';
import { translateText } from '@/lib/openai/translate';
import { SUPPORTED_LANGS, Lang } from '@/types/lang';
import { clearThemeCache } from '@/lib/firebase/theme-helper';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

function isFullEnglish(text: string): boolean {
  if (!text || text.trim() === '') return false;
  const englishOnlyPattern = /^[a-zA-Z0-9\s\.,!?;:'"()\-\/_&]+$/;
  return englishOnlyPattern.test(text);
}

interface TranslationTask {
  text: string;
  lang: Lang;
  context: string;
  apply: (translated: string) => void;
}

function addTask(tasks: TranslationTask[], text: string | undefined, lang: Lang, context: string, apply: (t: string) => void) {
  if (!text || text.trim() === '') {
    apply('');
    return;
  }
  if (isFullEnglish(text)) {
    apply(text);
    return;
  }
  tasks.push({ text, lang, context, apply });
}

async function runTranslationTasks(tasks: TranslationTask[], concurrency = 10): Promise<void> {
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (task) => {
        try {
          return await translateText(task.text, task.lang, task.context);
        } catch (error) {
          console.error(`[Theme Translation Error] ${task.context} ${task.lang}:`, error);
          return task.text;
        }
      })
    );
    results.forEach((result, idx) => batch[idx].apply(result));
  }
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

    const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja') as Lang[];
    const tasks: TranslationTask[] = [];

    // FV設定
    if (theme.firstView) {
      theme.firstView.catchphrase_ja = theme.firstView.catchphrase;
      theme.firstView.description_ja = theme.firstView.description;
      
      for (const lang of otherLangs) {
        addTask(tasks, theme.firstView.catchphrase, lang, 'FVキャッチコピー',
          (t) => { theme.firstView[`catchphrase_${lang}`] = t; });
        addTask(tasks, theme.firstView.description, lang, 'FVディスクリプション',
          (t) => { theme.firstView[`description_${lang}`] = t; });
      }
    }
    
    // フッターコンテンツ
    if (theme.footerContents && Array.isArray(theme.footerContents)) {
      for (const content of theme.footerContents) {
        content.title_ja = content.title;
        content.description_ja = content.description;
        
        for (const lang of otherLangs) {
          addTask(tasks, content.title, lang, 'フッターコンテンツタイトル',
            (t) => { content[`title_${lang}`] = t; });
          addTask(tasks, content.description, lang, 'フッターコンテンツ説明',
            (t) => { content[`description_${lang}`] = t; });
        }
      }
    }
    
    // フッターテキストリンクセクション
    if (theme.footerTextLinkSections && Array.isArray(theme.footerTextLinkSections)) {
      for (const section of theme.footerTextLinkSections) {
        section.title_ja = section.title;
        
        for (const lang of otherLangs) {
          addTask(tasks, section.title, lang, 'フッターセクションタイトル',
            (t) => { section[`title_${lang}`] = t; });
        }
        
        if (section.links && Array.isArray(section.links)) {
          for (const link of section.links) {
            link.text_ja = link.text;
            for (const lang of otherLangs) {
              addTask(tasks, link.text, lang, 'フッターリンクテキスト',
                (t) => { link[`text_${lang}`] = t; });
            }
          }
        }
      }
    }
    
    // メニュー設定
    if (theme.menuSettings) {
      theme.menuSettings.topLabel_ja = theme.menuSettings.topLabel || 'トップ';
      theme.menuSettings.articlesLabel_ja = theme.menuSettings.articlesLabel || '記事一覧';
      theme.menuSettings.searchLabel_ja = theme.menuSettings.searchLabel || '検索';
      
      for (const lang of otherLangs) {
        addTask(tasks, theme.menuSettings.topLabel || 'トップ', lang, 'メニューラベル',
          (t) => { theme.menuSettings[`topLabel_${lang}`] = t; });
        addTask(tasks, theme.menuSettings.articlesLabel || '記事一覧', lang, 'メニューラベル',
          (t) => { theme.menuSettings[`articlesLabel_${lang}`] = t; });
        addTask(tasks, theme.menuSettings.searchLabel || '検索', lang, 'メニューラベル',
          (t) => { theme.menuSettings[`searchLabel_${lang}`] = t; });
      }
      
      // カスタムメニュー
      if (theme.menuSettings.customMenus && Array.isArray(theme.menuSettings.customMenus)) {
        for (const menu of theme.menuSettings.customMenus) {
          menu.label_ja = menu.label;
          for (const lang of otherLangs) {
            addTask(tasks, menu.label, lang, 'カスタムメニューラベル',
              (t) => { menu[`label_${lang}`] = t; });
          }
        }
      }

      // ナビゲーション項目
      if (theme.menuSettings.navigationItems && Array.isArray(theme.menuSettings.navigationItems)) {
        for (const item of theme.menuSettings.navigationItems) {
          if (!item.label) continue;
          item.label_ja = item.label;
          for (const lang of otherLangs) {
            addTask(tasks, item.label, lang, 'ナビゲーション項目ラベル',
              (t) => { item[`label_${lang}`] = t; });
          }
        }
      }

      // グローバルメニュー項目
      if (theme.menuSettings.globalNavItems && Array.isArray(theme.menuSettings.globalNavItems)) {
        for (const item of theme.menuSettings.globalNavItems) {
          if (!item.label) continue;
          item.label_ja = item.label;
          for (const lang of otherLangs) {
            addTask(tasks, item.label, lang, 'グローバルメニュー項目ラベル',
              (t) => { item[`label_${lang}`] = t; });
          }
        }
      }
    }

    // サイドコンテンツHTML項目
    if (theme.sideContentItems && Array.isArray(theme.sideContentItems)) {
      for (const item of theme.sideContentItems) {
        if (item.type !== 'html' || !item.htmlCode?.trim()) continue;
        item.htmlCode_ja = item.htmlCode;
        for (const lang of otherLangs) {
          addTask(tasks, item.htmlCode, lang, 'サイドバーHTMLコンテンツ',
            (t) => { item[`htmlCode_${lang}`] = t; });
        }
      }
    }

    // 旧形式サイドコンテンツHTML項目
    if (theme.sideContentHtmlItems && Array.isArray(theme.sideContentHtmlItems)) {
      for (const item of theme.sideContentHtmlItems) {
        if (!item.htmlCode?.trim()) continue;
        item.htmlCode_ja = item.htmlCode;
        for (const lang of otherLangs) {
          addTask(tasks, item.htmlCode, lang, 'サイドバーHTMLコンテンツ',
            (t) => { item[`htmlCode_${lang}`] = t; });
        }
      }
    }

    console.log(`[Theme Save] Running ${tasks.length} translation tasks in parallel batches...`);
    await runTranslationTasks(tasks);
    console.log(`[Theme Save] Translation complete.`);

    await adminDb.collection('mediaTenants').doc(mediaId).update({
      theme,
      updatedAt: FieldValue.serverTimestamp(),
    });

    clearThemeCache(mediaId);
    // フロントエンドのルートキャッシュを無効化
    revalidatePath('/', 'layout');

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

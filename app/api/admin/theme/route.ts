import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { defaultTheme } from '@/types/theme';
import { translateText } from '@/lib/openai/translate';
import { SUPPORTED_LANGS, Lang } from '@/types/lang';
import { clearThemeCache } from '@/lib/firebase/theme-helper';
import { syncFooterBlocksInTheme } from '@/lib/theme/footer-blocks';
import { revalidatePath } from 'next/cache';
import { revalidateSite } from '@/lib/cache-manager';

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

/**
 * 差分翻訳用ヘルパー。
 * 新しい日本語テキストが既存と同じ場合は、既存の翻訳結果をそのまま使い回す。
 * これにより「変更なし」のフィールドの再翻訳を完全にスキップできる。
 */
function addLocalized(
  tasks: TranslationTask[],
  newText: string | undefined,
  oldJa: string | undefined,
  oldTranslated: string | undefined,
  lang: Lang,
  context: string,
  apply: (t: string) => void
) {
  if (!newText || newText.trim() === '') {
    apply('');
    return;
  }
  if (isFullEnglish(newText)) {
    apply(newText);
    return;
  }
  if (
    oldJa !== undefined &&
    oldJa === newText &&
    oldTranslated !== undefined &&
    oldTranslated !== ''
  ) {
    apply(oldTranslated);
    return;
  }
  tasks.push({ text: newText, lang, context, apply });
}

async function runTranslationTasks(tasks: TranslationTask[], concurrency = 15): Promise<void> {
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

    if (theme) {
      theme = syncFooterBlocksInTheme(theme);
    }

    if (!theme) {
      return NextResponse.json(
        { error: 'テーマデータが必要です' },
        { status: 400 }
      );
    }

    // 既存テーマを取得（差分翻訳で再翻訳を回避するため）
    const existingTenantDoc = await adminDb.collection('mediaTenants').doc(mediaId).get();
    const existingTheme: any = existingTenantDoc.data()?.theme || {};

    const otherLangs = SUPPORTED_LANGS.filter(lang => lang !== 'ja') as Lang[];
    const tasks: TranslationTask[] = [];

    // 配列要素を「IDが一致するもの」or「同じインデックス」で探すヘルパー
    const pickOld = <T extends { id?: string }>(
      list: T[] | undefined,
      id: string | undefined,
      index: number
    ): T | undefined => {
      if (!list || !Array.isArray(list)) return undefined;
      if (id) {
        const byId = list.find((x) => x?.id === id);
        if (byId) return byId;
      }
      return list[index];
    };

    // FV設定
    if (theme.firstView) {
      const oldFv: any = existingTheme.firstView || {};
      // 旧 catchphrase_ja が無いケース（マイグレ前）に備え、旧 catchphrase を fallback として使う
      const oldCatchJa = oldFv.catchphrase_ja ?? oldFv.catchphrase;
      const oldDescJa = oldFv.description_ja ?? oldFv.description;

      theme.firstView.catchphrase_ja = theme.firstView.catchphrase;
      theme.firstView.description_ja = theme.firstView.description;

      for (const lang of otherLangs) {
        addLocalized(
          tasks,
          theme.firstView.catchphrase,
          oldCatchJa,
          oldFv[`catchphrase_${lang}`],
          lang,
          'FVキャッチコピー',
          (t) => { theme.firstView[`catchphrase_${lang}`] = t; }
        );
        addLocalized(
          tasks,
          theme.firstView.description,
          oldDescJa,
          oldFv[`description_${lang}`],
          lang,
          'FVディスクリプション',
          (t) => { theme.firstView[`description_${lang}`] = t; }
        );
      }
    }

    // フッターコンテンツ
    if (theme.footerContents && Array.isArray(theme.footerContents)) {
      const oldList: any[] = Array.isArray(existingTheme.footerContents)
        ? existingTheme.footerContents
        : [];
      theme.footerContents.forEach((content: any, idx: number) => {
        const oldContent = pickOld<any>(oldList, content?.id, idx) || {};
        const oldTitleJa = oldContent.title_ja ?? oldContent.title;
        const oldDescJa = oldContent.description_ja ?? oldContent.description;

        content.title_ja = content.title;
        content.description_ja = content.description;

        for (const lang of otherLangs) {
          addLocalized(
            tasks,
            content.title,
            oldTitleJa,
            oldContent[`title_${lang}`],
            lang,
            'フッターコンテンツタイトル',
            (t) => { content[`title_${lang}`] = t; }
          );
          addLocalized(
            tasks,
            content.description,
            oldDescJa,
            oldContent[`description_${lang}`],
            lang,
            'フッターコンテンツ説明',
            (t) => { content[`description_${lang}`] = t; }
          );
        }
      });
    }

    // フッターテキストリンクセクション
    if (theme.footerTextLinkSections && Array.isArray(theme.footerTextLinkSections)) {
      const oldSections: any[] = Array.isArray(existingTheme.footerTextLinkSections)
        ? existingTheme.footerTextLinkSections
        : [];
      theme.footerTextLinkSections.forEach((section: any, sIdx: number) => {
        const oldSection = pickOld<any>(oldSections, section?.id, sIdx) || {};
        const oldSecTitleJa = oldSection.title_ja ?? oldSection.title;

        section.title_ja = section.title;

        for (const lang of otherLangs) {
          addLocalized(
            tasks,
            section.title,
            oldSecTitleJa,
            oldSection[`title_${lang}`],
            lang,
            'フッターセクションタイトル',
            (t) => { section[`title_${lang}`] = t; }
          );
        }

        if (section.links && Array.isArray(section.links)) {
          const oldLinks: any[] = Array.isArray(oldSection.links) ? oldSection.links : [];
          section.links.forEach((link: any, lIdx: number) => {
            const oldLink = pickOld<any>(oldLinks, link?.id, lIdx) || {};
            const oldLinkJa = oldLink.text_ja ?? oldLink.text;
            link.text_ja = link.text;
            for (const lang of otherLangs) {
              addLocalized(
                tasks,
                link.text,
                oldLinkJa,
                oldLink[`text_${lang}`],
                lang,
                'フッターリンクテキスト',
                (t) => { link[`text_${lang}`] = t; }
              );
            }
          });
        }
      });
    }

    // メニュー設定
    if (theme.menuSettings) {
      const oldMenu: any = existingTheme.menuSettings || {};
      const oldTopJa = oldMenu.topLabel_ja ?? oldMenu.topLabel;
      const oldArticlesJa = oldMenu.articlesLabel_ja ?? oldMenu.articlesLabel;
      const oldSearchJa = oldMenu.searchLabel_ja ?? oldMenu.searchLabel;

      theme.menuSettings.topLabel_ja = theme.menuSettings.topLabel || 'トップ';
      theme.menuSettings.articlesLabel_ja = theme.menuSettings.articlesLabel || '記事一覧';
      theme.menuSettings.searchLabel_ja = theme.menuSettings.searchLabel || '検索';

      for (const lang of otherLangs) {
        addLocalized(
          tasks,
          theme.menuSettings.topLabel || 'トップ',
          oldTopJa,
          oldMenu[`topLabel_${lang}`],
          lang,
          'メニューラベル',
          (t) => { theme.menuSettings[`topLabel_${lang}`] = t; }
        );
        addLocalized(
          tasks,
          theme.menuSettings.articlesLabel || '記事一覧',
          oldArticlesJa,
          oldMenu[`articlesLabel_${lang}`],
          lang,
          'メニューラベル',
          (t) => { theme.menuSettings[`articlesLabel_${lang}`] = t; }
        );
        addLocalized(
          tasks,
          theme.menuSettings.searchLabel || '検索',
          oldSearchJa,
          oldMenu[`searchLabel_${lang}`],
          lang,
          'メニューラベル',
          (t) => { theme.menuSettings[`searchLabel_${lang}`] = t; }
        );
      }

      // カスタムメニュー（ID無しなのでindexで対応）
      if (theme.menuSettings.customMenus && Array.isArray(theme.menuSettings.customMenus)) {
        const oldCustomMenus: any[] = Array.isArray(oldMenu.customMenus) ? oldMenu.customMenus : [];
        theme.menuSettings.customMenus.forEach((menu: any, idx: number) => {
          const oldM = pickOld<any>(oldCustomMenus, menu?.id, idx) || {};
          const oldLabelJa = oldM.label_ja ?? oldM.label;
          menu.label_ja = menu.label;
          for (const lang of otherLangs) {
            addLocalized(
              tasks,
              menu.label,
              oldLabelJa,
              oldM[`label_${lang}`],
              lang,
              'カスタムメニューラベル',
              (t) => { menu[`label_${lang}`] = t; }
            );
          }
        });
      }

      // ナビゲーション項目（IDあり）
      if (theme.menuSettings.navigationItems && Array.isArray(theme.menuSettings.navigationItems)) {
        const oldNavs: any[] = Array.isArray(oldMenu.navigationItems) ? oldMenu.navigationItems : [];
        theme.menuSettings.navigationItems.forEach((item: any, idx: number) => {
          if (!item.label) return;
          const oldItem = pickOld<any>(oldNavs, item?.id, idx) || {};
          const oldLabelJa = oldItem.label_ja ?? oldItem.label;
          item.label_ja = item.label;
          for (const lang of otherLangs) {
            addLocalized(
              tasks,
              item.label,
              oldLabelJa,
              oldItem[`label_${lang}`],
              lang,
              'ナビゲーション項目ラベル',
              (t) => { item[`label_${lang}`] = t; }
            );
          }
        });
      }

      // グローバルメニュー項目（IDあり）
      if (theme.menuSettings.globalNavItems && Array.isArray(theme.menuSettings.globalNavItems)) {
        const oldGlobals: any[] = Array.isArray(oldMenu.globalNavItems) ? oldMenu.globalNavItems : [];
        theme.menuSettings.globalNavItems.forEach((item: any, idx: number) => {
          if (!item.label) return;
          const oldItem = pickOld<any>(oldGlobals, item?.id, idx) || {};
          const oldLabelJa = oldItem.label_ja ?? oldItem.label;
          item.label_ja = item.label;
          for (const lang of otherLangs) {
            addLocalized(
              tasks,
              item.label,
              oldLabelJa,
              oldItem[`label_${lang}`],
              lang,
              'グローバルメニュー項目ラベル',
              (t) => { item[`label_${lang}`] = t; }
            );
          }
        });
      }
    }

    // サイドコンテンツHTML項目（IDあり）
    if (theme.sideContentItems && Array.isArray(theme.sideContentItems)) {
      const oldItems: any[] = Array.isArray(existingTheme.sideContentItems)
        ? existingTheme.sideContentItems
        : [];
      theme.sideContentItems.forEach((item: any, idx: number) => {
        if (item.type !== 'html' || !item.htmlCode?.trim()) return;
        const oldItem = pickOld<any>(oldItems, item?.id, idx) || {};
        const oldHtmlJa = oldItem.htmlCode_ja ?? oldItem.htmlCode;
        item.htmlCode_ja = item.htmlCode;
        for (const lang of otherLangs) {
          addLocalized(
            tasks,
            item.htmlCode,
            oldHtmlJa,
            oldItem[`htmlCode_${lang}`],
            lang,
            'サイドバーHTMLコンテンツ',
            (t) => { item[`htmlCode_${lang}`] = t; }
          );
        }
      });
    }

    // 旧形式サイドコンテンツHTML項目（IDあり）
    if (theme.sideContentHtmlItems && Array.isArray(theme.sideContentHtmlItems)) {
      const oldItems: any[] = Array.isArray(existingTheme.sideContentHtmlItems)
        ? existingTheme.sideContentHtmlItems
        : [];
      theme.sideContentHtmlItems.forEach((item: any, idx: number) => {
        if (!item.htmlCode?.trim()) return;
        const oldItem = pickOld<any>(oldItems, item?.id, idx) || {};
        const oldHtmlJa = oldItem.htmlCode_ja ?? oldItem.htmlCode;
        item.htmlCode_ja = item.htmlCode;
        for (const lang of otherLangs) {
          addLocalized(
            tasks,
            item.htmlCode,
            oldHtmlJa,
            oldItem[`htmlCode_${lang}`],
            lang,
            'サイドバーHTMLコンテンツ',
            (t) => { item[`htmlCode_${lang}`] = t; }
          );
        }
      });
    }

    console.log(`[Theme Save] Diff translation: ${tasks.length} task(s) need translation.`);
    if (tasks.length > 0) {
      await runTranslationTasks(tasks);
      console.log(`[Theme Save] Translation complete.`);
    }

    await adminDb.collection('mediaTenants').doc(mediaId).update({
      theme,
      updatedAt: FieldValue.serverTimestamp(),
    });

    clearThemeCache(mediaId);
    // フロントエンドのルートキャッシュ + Vercel Data Cache を無効化
    revalidatePath('/', 'layout');
    revalidateSite();

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

'use client';

import { useMemo } from 'react';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';

const baseToc = [
  { id: 'intro', label: 'はじめに' },
  { id: 'dashboard', label: 'ダッシュボード' },
  { id: 'accounts', label: 'アカウント' },
  { id: 'articles', label: 'アーティクル' },
  { id: 'categories', label: 'カテゴリー' },
  { id: 'tags', label: 'タグ' },
  { id: 'writers', label: 'ライター' },
  { id: 'site', label: 'サイト' },
  { id: 'pages', label: 'ページ' },
  { id: 'forms', label: 'フォーム' },
  { id: 'custom-blocks', label: 'カスタムブロック' },
  { id: 'theme', label: 'テーマ' },
  { id: 'media', label: 'メディア' },
  { id: 'site-import', label: 'サイトインポート（直接URL）' },
] as const;

const superAdminTocItem = {
  id: 'super-admin',
  label: 'サービス・クライアント（運用管理者向け）',
} as const;

export default function AdminDocsPage() {
  const { userRole } = useAuth();
  const isSuperAdmin = userRole === 'super_admin';

  const toc = useMemo(() => {
    if (isSuperAdmin) {
      const withoutLast = baseToc.slice(0, -1);
      return [...withoutLast, superAdminTocItem, baseToc[baseToc.length - 1]];
    }
    return [...baseToc];
  }, [isSuperAdmin]);

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="max-w-3xl animate-fadeIn">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">管理画面ヘルプ</h1>
            <p className="text-sm text-gray-600 mb-8">
              PixSEO 管理画面の各機能の概要です。操作の詳細は各画面のラベル・ツールチップもあわせてご確認ください。
            </p>

            <nav
              aria-label="目次"
              className="mb-10 rounded-lg bg-[#f1f6f9] p-4 text-sm"
            >
              <p className="font-bold text-gray-800 mb-3">目次</p>
              <ul className="space-y-1.5 text-blue-700">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="hover:underline">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <article className="prose prose-gray max-w-none prose-headings:scroll-mt-24 prose-a:text-blue-600">
              <section id="intro">
                <h2>はじめに</h2>
                <p>
                  左サイドバーでメニューを切り替え、選択中のサービス（テナント）に紐づくコンテンツを編集します。
                  画面上部のテナント選択は、<strong>運用管理者（super_admin）</strong>のみ表示されます。一般ユーザーは割り当てられたサービスだけを操作します。
                </p>
              </section>

              <section id="dashboard">
                <h2>ダッシュボード</h2>
                <p>
                  現在のサービスについて、<strong>記事数・カテゴリー数・タグ数</strong>を集計表示します。テナントを切り替えると数値が更新されます。
                </p>
                <ul>
                  <li>
                    <strong>クイックアクション</strong>: 新規記事作成、カテゴリー追加、タグ追加へのショートカットです。
                  </li>
                </ul>
              </section>

              <section id="accounts">
                <h2>アカウント</h2>
                <p>
                  現在のサービスにアクセスできる<strong>管理者アカウント</strong>の一覧です（システム用・super_admin は表示から除外されます）。
                  ロゴや表示名、ロールに応じた編集は各アカウントの編集画面から行います。新規アカウント発行もここから行えます。
                </p>
              </section>

              <section id="articles">
                <h2>アーティクル</h2>
                <p>
                  ブログ記事の一覧・検索・フィルター・ソート・ページネーション、公開／非公開の切り替え、削除ができます。削除時は Firestore と検索インデックス（Algolia）からも削除されます。
                </p>
                <ul>
                  <li>
                    <strong>新規作成・編集</strong>: タイトル、本文ブロック、カテゴリー・タグ・ライター、OGP、アイキャッチ、公開日時、予約公開などを設定します。
                  </li>
                  <li>
                    <strong>AI 記事生成</strong>（<code>/articles/generate/</code>）:
                    カテゴリー・ライター・画像プロンプトパターンを選び、AI による記事ドラフト生成を実行します。
                  </li>
                  <li>
                    <strong>スケジュール生成</strong>（<code>/articles/schedule/</code>）:
                    最大 5 枠まで、曜日・時刻・タイムゾーンに沿って自動生成を予約できます。各枠でカテゴリー・ライター・画像パターンを指定します。
                  </li>
                </ul>
              </section>

              <section id="categories">
                <h2>カテゴリー</h2>
                <p>
                  記事の分類用カテゴリーの追加・編集・削除、並び替え、検索ができます。おすすめ表示や一覧非表示などのフラグ、記事数の確認も行えます。
                </p>
              </section>

              <section id="tags">
                <h2>タグ</h2>
                <p>
                  記事に付与するタグの管理です。記事数との紐づきを確認しながら、追加・編集・削除できます。
                </p>
              </section>

              <section id="writers">
                <h2>ライター</h2>
                <p>
                  執筆者プロフィール（表示名・ハンドル・紹介文・アイコンなど）を管理します。記事とライターを紐づけ、公開サイトの著者表示に利用されます。記事が残っている場合は削除に注意してください。
                </p>
              </section>

              <section id="site">
                <h2>サイト</h2>
                <p>
                  サービス単位の<strong>基本情報</strong>を編集します。サイト名・説明文、横型・正方形・縦型ロゴ、ロゴリンク先、検索エンジンへのインデックス許可（noindex 相当の逆）などを設定します。データはサービス（テナント）設定 API 経由で読み書きされます。
                </p>
              </section>

              <section id="pages">
                <h2>ページ</h2>
                <p>
                  固定ページの一覧・並び順・公開状態の管理、ブロックエディタによる本文構成、削除ができます。
                </p>
                <ul>
                  <li>
                    <strong>AI ページ生成</strong>: モーダルからプロンプトに基づく下書き生成が可能な場合があります。
                  </li>
                  <li>ホームページの有無など、サイト固有の制約は画面のメッセージに従ってください。</li>
                </ul>
              </section>

              <section id="forms">
                <h2>フォーム</h2>
                <p>
                  お問い合わせ等のフォーム定義の一覧・作成・編集、ページ上での利用箇所の確認ができます。フォームを削除すると<strong>送信データもすべて削除</strong>されます。
                </p>
                <ul>
                  <li>
                    <strong>編集</strong>: フィールド種別・バリデーション・送信先メール等をフォームビルダーで設定します。
                  </li>
                  <li>
                    <strong>送信一覧</strong>: 各フォームごとの送信履歴を確認できます。
                  </li>
                  <li>
                    <strong>AI フォーム生成</strong>: モーダルから項目案を生成できる場合があります。
                  </li>
                </ul>
              </section>

              <section id="custom-blocks">
                <h2>カスタムブロック</h2>
                <p>
                  再利用可能な HTML／コンポーネントブロックを登録し、固定ページのブロックとして挿入できます。どのページで使われているかの件数表示や、未使用ブロックの整理に利用してください。
                </p>
              </section>

              <section id="theme">
                <h2>テーマ</h2>
                <p>
                  公開サイトの見た目・レイアウト・ナビゲーションを一括で設定します。主な項目の例は次のとおりです。
                </p>
                <ul>
                  <li>レイアウトプリセット（FV・バナー・フッター構成など）</li>
                  <li>グローバルメニュー・ハンバーガーメニュー・SNS リンク</li>
                  <li>記事一覧・詳細まわりの表示（記事設定）</li>
                  <li>検索の種類・表示順（検索機能設定）</li>
                  <li>サイドバーコンテンツ</li>
                  <li>カラーテーマ・カスタム CSS</li>
                  <li>計測タグなどのスクリプト（GTM / GA 等）</li>
                  <li>HTML ショートコード、一般設定</li>
                </ul>
                <p>
                  画面内で「未使用」と表示される項目は、現行フロントで参照されていないテーマキーである場合があります。
                </p>
              </section>

              <section id="media">
                <h2>メディアライブラリ</h2>
                <p>
                  画像・動画ファイルのアップロード、一覧・検索・種別フィルター、表示件数の段階的読み込みができます。必要に応じて<strong>使用箇所</strong>（どのコンテンツで参照されているか）を取得できます。画像プロンプトパターン（AI 画像用）の管理入口もここにあります。
                </p>
              </section>

              {isSuperAdmin && (
                <section id="super-admin">
                  <h2>サービス・クライアント（運用管理者向け）</h2>
                  <p>
                    左サイドバーに <strong>サービス</strong>・<strong>クライアント</strong> が表示されるのは、ログインユーザーが <code>super_admin</code> のときのみです。
                  </p>
                  <h3>サービス</h3>
                  <p>
                    テナント（公開サイト単位）の一覧・新規作成・編集・削除、有効／無効の切り替えです。サービス名・スラッグ・カスタムドメイン・プレビュー URL などを管理し、複数サービスを切り替えて運用できます。
                  </p>
                  <h3>クライアント</h3>
                  <p>
                    契約クライアント単位のマスタです。クライアントの追加・編集・削除により、組織やブランドの単位を管理します（アカウント・サービスとの紐づけは各画面の仕様に従います）。
                  </p>
                </section>
              )}

              <section id="site-import">
                <h2>サイトインポート（直接 URL）</h2>
                <p>
                  サイドバーには載っていませんが、URL <code>/site-import/</code> から利用できる一連のウィザードです。既存サイトの URL を指定してクロールし、解析結果を確認したうえで固定ページ・カスタムブロック・画像取り込みまで行えます。最大ページ数や除外パス、レイアウトモード、公開状態を指定してインポート実行します。バッチ削除などの操作もこの画面から行えます。
                </p>
                <p>
                  大量の取り込みや本番反映の前に、プレビュー環境で動作確認することを推奨します。
                </p>
              </section>
            </article>
          </div>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}

# functions-scheduled

予約公開などの定期実行用 Firebase Functions プロジェクト。Next.js は使わない軽量関数のみを含む。

## デプロイ前のセットアップ (必須)

`publishScheduledArticles` は予約公開時に Algolia インデックスへも記事を再同期する。Algolia の認証情報は Google Secret Manager (Firebase Functions の Secrets) から取得するため、初回デプロイの前に以下のコマンドで値をセットする必要がある (値は Algolia ダッシュボード「API Keys」と `.env.local` を参照):

```bash
# プロジェクトルート (firebase.json があるディレクトリ) から実行
firebase functions:secrets:set ALGOLIA_APP_ID
# プロンプトで NEXT_PUBLIC_ALGOLIA_APP_ID と同じ値を入力 (例: BLXOYFPK52)

firebase functions:secrets:set ALGOLIA_ADMIN_KEY
# プロンプトで ALGOLIA_ADMIN_KEY と同じ値を入力
```

値を後から変更したい場合も同じコマンドで上書き可能。値の確認は `firebase functions:secrets:access ALGOLIA_APP_ID` など。

## ビルドとデプロイ

```bash
cd functions-scheduled
npm install
npm run build
npm run deploy   # = firebase deploy --only functions:scheduled
```

## ローカル確認

```bash
npm run serve    # = build + firebase emulators:start --only functions
```

エミュレータ上では Secret Manager の値は読めないので、Algolia 同期処理はエラーになることに注意 (Firestore 更新部分のみ動作確認したい場合は問題ない)。

## 含まれる関数

| 関数名 | スケジュール | 概要 |
|---|---|---|
| `publishScheduledArticles` | 毎日 JST 0:00 | `isScheduled:true` かつ `publishedAt` が今日以前の記事を `isPublished:true` に更新し、Algolia インデックス (4 言語) へ再同期する |
# Vercel Cron Jobs 設定ガイド

## 概要

このドキュメントは、Vercel Cron Jobsを使用して定期的に記事を自動生成する設定手順を説明します。

## 前提条件

- Vercel にプロジェクトがデプロイされていること
- 環境変数が正しく設定されていること

## 必要な環境変数

Vercel の環境変数に以下を追加してください：

```
CRON_SECRET=your-secure-random-string-here
```

**重要**: `CRON_SECRET` は推測されにくいランダムな文字列を使用してください。

### CRON_SECRET の生成方法

```bash
# ランダムな文字列を生成（推奨）
openssl rand -hex 32
```

または

```bash
# Node.jsで生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## vercel.json の設定

プロジェクトのルートディレクトリに `vercel.json` を作成（または編集）します：

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-articles",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Cron スケジュール形式

Vercel Cron は標準的な cron 構文を使用します：

```
┌───────────── 分 (0 - 59)
│ ┌───────────── 時 (0 - 23)
│ │ ┌───────────── 日 (1 - 31)
│ │ │ ┌───────────── 月 (1 - 12)
│ │ │ │ ┌───────────── 曜日 (0 - 6) (日曜日が0)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

### スケジュール例

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-articles",
      "schedule": "0 * * * *",
      "description": "毎時0分に実行"
    },
    {
      "path": "/api/cron/generate-articles",
      "schedule": "0 9 * * *",
      "description": "毎日9時に実行"
    },
    {
      "path": "/api/cron/generate-articles",
      "schedule": "0 */6 * * *",
      "description": "6時間ごとに実行"
    },
    {
      "path": "/api/cron/generate-articles",
      "schedule": "0 9 * * 1-5",
      "description": "平日の9時に実行"
    }
  ]
}
```

## デプロイ手順

1. `vercel.json` をプロジェクトに追加
2. Vercel の環境変数に `CRON_SECRET` を追加
3. Vercel にデプロイ

```bash
git add vercel.json
git commit -m "Add Vercel Cron configuration"
git push origin main
```

4. Vercel ダッシュボードで Cron Jobs が有効になっていることを確認

## 推奨スケジュール

定期実行設定（`scheduledGenerations`）で指定された曜日・時間に実行されるため、Cron は**毎時0分**に実行することを推奨します：

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-articles",
      "schedule": "0 * * * *"
    }
  ]
}
```

これにより、管理画面で設定したスケジュール（例: 毎週月曜日 9:00）が正確に実行されます。

## 動作確認

### 1. ローカルでテスト

```bash
curl -X GET http://localhost:3000/api/cron/generate-articles \
  -H "Authorization: Bearer your-cron-secret"
```

### 2. Vercel でテスト

Vercel ダッシュボード > Settings > Cron Jobs > "Run Now" ボタンをクリック

### 3. ログを確認

Vercel ダッシュボード > Functions > ログを確認

## トラブルシューティング

### Cron が実行されない

1. `vercel.json` の構文が正しいか確認
2. `CRON_SECRET` 環境変数が設定されているか確認
3. Vercel ダッシュボードで Cron Jobs が有効になっているか確認

### 記事が生成されない

1. 定期実行設定（`scheduledGenerations`）が正しく登録されているか確認
2. `isActive` が `true` になっているか確認
3. 曜日と時間が正しく設定されているか確認
4. Vercel Functions のログを確認

### タイムアウトエラー

Vercel の無料プランでは Function の実行時間に制限があります。

- **Hobby プラン**: 10秒
- **Pro プラン**: 60秒
- **Enterprise プラン**: 900秒（15分）

記事生成には 3〜5 分かかるため、**Pro プラン以上**が必要です。

## セキュリティ

- `CRON_SECRET` は必ず環境変数に設定し、コードにハードコードしないでください
- `CRON_SECRET` は定期的に更新してください
- Vercel ダッシュボードでのみ Cron Jobs を管理してください

## 制限事項

- Vercel Cron Jobs は最短で 1 分ごとに実行可能
- タイムアウトはプランに依存
- 並列実行は制限される場合がある

## 参考リンク

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Cron 構文ジェネレーター](https://crontab.guru/)


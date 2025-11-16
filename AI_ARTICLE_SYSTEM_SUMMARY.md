# AI記事生成システム 実装まとめ

## 概要

このドキュメントは、Phase 1〜3 で実装した AI 記事生成システムの完全なまとめです。

---

## 🎯 実装した機能

### Phase 1: 基盤実装

#### データモデル（Firestore コレクション）

| コレクション | 説明 | 主要フィールド |
|-------------|------|---------------|
| `articlePatterns` | 記事構成パターン | name, description, prompt, mediaId |
| `writingStyles` | ライティング特徴 | writerId, name, description, prompt, mediaId |
| `imagePromptPatterns` | 画像プロンプトパターン | name, description, prompt, size, mediaId |
| `scheduledGenerations` | 定期実行設定 | categoryId, patternId, writerId, writingStyleId, imagePromptPatternId, daysOfWeek, timeOfDay, isActive, mediaId |

#### API Routes（CRUD）

- `/api/admin/article-patterns` - 構成パターン管理
- `/api/admin/writing-styles` - ライティング特徴管理
- `/api/admin/image-prompt-patterns` - 画像プロンプトパターン管理
- `/api/admin/scheduled-generations` - 定期実行設定管理

#### UI コンポーネント

- `ArticlePatternModal` - 構成パターン管理モーダル
- `ImagePromptPatternModal` - 画像プロンプトパターン管理モーダル
- `ScheduledGenerationModal` - 定期実行設定モーダル
- ライター編集画面にライティング特徴管理セクション追加

#### 管理画面統合

- `/admin-panel/articles/` - 構成パターン管理・定期実行設定ボタン
- `/admin-panel/media-library/` - 画像プロンプトパターン管理ボタン
- `/admin-panel/writers/[id]/edit/` - ライティング特徴管理セクション

---

### Phase 2: 高度な記事生成フロー

#### API Routes（記事生成）

| エンドポイント | 説明 | 使用AI |
|---------------|------|--------|
| `/api/admin/articles/generate-themes` | テーマ5つ生成 | Grok 2 |
| `/api/admin/articles/check-theme-duplicates` | 重複チェック（複数テーマ対応） | - |
| `/api/admin/articles/rewrite-with-style` | ライティング特徴リライト | Grok 2 |
| `/api/admin/articles/generate-inline-images` | 記事内画像生成＆配置 | DALL-E 3 |
| `/api/admin/articles/generate-advanced` | 12ステップ統合API | Grok 2 + OpenAI |

#### 12ステップ自動生成フロー

```
Step 0: パラメータ指定
  - カテゴリー
  - 構成パターン
  - ライター
  - ライティング特徴
  - 画像プロンプトパターン

Step 1: テーマ5つ生成（Grok 2）
  - カテゴリーと構成パターンに基づく
  - 最新情報を含む
  - SEOを意識したテーマ

Step 2: 重複チェック
  - 既存記事タイトルとの類似度計算
  - 70%以上で重複判定
  - 重複していないテーマを選択

Step 3: 記事ベース作成（Grok 2）
  - 3,000文字以上
  - HTML形式
  - 見出し（H2, H3）使用
  - 表（<table>）使用

Step 4: ライティング特徴リライト（Grok 2）
  - 指定されたライティングスタイルに変換
  - 内容は変更せず、トーンと表現を調整

Step 5: タグ自動割り当て（OpenAI）
  - 記事内容から5つのタグを生成
  - 既存タグとの統合
  - カテゴリー名との重複回避

Step 6: 新規タグ翻訳・登録（OpenAI）
  - 日本語 → 英語・中国語・韓国語
  - 自動的にFirestoreに登録

Step 7: アイキャッチ画像生成（DALL-E 3）
  - 画像プロンプトパターンに基づく
  - WebP変換、リサイズ、圧縮
  - Firebase Storage + メディアライブラリ登録

Step 8: ライター選択
  - 指定されたライターを割り当て

Step 9: メタデータ生成
  - スラッグ自動生成
  - メタタイトル（60文字以内）
  - メタディスクリプション（160文字以内）

Step 10: FAQ生成（OpenAI）
  - 記事内容から3〜5個の質問と回答を生成
  - Schema.org FAQPage 対応

Step 11: 記事内画像生成・配置（DALL-E 3）
  - 見出しに基づいて2〜3枚の画像を生成
  - 適切な位置に自動配置
  - WebP変換、リサイズ、圧縮
  - Firebase Storage + メディアライブラリ登録

Step 12: 非公開として保存
  - Firestoreに記事を保存
  - isPublished = false
  - AI Summary自動生成
```

#### UI コンポーネント

- `AdvancedArticleGeneratorModal` - AI高度記事生成モーダル
  - カテゴリー、構成パターン、ライター、ライティング特徴、画像プロンプトを選択
  - 生成中のローディングインジケータ
  - 生成完了後に記事一覧を更新

---

### Phase 3: 自動実行機能

#### API Routes（Cron）

| エンドポイント | 説明 | 実行タイミング |
|---------------|------|---------------|
| `/api/cron/generate-articles` | 定期実行設定に基づいて記事を自動生成 | Vercel Cron Jobs |

#### Cron実行フロー

```
1. Vercel Cron Jobsから毎時0分に実行
   ↓
2. 認証チェック（CRON_SECRET）
   ↓
3. 現在の曜日と時刻を取得（Asia/Tokyo）
   ↓
4. 該当する定期実行設定を取得
   - isActive = true
   - daysOfWeek に現在の曜日が含まれる
   - timeOfDay が現在の時刻と一致
   ↓
5. 各設定で12ステップ記事生成を実行
   ↓
6. 最終実行日時を更新
   ↓
7. 結果をJSONで返す
```

#### Vercel Cron Jobs設定

`vercel.json` に以下を追加：

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

環境変数に `CRON_SECRET` を追加：

```bash
CRON_SECRET=your-secure-random-string
```

---

## 📂 ファイル構成

### 新規作成ファイル

```
types/
  ├── article-pattern.ts
  ├── writing-style.ts
  ├── image-prompt-pattern.ts
  └── scheduled-generation.ts

app/api/admin/
  ├── article-patterns/
  │   ├── route.ts
  │   └── [id]/route.ts
  ├── writing-styles/
  │   ├── route.ts
  │   └── [id]/route.ts
  ├── image-prompt-patterns/
  │   ├── route.ts
  │   └── [id]/route.ts
  ├── scheduled-generations/
  │   ├── route.ts
  │   └── [id]/route.ts
  └── articles/
      ├── generate-themes/route.ts
      ├── check-theme-duplicates/route.ts
      ├── rewrite-with-style/route.ts
      ├── generate-inline-images/route.ts
      └── generate-advanced/route.ts

app/api/cron/
  └── generate-articles/route.ts

components/admin/
  ├── ArticlePatternModal.tsx
  ├── ImagePromptPatternModal.tsx
  ├── ScheduledGenerationModal.tsx
  └── AdvancedArticleGeneratorModal.tsx

ドキュメント/
  ├── AI_ARTICLE_SYSTEM_SUMMARY.md（このファイル）
  ├── ENV_SETUP_GUIDE.md
  └── VERCEL_CRON_SETUP.md
```

---

## 🔧 セットアップ手順

### 1. 環境変数の設定

`.env.local` に以下を追加：

```bash
OPENAI_API_KEY=sk-...
GROK_API_KEY=xai-...
CRON_SECRET=your-secure-random-string
```

詳細は `ENV_SETUP_GUIDE.md` を参照。

### 2. Firestore インデックスの作成

以下のクエリで使用されるインデックスを作成：

```
articles:
  - mediaId (ASC) + isPublished (ASC)

scheduledGenerations:
  - isActive (ASC)
```

Firebase Console > Firestore Database > Indexes で作成。

### 3. デプロイ

```bash
git add .
git commit -m "feat: AI記事生成システム実装"
git push origin main
```

Vercel が自動的にデプロイします。

### 4. Vercel環境変数の設定

Vercel ダッシュボードで以下を設定：

- `OPENAI_API_KEY`
- `GROK_API_KEY`
- `CRON_SECRET`
- その他の既存環境変数

### 5. Vercel Cron Jobsの設定

`vercel.json` をプロジェクトに追加し、再デプロイ。

詳細は `VERCEL_CRON_SETUP.md` を参照。

---

## 🧪 テスト手順

### 1. 構成パターン管理のテスト

1. `/admin-panel/articles/` にアクセス
2. オレンジ色の「構成パターン管理」ボタンをクリック
3. 新規パターンを作成
   - パターン名: レビュー形式
   - プロンプト: 導入 → 課題 → 解決策 → まとめ

### 2. 画像プロンプトパターン管理のテスト

1. `/admin-panel/media-library/` にアクセス
2. 紫色の「画像プロンプトパターン管理」ボタンをクリック
3. 新規パターンを作成
   - パターン名: ピクサー風イラスト
   - プロンプト: ピクサー風の3Dアニメーション...
   - サイズ: 1792x1024 (横長)

### 3. ライティング特徴管理のテスト

1. `/admin-panel/writers/[id]/edit/` にアクセス
2. ページ下部の「ライティング特徴管理」セクション
3. 新規ライティング特徴を作成
   - 特徴名: ですます調
   - プロンプト: 「ですます」調を使用、親しみやすく...

### 4. AI高度記事生成のテスト

1. `/admin-panel/articles/` にアクセス
2. 紫色の「AI高度記事生成」ボタンをクリック
3. 各項目を選択
   - カテゴリー: 任意
   - 構成パターン: 作成したパターン
   - ライター: 任意
   - ライティング特徴: 作成した特徴
   - 画像プロンプトパターン: 作成したパターン
4. 「生成開始」をクリック
5. 3〜5分待つ
6. 記事一覧に非公開記事が追加されることを確認

### 5. 定期実行設定のテスト

1. `/admin-panel/articles/` にアクセス
2. 緑色の「定期実行設定」ボタンをクリック
3. 新規設定を作成
   - 設定名: 毎週月曜日9時のAI記事
   - カテゴリー、パターン、ライター、特徴、画像を選択
   - 実行曜日: 月曜日にチェック
   - 実行時刻: 09:00
   - 有効/無効: 有効

### 6. Cron エンドポイントのテスト

```bash
curl -X GET https://your-domain.vercel.app/api/cron/generate-articles \
  -H "Authorization: Bearer your-cron-secret"
```

または Vercel ダッシュボード > Cron Jobs > "Run Now"

---

## 💰 コスト見積もり

### AI API コスト（1記事あたり）

| API | 用途 | トークン数 | コスト |
|-----|------|-----------|--------|
| Grok 2 | テーマ生成 | 〜1,000 | $0.001 |
| Grok 2 | 記事作成 | 〜6,000 | $0.006 |
| Grok 2 | リライト | 〜6,000 | $0.006 |
| OpenAI | タグ生成 | 〜200 | $0.001 |
| OpenAI | FAQ生成 | 〜1,000 | $0.005 |
| OpenAI | 翻訳 | 〜2,000 | $0.010 |
| DALL-E 3 | アイキャッチ | 1枚 | $0.080 |
| DALL-E 3 | 記事内画像 | 2枚 | $0.160 |
| **合計** | | | **約$0.27** |

### Firebase Storage コスト

- 画像3枚（約300KB）: 無料枠内

### Vercel コスト

- **Hobby プラン**: 無料（Cron Jobs利用不可、Function 10秒制限）
- **Pro プラン**: $20/月（Cron Jobs利用可能、Function 60秒制限）

**推奨**: Pro プラン以上（記事生成に3〜5分かかるため）

---

## ⚠️ 制限事項と注意点

### 1. 実行時間

- 12ステップ記事生成: 3〜5分
- Vercel Function のタイムアウト
  - Hobby: 10秒（利用不可）
  - Pro: 60秒（利用不可）
  - Enterprise: 900秒（15分）（利用可能）

→ **Pro プラン以上が必要**（`maxDuration: 300` 設定済み）

### 2. AI 生成の精度

- テーマ生成: 5つ中1〜2つが使えないことがある
- 重複チェック: 完璧ではない（類似度70%基準）
- リライト: 元の内容を大きく変えることがある

### 3. 画像生成

- DALL-E 3 は文字を含む画像を生成しないよう指示済み
- 稀に文字が含まれることがある
- 生成失敗時は該当ステップをスキップ

### 4. 並列実行

- Cron は同時に複数の定期実行設定を処理
- API レート制限に注意

---

## 🔐 セキュリティ

1. **API Key管理**
   - 環境変数に保存
   - `.env.local` を Git にコミットしない

2. **Cron認証**
   - `CRON_SECRET` による認証
   - 推測されにくい文字列を使用

3. **Firebase Security Rules**
   - 管理画面からのアクセスのみ許可

---

## 📊 監視とログ

### Vercel Functions ログ

Vercel ダッシュボード > Functions > ログを確認

### Firebase Firestore

- 記事が正しく保存されているか確認
- `lastExecutedAt` が更新されているか確認

### Algolia

- 記事公開時に正しく同期されているか確認

---

## 🐛 トラブルシューティング

### 記事生成が失敗する

1. 環境変数を確認（特に `OPENAI_API_KEY`, `GROK_API_KEY`）
2. Vercel Functions のログを確認
3. API クォータを確認

### Cron が実行されない

1. `CRON_SECRET` が設定されているか確認
2. `vercel.json` の構文が正しいか確認
3. Vercel ダッシュボードで Cron Jobs が有効か確認

### 画像が生成されない

1. `OPENAI_API_KEY` が設定されているか確認
2. Firebase Storage の権限を確認
3. DALL-E 3 のクォータを確認

### タイムアウトエラー

→ Vercel プランを確認（Pro以上が必要）

---

## 📚 参考ドキュメント

- [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md) - 環境変数セットアップ
- [VERCEL_CRON_SETUP.md](./VERCEL_CRON_SETUP.md) - Vercel Cron Jobs設定
- [AI_ARTICLE_GENERATION_LOGIC.md](./AI_ARTICLE_GENERATION_LOGIC.md) - 既存の記事生成ロジック

---

## 🎉 まとめ

Phase 1〜3 の実装により、以下が実現されました：

- ✅ 構成パターン、ライティング特徴、画像プロンプトの管理
- ✅ 12ステップの完全自動記事生成
- ✅ 定期実行による自動記事生成
- ✅ 手動でのAI高度記事生成

次のステップは、**手動テストで動作を確認**してから、**Vercel Cron Jobsを本番環境で有効化**してください。

---

**実装完了日**: 2025年11月16日
**実装者**: AI Assistant
**バージョン**: 1.0.0


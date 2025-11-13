# Firestore Indexes

このプロジェクトで必要なFirestore複合インデックスの一覧です。

## Blocks Collection

### 1. mediaId + placement + isActive + order
```
Collection: blocks
Fields:
  - mediaId (Ascending)
  - placement (Ascending)
  - isActive (Ascending)
  - order (Ascending)
```

**用途**: 特定のmediaIdと配置場所（placement）でアクティブなブロックを順序付きで取得

**コマンド**:
```bash
firebase firestore:indexes
```

### 2. mediaId + isActive + order
```
Collection: blocks
Fields:
  - mediaId (Ascending)
  - isActive (Ascending)
  - order (Ascending)
```

**用途**: 特定のmediaIdで全てのアクティブなブロックを順序付きで取得

## Articles Collection

既存のインデックスについてはプロジェクトのドキュメントを参照してください。

## 注意事項

- Firestoreコンソールでエラーが発生した場合、エラーメッセージ内のリンクから自動的にインデックスを作成できます
- 本番環境では、これらのインデックスを事前に作成しておくことを推奨します
- インデックスの作成には数分かかる場合があります


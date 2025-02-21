# デプロイメント手順

## GitHub Pages設定

### 1. リポジトリ設定
1. リポジトリの「Settings」タブを開く
2. 「Pages」セクションに移動
3. 「Build and deployment」セクションで以下を設定：
   - Source: GitHub Actions
   - Branch: main

### 2. 環境変数の設定
1. リポジトリの「Settings」→「Secrets and variables」→「Actions」
2. 必要に応じて以下の環境変数を設定：
   - `VITE_CELESTRAK_API_BASE_URL`
   - `VITE_USE_MOCK_DATA`
   - `VITE_OFFLINE_MODE`

### 3. ワークフロー権限の設定
1. リポジトリの「Settings」→「Actions」→「General」
2. 「Workflow permissions」セクションで以下を設定：
   - ✅ Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests

## デプロイ手順

### 自動デプロイ
1. mainブランチにプッシュすると自動的にデプロイが開始
2. GitHub Actionsタブでデプロイ状況を確認
3. デプロイ完了後、GitHub PagesのURLでアクセス可能

### 手動デプロイ
必要に応じて以下のコマンドでローカルビルドとテスト：
```bash
# 依存関係のインストール
npm install

# ビルド
npm run build

# ビルド結果のプレビュー
npm run preview
```

## 注意事項

### キャッシュ設定
- ブラウザキャッシュの有効期間: 1週間
- API呼び出し制限: 100リクエスト/時間

### CSP (Content Security Policy)
以下のドメインへのアクセスを許可：
- celestrak.org
- openstreetmap.org
- fonts.googleapis.com
- fonts.gstatic.com

### オフラインモード
開発時は`VITE_USE_MOCK_DATA=true`を設定することで、
APIアクセスを避けてモックデータでの動作確認が可能。

## トラブルシューティング

### デプロイ失敗時
1. GitHub Actionsのログを確認
2. 環境変数の設定を確認
3. リポジトリのPermissionsを確認

### API制限到達時
1. キャッシュの有効期限を確認
2. オフラインモードの使用を検討
3. レート制限の状況を確認（統計情報）

## モニタリング

### パフォーマンス監視
- ビルドサイズの確認
- ロード時間の計測
- キャッシュヒット率の確認

### エラー監視
- APIエラーの頻度
- キャッシュの状態
- CSP違反の検出

## 更新履歴

### 2025/2/21
- GitHub Actionsワークフローを追加
- CSP設定の追加
- キャッシュ戦略の改善
- ビルド最適化の実装

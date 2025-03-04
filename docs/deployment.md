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

### デプロイ失敗時の詳細な調査手順
1. GitHub Actionsのログを詳細に確認
   - エラーメッセージの具体的な内容を分析
   - スタックトレースを確認
2. 環境変数の設定を徹底的に確認
   - 各環境変数の値が正しいか検証
   - 機密情報の漏洩に注意
3. リポジトリのPermissionsを確認
   - GitHub Actionsに必要な権限が付与されているか
   - ブランチ保護ルールの影響を確認

### API制限到達時の対応
1. キャッシュの有効期限と戦略を再確認
   - キャッシュヘッダーの設定
   - キャッシュミドルウェアの最適化
2. オフラインモードの積極的な活用
   - モックデータの品質と網羅性を確認
   - 開発・テスト環境での効果的な使用
3. レート制限の状況を詳細に分析
   - APIプロバイダーのドキュメントを確認
   - リクエストパターンの最適化

## モニタリング

### パフォーマンス監視の具体的な実装
- ビルドサイズの継続的な分析
  - webpack-bundle-analyzer等のツールを使用
  - チャンク分割と遅延ローディングの最適化
- ロード時間の詳細な計測
  - Lighthouse CIの導入
  - Web Vitalsメトリクスの追跡
- キャッシュヒット率の高度な監視
  - サービスワーカーのキャッシュ戦略評価
  - キャッシュ関連メトリクスの収集

### エラー監視の高度な戦略
- APIエラーの包括的な追跡
  - エラー発生頻度と種類の分類
  - エラーログの一元管理
- キャッシュ状態の詳細な監視
  - キャッシュミス率の分析
  - キャッシュ関連の異常検出
- CSP違反の積極的な検出と対応
  - ブラウザコンソールでの違反ログ監視
  - 定期的なCSP設定の見直し

## 更新履歴

### 2025/2/21
- GitHub Actionsワークフローを追加
- CSP設定の追加
- キャッシュ戦略の改善
- ビルド最適化の実装

### 2025/3/4
- トラブルシューティングセクションの詳細化
- モニタリング方法の具体的な実装例を追加
- 最新のデプロイ要件と環境設定を更新

# GitHub Migration Guide

## 1. GitHubリポジトリの作成

1. GitHubで新しいprivateリポジトリを作成
   ```bash
   リポジトリ名: orbit-search
   Visibility: Private
   その他: デフォルト設定
   ```

2. リポジトリ設定の変更
   - Settings → Pages
   - Build and deployment → GitHub Actions

## 2. ローカルリポジトリの設定

1. GitHubリモートの追加
   ```bash
   # 現在のリモートを確認
   git remote -v

   # GitHubリモートを追加
   git remote add github https://github.com/your-username/orbit-search.git

   ```

2. mainブランチをGitHubにプッシュ
   ```bash
   # GitHub用のトークンを使用してプッシュ
   git push -u github main
   ```

## 3. GitHub Pages設定

1. リポジトリ設定
   - Settings → Actions → General
   - Workflow permissions: "Read and write permissions" を有効化

2. シークレットの設定（必要な場合）
   - Settings → Secrets and variables → Actions
   - 必要な環境変数を設定

3. デプロイの確認
   - Actions タブでワークフローの実行を確認
   - `https://[username].github.io/orbit-search/` でアクセス

## 4. CIワークフローの確認

1. `.github/workflows/deploy.yml` の設定確認
   - ブランチ名が正しいか
   - 環境変数が設定されているか

2. 初回デプロイの実行
   ```bash
   # 設定ファイルの変更をコミット
   git add .
   git commit -m "ci: GitHub Pages deployment setup"
   git push github main
   ```

## 5. リポジトリの管理

### 両方のリモートを維持する場合
```bash
# GitHubへのプッシュ
git push github main

# 全てのリモートへプッシュ
git push --all
```


## 注意事項

### Private Repositoryでの GitHub Pages
- Private repositoryではGitHub Pagesは利用できない（Public設定が必要）
- リポジトリをPublicに変更する必要があります
- カスタムドメインは利用可能

### セキュリティ設定
- リポジトリの可視性設定を確認
- シークレットやトークンの適切な管理
- 必要に応じてブランチ保護を設定

### CI/CD設定
- GitHub Actionsの使用制限を確認
- ビルドキャッシュの活用
- デプロイメントログの監視

## 他のホスティングサービスとの比較

### GitHub Pages
- 利点：
  - 無料で利用可能
  - GitHub Actionsと統合が容易
  - カスタムドメイン対応
- 欠点：
  - Private リポジトリでは利用不可（Public設定が必要）
  - ソースコードが公開されることを考慮する必要あり
- 環境変数の扱い：
  - ビルド時にGitHub Secretsから環境変数を注入可能
  - 実行時の環境変数は静的にバンドルする必要あり

### Netlify
- 利点：
  - 環境変数の管理が容易
  - 本番/開発環境の変数を分けやすい
- 欠点：
  - 無料プランの制限が厳しい
  - CIパイプラインが独自仕様

### Vercel
- 利点：
  - Next.js等との相性が良い
  - 環境変数のUI管理が優れている
- 欠点：
  - 無料プランの制限
  - プレビュー環境ごとの変数設定が有料機能

### 採用理由と注意点
GitHub Pagesを選択した理由：
1. 既存のGitHubワークフローとの統合が容易
2. GitHub Actionsで環境変数をビルド時に注入できる
3. 静的サイトホスティングとしては十分な機能を無料で提供

重要な注意点：
- リポジトリをPublicにする必要があります
- ソースコードは公開されますが、機密情報はGitHub Secretsで保護します
- オープンソースとしての価値も提供できます

### 環境変数の取り扱い方針
1. 開発時は.env.localを使用（git管理外）
2. 本番環境（GitHub Pages）用の環境変数はGitHub Secretsで管理
3. ビルド時にGitHub Actionsで環境変数を注入し、静的ファイルとしてバンドル

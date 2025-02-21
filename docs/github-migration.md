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
# Bitbucketへのプッシュ
git push bitbucket main

# GitHubへのプッシュ
git push github main

# 全てのリモートへプッシュ
git push --all
```

### GitHubに完全移行する場合
```bash
# Bitbucketリモートの削除
git remote remove bitbucket

# デフォルトリモートをGitHubに設定
git remote rename github origin
```

## 注意事項

### Private Repositoryでの GitHub Pages
- Private repositoryでもGitHub Pagesは利用可能
- アクセス制限は repository の設定に従う
- カスタムドメインも利用可能

### セキュリティ設定
- リポジトリの可視性設定を確認
- シークレットやトークンの適切な管理
- 必要に応じてブランチ保護を設定

### CI/CD設定
- GitHub Actionsの使用制限を確認
- ビルドキャッシュの活用
- デプロイメントログの監視

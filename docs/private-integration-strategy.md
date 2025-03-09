# GitHub公開リポジトリと非公開情報の連携方法

このリポジトリ（orbit-search）はGitHub Pagesで公開されていますが、公開したくない経営戦略などの情報と連携する方法について、以下の選択肢が考えられます。

## 1. プライベートリポジトリとの分離戦略

### 1.1 プライベートリポジトリの作成
```
orbit-search-private（非公開）
  ├── strategy/        # 経営戦略ドキュメント
  ├── analytics/       # 分析データ
  └── integration/     # 連携スクリプト
```

### 1.2 連携方法
- **Git Submodule**: 公開リポジトリ内にプライベートリポジトリをサブモジュールとして追加
- **環境変数分離**: 機密情報は`.env`ファイルに保存（`.gitignore`で除外済み）
- **GitHub Secretsの活用**: CI/CDパイプラインで使用する機密情報はGitHub Secretsに保存

## 2. 環境変数とシークレット管理

### 2.1 開発環境
- `.env.local`ファイルに非公開情報を保存（`.gitignore`で除外済み）
```
# 非公開API設定
VITE_PRIVATE_API_KEY=xxxxx
VITE_STRATEGY_API_ENDPOINT=https://api.example.com/strategy
```

### 2.2 本番環境
- GitHub Secretsに非公開情報を保存
- GitHub Actionsのワークフローで環境変数として注入

## 3. 外部サービスとの連携

### 3.1 プライベートAPIの構築
- Cloudflare WorkersやAWS Lambdaなどのサーバーレス関数を使用
- 認証トークンによるアクセス制限
- CORSの適切な設定

### 3.2 実装例
```javascript
// プライベートAPIとの連携
async function fetchStrategyData(token) {
  const response = await fetch('https://api.example.com/strategy', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
}
```

## 4. データの分離と参照

### 4.1 データ参照アーキテクチャ
```
Public Repo (orbit-search) <-- API --> Private Service <-- Private Repo
```

### 4.2 具体的な実装方法
- 公開リポジトリには最小限のコードのみをコミット
- 非公開データはプライベートAPIを通じて取得
- 認証と認可の適切な実装
- キャッシュ戦略の活用（既存のキャッシュ機構を利用）

## 5. ローカル開発環境での連携

### 5.1 ローカルプロキシの設定
```javascript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api/strategy': {
        target: 'https://private-api.example.com',
        changeOrigin: true,
        secure: false,
        headers: {
          'Authorization': `Bearer ${process.env.STRATEGY_API_TOKEN}`
        }
      }
    }
  }
});
```

### 5.2 モックデータの活用
- 開発時は`VITE_USE_MOCK_DATA=true`を設定
- 非公開情報のモックデータを用意

## 推奨アプローチ

現在のプロジェクト構成を考慮すると、以下の方法が最も適していると考えられます：

1. **プライベートAPIサービスの構築**:
   - Cloudflare Workersを活用（既存のcelestrak-proxyと同様の仕組み）
   - 適切な認証メカニズムの実装
   - CORSの設定

2. **環境変数による分離**:
   - 開発環境: `.env.local`ファイル（gitignore済み）
   - 本番環境: GitHub Secrets + GitHub Actions

3. **既存のキャッシュ機構の活用**:
   - `cacheService.ts`を拡張して非公開データもキャッシュ

この方法により、公開リポジトリのコードを変更することなく、非公開情報との安全な連携が可能になります。

# CelesTrakプロキシの設定手順

## 概要
CelesTrakへの直接アクセスが制限されている開発環境向けに、Cloudflare Workersを使用したプロキシを提供しています。
このプロキシを使用することで、開発環境でもCelesTrakのTLEデータにアクセスすることができます。

## 前提条件
- Node.jsがインストールされていること
- Cloudflareアカウントを持っていること

## セットアップ手順

### 1. Cloudflareアカウントの作成
1. [Cloudflare](https://dash.cloudflare.com/sign-up)でアカウントを作成
2. メールアドレスとパスワードを設定

### 2. Cloudflare Workersの開発ツールのインストール
```bash
npm install -g wrangler
```

### 3. Cloudflareへのログイン
```bash
wrangler login
```
ブラウザが開き、Cloudflareの認証画面が表示されます。作成したアカウントでログインしてください。

### 4. Account IDの確認
wranglerでログインした後、以下の手順でAccount IDを確認します：

```bash
wrangler whoami
```

表示される情報の中から`Account ID`をコピーし、`workers-site/wrangler.toml`の`account_id`フィールドに貼り付けます。

```toml
name = "celestrak-proxy"
type = "javascript"
account_id = "あなたのAccount ID" # ここに貼り付け
workers_dev = true
```

### 4. Workersのデプロイ
```bash
cd workers-site
wrangler publish
```

### 5. デプロイとURL設定
1. Workerをデプロイします：
```bash
cd workers-site
wrangler deploy
```

2. デプロイが成功すると、以下のようなURLが表示されます：
```
https://celestrak-proxy.あなたのサブドメイン.workers.dev
```

3. このURLは自動的にvite.config.tsに設定されます。もし手動で設定する必要がある場合は：
```typescript
'/celestrak': {
  target: 'https://celestrak-proxy.あなたのサブドメイン.workers.dev',
  changeOrigin: true,
  secure: true,
  rewrite: (path) => path.replace(/^\/celestrak/, '/proxy'),
}
```

## 制限事項
- Cloudflare Workersの無料プラン制限
  - 1日あたり10万リクエストまで
  - 1リクエストあたり10msの実行時間制限
- エラー発生時は自動的にモックデータにフォールバック

## トラブルシューティング

### プロキシエラーが発生する場合
1. ブラウザの開発者ツールでネットワークタブを確認
2. Cloudflareのダッシュボードでワーカーのログを確認
3. 必要に応じてCloudflare Workersの設定を調整

### デプロイに失敗する場合
1. `wrangler login`を再実行
2. Account IDが正しく設定されているか確認
3. プロジェクトディレクトリで`wrangler whoami`を実行して認証状態を確認

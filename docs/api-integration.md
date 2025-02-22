# 外部API連携ガイド

## CelesTrak APIの利用

### 概要
現在、アプリケーションはCelesTrak APIを使用してTLEデータを取得しています。

### 設定手順

1. デバッグモードの設定
`.env`ファイルで以下のように設定します：
```bash
VITE_DEBUG=false  # 実際のAPIを使用する場合
```

2. APIエンドポイント
- ベースURL: `https://celestrak.com`
- APIキーは不要です
- TLEデータは自動的に24時間キャッシュされます

3. リクエスト例
```http
GET https://celestrak.com?CATNR=25544&FORMAT=json
```

### デバッグモード

開発中は`VITE_DEBUG=true`を設定することで、モックデータを使用できます：

```json
{
  "25544": {  // ISS (ZARYA)のNORAD ID
    "line1": "1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927",
    "line2": "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537"
  }
}
```

### 動作確認

1. 環境変数の設定を確認
2. アプリケーションを起動：
```bash
npm run dev
```

3. ブラウザの開発者ツール（DevTools）でネットワークタブを開く
4. 地図上で位置を選択し、APIリクエストを確認

成功時のログ例：
```
API Request: GET https://celestrak.com?CATNR=25544&FORMAT=json
API Response: 200 with TLE data
```

## トラブルシューティング

### CORS問題の解決

CORSエラーが発生する場合は、以下のようにvite.config.tsでプロキシを設定します：

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/celestrak': {
        target: 'https://celestrak.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/celestrak/, '')
      }
    }
  }
})
```

### APIリクエストのエラー

1. ネットワーク接続を確認
2. `VITE_DEBUG=true`に設定してモックデータでテスト
3. CelesTrakのステータスページを確認
4. コンソールでエラーメッセージを確認：
```
API Error: Failed to get TLE data
```

### キャッシュの問題

キャッシュをクリアする方法：
1. ブラウザのDevToolsを開く
2. Application > Local Storage
3. サイトのデータをクリア

## 将来の拡張：N2YO API

フォールバックオプションとして、N2YO APIの統合を計画中です：

1. [N2YO.com](https://www.n2yo.com/api/)でアカウント作成
2. APIキーを取得
3. 環境変数の追加（将来的に実装予定）：
```bash
VITE_N2YO_API_KEY=your_api_key_here
```

## リクエスト制限とキャッシュ戦略

現在の実装では以下の設定が適用されています：

```typescript
const API_CONFIG = {
  TIMEOUT: {
    DEFAULT: 10000,    // 10秒
    CELESTRAK: 30000   // 30秒
  },
  RETRY: {
    MAX_RETRIES: 3,
    DELAY: 1000, // 初期遅延（ミリ秒）
  }
}
```

- 最大3回のリトライ
- 指数バックオフ遅延（最大10秒）
- TLEデータの24時間キャッシュ

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

### APIリクエストのエラーハンドリング

1. ネットワーク接続を確認
2. `VITE_DEBUG=true`に設定してモックデータでテスト
3. CelesTrakのステータスページを確認
4. コンソールでエラーメッセージを確認：
```
API Error: Failed to get TLE data
```

#### エラーハンドリングの詳細な実装

```typescript
async function fetchTLEData(satelliteId: string) {
  try {
    const response = await axios.get(`/celestrak?CATNR=${satelliteId}&FORMAT=json`, {
      timeout: API_CONFIG.TIMEOUT.CELESTRAK,
      retry: {
        retries: API_CONFIG.RETRY.MAX_RETRIES,
        retryDelay: (retryCount) => {
          // 指数バックオフ戦略
          return Math.min(
            API_CONFIG.RETRY.DELAY * Math.pow(2, retryCount),
            10000 // 最大10秒
          );
        }
      }
    });
    return response.data;
  } catch (error) {
    // エラーの詳細なログと適切な例外処理
    console.error('TLE Data Fetch Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status
    });

    // エラー種別に応じた適切な処理
    if (error.code === 'ECONNABORTED') {
      // タイムアウトエラー
      throw new Error('APIリクエストがタイムアウトしました');
    }

    if (error.response) {
      // サーバーからのエラーレスポンス
      switch (error.response.status) {
        case 429:
          throw new Error('リクエスト制限を超えました');
        case 500:
          throw new Error('サーバー内部エラーが発生しました');
        default:
          throw new Error('APIリクエストに失敗しました');
      }
    }

    throw error;
  }
}
```

### キャッシュの問題

キャッシュをクリアする方法：
1. ブラウザのDevToolsを開く
2. Application > Local Storage
3. サイトのデータをクリア

## 将来の拡張：N2YO API

### 統合計画

フォールバックオプションとして、N2YO APIの統合を具体的に計画しています：

1. APIの特徴
   - リアルタイムの衛星追跡
   - 複数の衛星情報の同時取得
   - 高度な軌道情報の提供

2. 統合手順
   - [N2YO.com](https://www.n2yo.com/api/)でアカウント作成
   - APIキーを取得
   - 環境変数の追加：
     ```bash
     VITE_N2YO_API_KEY=your_api_key_here
     ```

3. 実装予定の機能
   - 複数APIソースからのデータフェッチ
   - 自動フォールバックメカニズム
   - データ整合性の検証

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
  },
  CACHE: {
    TLE_EXPIRATION: 24 * 60 * 60 * 1000, // 24時間
    STRATEGY: 'stale-while-revalidate' // キャッシュ戦略
  }
}
```

### キャッシュ戦略の詳細

- 最大3回のリトライ
- 指数バックオフ遅延（最大10秒）
- TLEデータの24時間キャッシュ
- stale-while-revalidate戦略の採用
  - キャッシュの有効期限切れ後も一時的に古いデータを返却
  - バックグラウンドで新しいデータを非同期に取得

## 更新履歴

### 2025/2/21
- CelesTrak APIの基本的な連携方法を文書化
- デバッグモードとモックデータの設定を追加
- 初期のエラーハンドリング戦略を実装

### 2025/3/4
- エラーハンドリングの詳細な実装例を追加
- N2YO API統合計画の具体化
- キャッシュ戦略の詳細な説明を追記
- トラブルシューティングセクションの拡充

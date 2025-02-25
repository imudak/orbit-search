# CelesTrak API仕様と最適化方針

## 現状の実装と課題

1. **現在の実装**
   ```http
   GET https://celestrak.org/NORAD/elements/visual.txt
   GET https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=json
   ```
   - すべての可視衛星のTLEデータを取得
   - 位置や仰角による事前フィルタリングなし

2. **実際のCelesTrak API仕様** ([公式ドキュメント](https://celestrak.org/NORAD/documentation/gp.php))
   ```http
   # 単一衛星の取得
   GET /NORAD/elements/gp.php?CATNR=25544

   # 特定グループの取得
   GET /NORAD/elements/gp.php?GROUP=visual

   # 複数衛星の取得（最大100個まで）
   GET /NORAD/elements/gp.php?CATNR=25544,25545,25546
   ```

## 最適化方針

1. **衛星データの段階的取得**
   ```typescript
   async function fetchSatellites(params: SearchParams) {
     // 1. 最初は小規模なバッチで取得
     const initialBatchSize = 20;
     const satellites = await fetchBatch(initialBatchSize);

     // 2. 必要に応じて追加取得
     if (needMoreSatellites) {
       const nextBatch = await fetchBatch(20, satellites.length);
       satellites.push(...nextBatch);
     }
   }
   ```

2. **CATNR（NORAD ID）による取得の最適化**
   - キャッシュされた衛星IDを利用
   - よく利用される衛星のリストを保持
   ```typescript
   const COMMON_SATELLITES = [
     '25544',  // ISS
     // ... その他の主要な衛星
   ];
   ```

3. **バッチサイズの最適化**
   ```typescript
   const BATCH_CONFIG = {
     INITIAL_BATCH: 20,    // 初期取得数
     MAX_BATCH: 50,        // バッチあたりの最大数
     TOTAL_LIMIT: 100      // 合計取得上限
   };
   ```

4. **リクエスト制御の改善**
   ```typescript
   const REQUEST_CONFIG = {
     RATE_LIMIT: {
       MAX_REQUESTS: 10,   // 10リクエスト
       TIME_WINDOW: 60000  // 1分あたり
     },
     RETRY: {
       MAX_RETRIES: 3,
       BASE_DELAY: 1000    // 1秒
     }
   };
   ```

## プロキシサーバーの改善

1. **レート制限の実装**
   ```javascript
   // celestrak-proxy.js
   const rateLimit = {
     requests: new Map(),
     checkLimit(ip) {
       const now = Date.now();
       const windowStart = now - REQUEST_CONFIG.RATE_LIMIT.TIME_WINDOW;

       // 古いリクエストを削除
       for (const [time] of this.requests) {
         if (time < windowStart) this.requests.delete(time);
       }

       // 制限チェック
       return this.requests.size < REQUEST_CONFIG.RATE_LIMIT.MAX_REQUESTS;
     }
   };
   ```

2. **バッチリクエストの最適化**
   ```javascript
   async function optimizeBatchRequest(satellites) {
     // 100個ごとにバッチ分割
     const batches = [];
     for (let i = 0; i < satellites.length; i += 100) {
       batches.push(satellites.slice(i, i + 100));
     }

     // 順次処理
     const results = [];
     for (const batch of batches) {
       const ids = batch.join(',');
       const response = await fetch(`/NORAD/elements/gp.php?CATNR=${ids}`);
       results.push(...await response.json());
     }

     return results;
   }
   ```

## キャッシュ戦略の改善

1. **階層的キャッシュ**
   - ブラウザキャッシュ（短期）
   - Cloudflareキャッシュ（中期）
   - アプリケーションキャッシュ（長期）

2. **キャッシュ有効期限の最適化**
   ```javascript
   const CACHE_TTL = {
     BROWSER: 3600,         // 1時間
     CLOUDFLARE: 7200,      // 2時間
     APPLICATION: 86400     // 24時間
   };
   ```

この最適化により：
- APIリクエスト数の削減
- データ転送量の最小化
- レスポンス時間の改善
が期待できます。

# API最適化に関する提案

## 現状の課題

1. **データ取得の非効率性**
   - 全ての可視衛星（visual group）のTLEデータを取得
   - APIリクエスト時に件数制限なし
   - サーバー負荷が高い可能性

2. **既存の制限**
   ```typescript
   const MAX_SATELLITES = 100; // 一度に処理する最大衛星数
   ```
   - この制限は取得後のフィルタリング時にのみ適用
   - API取得時には適用されていない

## 最適化提案

1. **APIリクエストの最適化**
   ```typescript
   const requestConfig = {
     params: {
       GROUP: 'visual',
       FORMAT: 'json',
       LIMIT: MAX_SATELLITES,  // 追加：取得件数の制限
       // 以下のようなパラメータの追加を検討
       MIN_ELEVATION: params.minElevation,
       LATITUDE: params.latitude,
       LONGITUDE: params.longitude
     }
   };
   ```

2. **取得方法の改善案**
   - 初期段階での衛星数制限
   - 観測地点周辺の衛星を優先的に取得
   - キャッシュの有効活用

3. **段階的取得の実装**
   ```typescript
   const fetchSatellites = async (params: SearchParams) => {
     // 1. まずキャッシュをチェック
     const cachedSatellites = await getCachedSatellites();

     // 2. 必要な追加データ数を計算
     const neededCount = MAX_SATELLITES - cachedSatellites.length;

     // 3. 必要な場合のみAPIリクエスト
     if (neededCount > 0) {
       const newSatellites = await fetchFromAPI({
         limit: neededCount,
         ...params
       });
     }
   };
   ```

## 期待される効果

1. **APIサーバーの負荷軽減**
   - リクエスト数の削減
   - 転送データ量の削減

2. **アプリケーションのパフォーマンス向上**
   - 処理対象データの削減
   - レスポンス時間の短縮

3. **ユーザー体験の改善**
   - 必要な衛星データのみを素早く表示
   - スムーズな操作感の実現

## 実装手順

1. APIパラメータの拡張
   - CelesTrak APIの仕様確認
   - 利用可能なフィルタリングパラメータの調査
   - 新しいパラメータの追加

2. キャッシュ戦略の改善
   - キャッシュの有効期限設定
   - 位置情報に基づくキャッシュの管理
   - 効率的なキャッシュ更新方法

3. フロントエンド側の対応
   - プログレッシブローディングの実装
   - エラーハンドリングの強化
   - ユーザーフィードバックの改善

## プロキシサーバーでの最適化

1. **データフィルタリングの前倒し**
   ```javascript
   // celestrak-proxy.js
   export default {
     async fetch(request) {
       const url = new URL(request.url);
       const params = new URLSearchParams(url.search);

       // リクエストパラメータから制限値を取得
       const limit = parseInt(params.get('LIMIT') || '100');
       const minElevation = parseFloat(params.get('MIN_ELEVATION') || '0');

       // CelesTrakからのレスポンスを処理
       const response = await fetch(celestrakRequest);
       const data = await response.json();

       // サーバーサイドでの初期フィルタリング
       const filteredData = data
         .slice(0, limit)  // 件数制限
         .filter(sat => {
           // 基本的なフィルタリング条件をここで適用
           return true;  // 実際の条件はTLEデータに基づいて実装
         });

       return new Response(JSON.stringify(filteredData), {
         headers: responseHeaders
       });
     }
   }
   ```

2. **キャッシュの最適化**
   ```javascript
   // Cloudflare Workersのキャッシュを活用
   const cacheKey = request.url;
   const cache = caches.default;

   // キャッシュの確認
   let response = await cache.match(cacheKey);
   if (response) {
     return response;
   }

   // キャッシュがない場合は新規取得
   response = await fetch(celestrakRequest);

   // レスポンスをキャッシュ（1時間）
   response = new Response(response.body, response);
   response.headers.set('Cache-Control', 's-maxage=3600');
   await cache.put(cacheKey, response.clone());
   ```

3. **エラー処理の改善**
   - レート制限の管理
   - フォールバックメカニズムの実装
   - 詳細なエラーレポート

これらの改善により、APIへの負荷を軽減しつつ、より効率的なデータ取得が可能になります。

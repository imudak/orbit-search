# コードメトリクス

## TypeScriptコードの行数

### 1. コンポーネント（.tsx）: 1,264行
- Map.tsx: 497行
  - 地図表示、軌道パス描画、可視範囲表示など
- SatelliteList.tsx: 259行
  - 衛星リスト表示、フィルタリング機能
- SearchPanel.tsx: 177行
  - 検索条件入力、フィルター設定
- App.tsx: 296行
  - アプリケーションのメインコンポーネント
- main.tsx: 35行
  - アプリケーションのエントリーポイント

### 2. サービス層（services/）: 1,192行
- satelliteService.ts: 396行
  - 衛星データの取得、処理、フィルタリング
- cacheService.ts: 214行
  - TLEデータのキャッシュ管理
- tleParserService.ts: 171行
  - TLEデータのパース、軌道計算
- tleService.ts: 179行
  - TLEデータの取得、管理
- orbitService.ts: 170行
  - 軌道計算、Web Worker管理
- visibilityService.ts: 62行
  - 衛星の可視性計算

### 3. テストコード（__tests__/）: 488行
- 統合テスト（integration/）: 284行
  - constants.ts: 7行
  - helpers.ts: 50行
  - setup.ts: 34行
  - tleService.error.test.ts: 96行
  - tleService.integration.test.ts: 97行
- モック（mocks/）: 46行
  - cacheService.mock.ts: 24行
  - tleService.mock.ts: 22行
- サービステスト（services/）: 158行
  - satelliteService.test.ts: 75行
  - tleService.test.ts: 83行

### 4. その他: 642行
- 型定義（types/）: 177行
  - index.ts: 83行
  - axios.d.ts: 94行
- ユーティリティ（utils/）: 129行
  - api.ts: 129行
- Web Worker: 210行
  - orbitWorker.ts: 210行
- フック（hooks/）: 17行
  - useTLE.ts: 17行
- ストア（store/）: 40行
  - index.ts: 40行
- その他: 69行
  - theme.ts: 39行
  - vite-env.d.ts: 30行

## 総合計: 3,586行

## 特徴
1. **大規模コンポーネント**
   - Map.tsx（497行）が最大のファイルで、複雑な地図表示ロジックを含む
   - 次いでsatelliteService.ts（396行）が大きく、衛星データ処理の中心的な役割を担う

2. **コード分布**
   - UIコンポーネント: 35.2%（1,264行）
   - サービス層: 33.2%（1,192行）
   - テストコード: 13.6%（488行）
   - その他（型定義、ユーティリティなど）: 17.9%（642行）

3. **テストカバレッジ**
   - テストコードは全体の約14%を占める
   - 特にTLEサービスに関するテストが充実（統合テスト193行）

4. **アーキテクチャ**
   - サービス層とUIコンポーネントでほぼ同じ行数
   - Web Workerを使用した非同期処理の実装
   - 型定義とユーティリティが適度な割合で存在

## 結論
中規模のTypeScriptアプリケーションとして、機能ごとに適切に分割されており、テストコードも一定量確保されています。特に地図表示と衛星データ処理に関する実装が充実しています。

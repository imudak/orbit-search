# 技術仕様書

## 1. 技術スタック

### 1.1 フロントエンド
- **フレームワーク**: React 18
- **言語**: TypeScript 5.x
- **ビルドツール**: Vite
- **パッケージマネージャー**: npm

### 1.2 UIライブラリ
- **コンポーネントライブラリ**: Material-UI (MUI) v5
- **地図ライブラリ**: Leaflet + React-Leaflet
- **日時処理**: date-fns
- **状態管理**: React Query + Zustand

### 1.3 衛星軌道計算
- **TLE計算**: satellite.js
- **データソース**: CelesTrak API
- **ジオコーディング**: OpenStreetMap Nominatim API

## 2. アプリケーション構造

### 2.1 ディレクトリ構成
```
src/
├── components/       # Reactコンポーネント
├── hooks/           # カスタムフック
├── lib/             # ユーティリティ関数
├── services/        # API通信など外部サービス
├── stores/          # 状態管理
└── types/           # 型定義
```

### 2.2 主要コンポーネント
- `Map`: 地図表示と観測地点選択
- `DateTimePicker`: 期間選択
- `SatelliteList`: 衛星リスト表示
- `OrbitVisualization`: 軌道可視化
- `SearchFilters`: 検索条件設定
- `ExportDialog`: データエクスポート

## 3. データフロー

### 3.1 TLEデータ取得
1. CelesTrak APIからのデータ取得
2. クライアントサイドでのキャッシュ管理
3. 定期的な更新処理

### 3.2 衛星可視性計算
1. 観測地点・期間の入力
2. satellite.jsによる軌道計算
3. 可視性条件のフィルタリング
4. 結果の表示・可視化

## 4. API統合

### 4.1 CelesTrak API
```typescript
interface TLEData {
  name: string;
  line1: string;
  line2: string;
  timestamp: string;
}

interface APIResponse {
  data: TLEData[];
  updatedAt: string;
}
```

### 4.2 エラーハンドリング
- API通信エラー
- レート制限対応
- オフライン時の動作

## 5. パフォーマンス最適化

### 5.1 データキャッシング
- React Queryによるキャッシュ管理
- IndexedDBを使用したローカルストレージ
- キャッシュの有効期限設定

### 5.2 計算処理の最適化
- Web Workersによる並列処理
- 計算結果のメモ化
- 必要に応じた計算の遅延実行

## 6. セキュリティ考慮事項

### 6.1 API認証
- APIキーの環境変数管理
- クライアントサイドでの秘密情報の保護

### 6.2 データ保護
- ローカルストレージの暗号化
- センシティブデータの適切な処理

## 7. テスト戦略

### 7.1 単体テスト
- Jest + React Testing Library
- 主要ユーティリティ関数のテスト
- コンポーネントの振る舞いテスト

### 7.2 E2Eテスト
- Cypress
- 主要ユースケースのテスト
- クロスブラウザテスト

## 8. デプロイメント

### 8.1 ビルドプロセス
```bash
# 開発ビルド
npm run dev

# 本番ビルド
npm run build
```

### 8.2 GitHub Pages設定
- GitHub Actionsによる自動デプロイ
- 環境変数の設定
- キャッシュ制御

## 9. 将来の技術的考慮事項

### 9.1 スケーラビリティ
- WebAssemblyへの移行検討
- データ処理の最適化
- オフライン機能の強化

### 9.2 保守性
- コードの自動フォーマット
- ESLint/Prettierの設定
- ドキュメント生成の自動化

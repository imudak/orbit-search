# 開発環境セットアップガイド

## 1. 必要要件

### 1.1 必須ソフトウェア
- Node.js (v18.0.0以上)
- npm (v9.0.0以上)
- Git

### 1.2 推奨開発ツール
- Visual Studio Code
- 推奨VS Code拡張機能：
  - ESLint
  - Prettier
  - TypeScript Vue Plugin (Volar)
  - GitLens
  - Mermaid Preview

## 2. 初期セットアップ

### 2.1 リポジトリのクローン
```bash
git clone https://github.com/your-username/orbit-search.git
cd orbit-search
```

### 2.2 依存関係のインストール
```bash
npm install
```

### 2.3 環境変数の設定
1. `.env.example`をコピーして`.env.local`を作成
```bash
cp .env.example .env.local
```

2. 必要な環境変数を設定
```bash
# .env.local
VITE_CELESTRAK_API_KEY=your_api_key_here
VITE_MAP_TILE_LAYER_URL=your_map_tile_url_here
```

## 3. 開発サーバーの起動

### 3.1 ローカル開発サーバー
```bash
npm run dev
```
- デフォルトURL: http://localhost:5173
- Hot Module Replacement (HMR) 対応

### 3.2 本番ビルド
```bash
npm run build
npm run preview  # ビルド結果のプレビュー
```

## 4. プロジェクト構成

### 4.1 主要ディレクトリ
```
orbit-search/
├── docs/           # ドキュメント
├── public/         # 静的ファイル
├── src/            # ソースコード
├── tests/          # テストファイル
└── types/          # 型定義ファイル
```

### 4.2 設定ファイル
- `vite.config.ts`: Vite設定
- `tsconfig.json`: TypeScript設定
- `package.json`: プロジェクト設定
- `.eslintrc.js`: ESLint設定
- `.prettierrc`: Prettier設定

## 5. 開発ワークフロー

### 5.1 ブランチ戦略
- `main`: 本番環境用ブランチ
- `develop`: 開発用ブランチ
- 機能開発: `feature/*`
- バグ修正: `fix/*`

### 5.2 コミットメッセージ規約
```
feat: 新機能
fix: バグ修正
docs: ドキュメントのみの変更
style: コードスタイルの変更
refactor: リファクタリング
test: テストコード
chore: ビルドプロセス等の変更
```

### 5.3 プルリクエストプロセス
1. 機能ブランチを作成
2. 変更を実装
3. テストを追加・実行
4. プルリクエストを作成
5. コードレビュー
6. マージ

## 6. テスト

### 6.1 テストの実行
```bash
# 全テストの実行
npm run test

# 特定のテストの実行
npm run test -- -t "test-name"

# テストカバレッジの確認
npm run test:coverage
```

### 6.2 E2Eテスト
```bash
# Cypressテストの実行
npm run test:e2e
```

## 7. デプロイ

### 7.1 GitHub Pagesへのデプロイ
```bash
npm run deploy
```

### 7.2 手動デプロイ手順
1. 本番ビルドの作成
```bash
npm run build
```

2. `dist`ディレクトリの内容をデプロイ

## 8. トラブルシューティング

### 8.1 一般的な問題
- **依存関係のエラー**
  ```bash
  rm -rf node_modules
  npm clean-cache
  npm install
  ```

- **TypeScriptエラー**
  ```bash
  npm run type-check
  ```

### 8.2 キャッシュのクリア
```bash
# Viteのキャッシュクリア
npm run clean

# 依存関係の再インストール
npm run reinstall
```

## 9. 参考リンク

- [React ドキュメント](https://react.dev/)
- [TypeScript ドキュメント](https://www.typescriptlang.org/docs/)
- [Vite ガイド](https://vitejs.dev/guide/)
- [Material-UI コンポーネント](https://mui.com/components/)
- [Leaflet ドキュメント](https://leafletjs.com/reference.html)
- [satellite.js ドキュメント](https://github.com/shashwatak/satellite-js)

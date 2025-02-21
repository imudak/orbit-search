# Orbit Search

衛星のTLEデータ検索・可視性計算Webアプリケーション

## 概要

指定された観測地点から可視可能な衛星を検索し、TLEデータを取得できるWebアプリケーションです。
観測地点の選択や期間指定をGUIで直感的に行うことができ、衛星の軌道も可視化します。

## 主な機能

- 地図上での観測地点の選択
- カレンダーでの期間選択
- 衛星の可視性計算と検索
- 衛星軌道の可視化
- TLEデータの取得
- 昼夜の可視条件表示
- 検索結果の一括エクスポート
- オフラインモードサポート
- キャッシュによる高速化

## 技術スタック

- フロントエンド: React + TypeScript
- 地図表示: Leaflet
- UIフレームワーク: Material-UI
- 軌道計算: satellite.js
- データソース: CelesTrak
- ビルドツール: Vite
- ホスティング: GitHub Pages

## ドキュメント

詳細なドキュメントは[docsディレクトリ](./docs)を参照してください：

- [要件定義](./docs/requirements.md)
- [技術仕様](./docs/technical-spec.md)
- [アーキテクチャ設計](./docs/architecture.md)
- [開発環境セットアップ](./docs/setup.md)
- [デプロイメントガイド](./docs/deployment.md)
- [実装状況](./docs/implementation-status.md)

## 開発環境のセットアップ

```bash
# リポジトリのクローン
git clone https://github.com/your-username/orbit-search.git
cd orbit-search

# 環境変数の設定
cp .env.example .env
# .envファイルを編集して必要な設定を行う

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルドとプレビュー
npm run build
npm run preview
```

## オフラインモード

開発時はオフラインモードを使用することで、APIアクセスを避けることができます：

1. .envファイルで `VITE_USE_MOCK_DATA=true` を設定
2. `npm run dev` で開発サーバーを起動

## デプロイメント

GitHub Pagesへのデプロイは自動化されています：

1. mainブランチにプッシュ
2. GitHub Actionsが自動的にビルドとデプロイを実行
3. `https://[username].github.io/orbit-search/` でアクセス可能

詳細は[デプロイメントガイド](./docs/deployment.md)を参照してください。

## ライセンス

このプロジェクトはMITライセンスの下で提供されています。

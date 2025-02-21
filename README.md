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

## 技術スタック

- フロントエンド: React + TypeScript
- 地図表示: Leaflet
- UIフレームワーク: Material-UI
- 軌道計算: satellite.js
- データソース: CelesTrak

## ドキュメント

詳細なドキュメントは[docsディレクトリ](./docs)を参照してください：

- [要件定義](./docs/requirements.md)
- [技術仕様](./docs/technical-spec.md)
- [アーキテクチャ設計](./docs/architecture.md)
- [開発環境セットアップ](./docs/setup.md)

## 開発環境のセットアップ

```bash
# リポジトリのクローン
git clone https://github.com/your-username/orbit-search.git
cd orbit-search

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm start
```

## ライセンス

このプロジェクトはMITライセンスの下で提供されています。

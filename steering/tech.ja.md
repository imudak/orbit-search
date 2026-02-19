# 技術スタック — Orbit Search

**Project**: orbit-search
**Last Updated**: 2026-02-18
**Version**: 1.0

---

## 概要

React + TypeScript + Vite によるSPA。
satellite.js でブラウザ内軌道計算、Leaflet で地図表示、MUI でUI。

---

## プライマリ技術

### 言語・ランタイム

| 技術 | バージョン | 役割 |
|------|-----------|------|
| TypeScript | 5.x | 全コード |
| React | 18+ | UIライブラリ |
| Vite | 5+ | ビルドツール |

### 地図・可視化

| 技術 | バージョン | 役割 |
|------|-----------|------|
| Leaflet | 最新 | 地図表示・軌道描画 |
| react-leaflet | 最新 | ReactラッパーAPI |

### UIフレームワーク

| 技術 | バージョン | 役割 |
|------|-----------|------|
| Material-UI (MUI) | 最新 | UIコンポーネント |
| @mui/x-date-pickers | 最新 | カレンダー期間選択 |
| date-fns | 最新 | 日付操作 |

### 軌道計算

| 技術 | バージョン | 役割 |
|------|-----------|------|
| satellite.js | 最新 | TLE → 軌道計算（位置・仰角・方位角） |

### データ取得・状態管理

| 技術 | バージョン | 役割 |
|------|-----------|------|
| axios | 最新 | HTTP クライアント |
| axios-retry | 最新 | リトライ制御 |
| @tanstack/react-query | 最新 | サーバー状態管理・キャッシュ |
| zustand | 最新 | クライアント状態管理 |

### ストレージ・キャッシュ

| 技術 | バージョン | 役割 |
|------|-----------|------|
| idb | 最新 | IndexedDB（TLEキャッシュ） |

---

## データソース

- **CelesTrak**: TLEデータ（無料API）
- **フォーマット**: TLE（Two-Line Element Set）

---

## 主要コマンド

```bash
npm run dev    # 開発サーバー
npm run build  # 本番ビルド
npm run lint   # ESLintチェック
```

---

## デプロイ

- **GitHub Pages**: 静的ホスティング

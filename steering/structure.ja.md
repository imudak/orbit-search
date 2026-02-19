# プロジェクト構造 — Orbit Search

**Project**: orbit-search
**Last Updated**: 2026-02-18
**Version**: 1.0

---

## アーキテクチャパターン

**パターン**: フィーチャーベースSPA

サービス層（`services/`）でビジネスロジックを分離し、Zustandでグローバル状態管理。
TanStack Query でサーバー状態（CelesTrak TLEデータ）をキャッシュ。

---

## ディレクトリ構成

```
orbit-search/
├── src/
│   ├── App.tsx                       # ルートコンポーネント
│   ├── main.tsx                      # エントリーポイント
│   ├── theme.ts                      # MUI テーマ設定
│   ├── types/                        # TypeScript型定義
│   ├── components/                   # Reactコンポーネント
│   │   ├── Map/                      # Leaflet 地図コンポーネント
│   │   ├── SatelliteList.tsx         # 検索結果衛星リスト
│   │   ├── SearchPanel.tsx           # 検索条件入力パネル
│   │   └── ObservationDataDialog.tsx # 可視性データダイアログ
│   ├── services/                     # ビジネスロジック・API
│   │   ├── satelliteService.ts       # CelesTrak TLEデータ取得
│   │   ├── tleService.ts             # TLEデータ管理
│   │   ├── tleParserService.ts       # TLE文字列パーサー
│   │   ├── orbitService.ts           # satellite.js 軌道計算
│   │   ├── visibilityService.ts      # 可視性計算（仰角・方位角・距離）
│   │   └── cacheService.ts           # IndexedDB キャッシュ制御
│   ├── store/                        # Zustand グローバル状態
│   │   └── index.ts                  # 観測地点・期間・検索結果
│   ├── hooks/                        # カスタムフック
│   ├── utils/                        # ユーティリティ
│   └── workers/                      # Web Worker（重い計算処理）
├── docs/                             # 設計ドキュメント
├── steering/                         # MUSUBIステアリング文書
└── package.json
```

---

## データフロー

```
ユーザー入力（観測地点 + 期間）
    ↓
SearchPanel → Zustand store
    ↓
satelliteService（CelesTrak TLE取得）
    ↓
cacheService（IndexedDB キャッシュ確認・保存）
    ↓
orbitService + visibilityService（satellite.js 計算）
    ├── workers/（Web Worker で並列計算）
    ↓
Zustand store（結果更新）
    ↓
SatelliteList + Map（表示）
```

---

## 主要サービス責務

| サービス | 責務 |
|---------|------|
| `satelliteService.ts` | CelesTrakからTLEデータ取得（axios） |
| `tleParserService.ts` | TLE文字列→オブジェクト変換 |
| `orbitService.ts` | satellite.jsで軌道位置計算 |
| `visibilityService.ts` | 仰角・方位角・可視窓計算 |
| `cacheService.ts` | IndexedDBキャッシュ（idb）制御 |

---

## 状態管理

- **サーバー状態**: TanStack Query（CelesTrak TLEデータ）
- **クライアント状態**: Zustand（観測地点・期間・検索結果）

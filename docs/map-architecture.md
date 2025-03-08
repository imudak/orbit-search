# 地図UIアーキテクチャドキュメント

## 概要

地図UIは、衛星軌道の可視化と分析を行うための主要なインターフェースです。このドキュメントでは、地図UIの新しいアーキテクチャについて説明します。

## アーキテクチャの概要

地図UIは、以下の主要なコンポーネントで構成されています：

```
src/components/Map/
├── index.tsx (エントリーポイント)
├── MapView.tsx (地図表示のみを担当)
├── controls/ (コントロール関連)
│   ├── UnifiedControlPanel.tsx (統一コントロールパネル)
│   ├── MobileControls.tsx (モバイル向けコントロール)
│   ├── ZoomControls.tsx (ズームコントロール)
│   ├── ViewControls.tsx (ビューコントロール)
│   └── LayerControls.tsx (レイヤーコントロール)
├── layers/ (レイヤー関連)
│   ├── LayerManager.tsx (レイヤー管理システム)
│   ├── SatelliteOrbitLayer.tsx (衛星軌道レイヤー)
│   ├── VisibilityCircleLayer.tsx (可視性円レイヤー)
│   └── ObserverMarkerLayer.tsx (観測者マーカーレイヤー)
├── modes/ (モード関連)
│   ├── MapModeSelector.tsx (モード切替)
│   ├── NormalPanel.tsx (通常モードパネル)
│   ├── AnimationPanel.tsx (アニメーションモードパネル)
│   └── AnalysisPanel.tsx (分析モードパネル)
├── panels/ (情報パネル関連)
│   ├── LegendPanel.tsx (凡例パネル)
│   ├── SatelliteInfoPanel.tsx (衛星情報パネル)
│   └── AnimationControlPanel.tsx (アニメーション制御パネル)
└── layout/ (レイアウト関連)
    └── ResponsiveMapLayout.tsx (レスポンシブレイアウト)
```

## 主要なコンポーネント

### 1. MapView

基本的な地図表示を担当するコンポーネントです。Leafletを使用して地図を表示します。

```jsx
<MapView center={center} zoom={zoom}>
  {/* 子コンポーネント */}
</MapView>
```

### 2. レイヤー管理システム

`LayerManager.tsx`は、React Contextを使用してレイヤーの表示/非表示を管理します。

```jsx
// レイヤー管理システムの使用例
<LayerProvider>
  <LayerRenderer layerId="observer-marker">
    <ObserverMarkerLayer center={center} />
  </LayerRenderer>
</LayerProvider>
```

### 3. モード管理システム

`MapModeSelector.tsx`は、React Contextを使用してモードの切り替えを管理します。

```jsx
// モード管理システムの使用例
<ModeProvider>
  <ModeRenderer mode={MapMode.NORMAL}>
    <NormalPanel center={center} orbitPaths={orbitPaths} />
  </ModeRenderer>
</ModeProvider>
```

### 4. 統一コントロールパネル

`UnifiedControlPanel.tsx`は、タブ形式のコントロールパネルを提供します。

```jsx
// 統一コントロールパネルの使用例
<UnifiedControlPanel
  position="topright"
  currentCenter={center}
  defaultZoom={defaultZoom}
  showLegend={showLegend}
  onToggleLegend={handleToggleLegend}
/>
```

### 5. レスポンシブレイアウト

`ResponsiveMapLayout.tsx`は、デバイスサイズに応じたレイアウト調整を行います。

```jsx
// レスポンシブレイアウトの使用例
<ResponsiveMapLayout
  controls={isMobile ? <MobileControls /> : null}
>
  <MapView center={center} zoom={zoom} />
</ResponsiveMapLayout>
```

## 使用方法

### 基本的な使用方法

```jsx
import Map from './components/Map';

function App() {
  const handleLocationSelect = (location) => {
    console.log('Selected location:', location);
  };

  return (
    <Map
      center={{ lat: 35.6812, lng: 139.7671 }}
      onLocationSelect={handleLocationSelect}
      orbitPaths={[]}
      filters={{
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        location: { lat: 35.6812, lng: 139.7671 },
        minElevation: 10
      }}
      satellites={[]}
    />
  );
}
```

### 軌道パスの表示

```jsx
const orbitPaths = [
  {
    satelliteId: 'satellite-1',
    maxElevation: 45,
    segments: [
      {
        points: [
          { lat: 35.0, lng: 139.0 },
          { lat: 36.0, lng: 140.0 },
        ],
        effectiveAngles: [30, 40],
      },
    ],
    timestamp: new Date().toISOString(),
  },
];

<Map
  center={{ lat: 35.6812, lng: 139.7671 }}
  onLocationSelect={handleLocationSelect}
  orbitPaths={orbitPaths}
  filters={filters}
  satellites={satellites}
/>
```

### 衛星データの表示

```jsx
const satellites = [
  {
    orbitHeight: 500,
    orbitType: 'LEO',
  },
  {
    orbitHeight: 20000,
    orbitType: 'GEO',
  },
];

<Map
  center={{ lat: 35.6812, lng: 139.7671 }}
  onLocationSelect={handleLocationSelect}
  orbitPaths={orbitPaths}
  filters={filters}
  satellites={satellites}
/>
```

## モバイル対応

地図UIは、デスクトップとモバイルの両方に対応しています。デバイスサイズに応じて、適切なコントロールが表示されます。

- デスクトップ: 統一コントロールパネルが表示されます。
- モバイル: コンパクトなフローティングアクションボタンが表示されます。

## モード

地図UIは、以下の3つのモードをサポートしています：

1. **通常モード**: 基本的な情報のみを表示します。
2. **アニメーションモード**: 時間情報と位置情報を表示します。
3. **分析モード**: 詳細な統計情報を表示します。

モードは、モード切替ボタンで切り替えることができます。

## レイヤー

地図UIは、以下のレイヤーをサポートしています：

1. **観測者マーカー**: 観測地点を表示します。
2. **可視性円**: 可視範囲を表示します。
3. **衛星軌道**: 衛星の軌道を表示します。

レイヤーは、レイヤーコントロールで表示/非表示を切り替えることができます。

## パフォーマンスの考慮事項

地図UIは、多数の衛星軌道を表示する場合、パフォーマンスが低下する可能性があります。パフォーマンスを向上させるために、以下の点を考慮してください：

1. 表示する衛星の数を制限する
2. 軌道パスのポイント数を適切に調整する
3. 不要なレイヤーを非表示にする

## 今後の拡張

地図UIは、以下の拡張を予定しています：

1. 3D表示モードの追加
2. リアルタイムデータの表示
3. 複数の観測地点の比較

## トラブルシューティング

### 地図が表示されない

- ネットワーク接続を確認してください。
- コンソールにエラーがないか確認してください。

### 軌道パスが表示されない

- `orbitPaths`プロパティが正しく設定されているか確認してください。
- コンソールにエラーがないか確認してください。

### モバイル表示が崩れる

- ブラウザのキャッシュをクリアしてください。
- 最新のブラウザを使用してください。

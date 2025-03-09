# 地図UIアーキテクチャドキュメント

## 概要

地図UIは、衛星軌道の可視化と分析を行うための主要なインターフェースです。このドキュメントでは、地図UIの最新アーキテクチャについて説明します。

## アーキテクチャの概要

地図UIは、以下の主要なコンポーネントで構成されています：

```
src/components/Map/
├── index.tsx (エントリーポイント)
├── MapView.tsx (地図表示のみを担当)
├── controls/ (コントロール関連)
│   ├── MapControlIcons.tsx (統合コントロールアイコン)
│   ├── MobileControls.tsx (モバイル向けコントロール)
│   ├── ZoomControls.tsx (ズームコントロール)
│   └── ViewControls.tsx (ビューコントロール)
├── layers/ (レイヤー関連)
│   ├── LayerManager.tsx (レイヤー管理システム)
│   ├── SatelliteOrbitLayer.tsx (衛星軌道レイヤー)
│   ├── SatelliteAnimationLayer.tsx (衛星アニメーションレイヤー)
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
│   ├── LayerSettingsPanel.tsx (レイヤー設定パネル)
│   └── AnimationControlPanel.tsx (アニメーション制御パネル)
└── layout/ (レイアウト関連)
    └── ResponsiveMapLayout.tsx (レスポンシブレイアウト)
```

## 最新の改善点（2025年3月9日更新）

### 1. モード選択UIの強化
- モード説明と利用可能な機能を表示するパネルの追加
- モード切替時の情報パネル表示（5秒間）
- 選択中のモードの視覚的強調（色、アイコン、テキスト）
- モード変更時のSnackbar通知

### 2. アニメーションモードの改善
- 青色ベースのデザインでアニメーションモードを強調
- 操作性向上（30分前後スキップ、開始/終了位置ジャンプ機能）
- ヘルプパネルで操作方法を説明
- モード切替時の自動再生/停止
- 進行状況の視覚的表示

### 3. 分析モードの強化
- 緑色ベースのデザインで分析モードを強調
- タブ切替機能（サマリー、詳細、可視性）で多角的な分析
- 仰角分布のグラフィカルな表示
- 可視時間と可視率の計算と表示
- ヘルプパネルで分析モードの使い方を説明

### 4. 情報パネルのレイアウト改善
- 統合情報パネル、レイヤー設定、凡例のアイコンをコントロールアイコン群に統合
- 情報パネルを地図中央に横長レイアウトで表示するオプション
- 各パネルの表示/非表示を個別に制御可能
- モードごとの情報パネルと統合情報パネルの重複を解消

### 5. コントロールアイコンの統合
- 地図操作アイコン（拡大/縮小、全体表示、地点に戻る）
- 情報表示アイコン（衛星情報、レイヤー設定、凡例）
- アイコンをグループ化し、視覚的に区別

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

`MapModeSelector.tsx`は、React Contextを使用してモードの切り替えを管理します。各モードは色で区別されます（通常：デフォルト、アニメーション：青、分析：緑）。

```jsx
// モード管理システムの使用例
<ModeProvider>
  <ModeRenderer mode={MapMode.NORMAL}>
    <NormalPanel center={center} orbitPaths={orbitPaths} />
  </ModeRenderer>
</ModeProvider>

// モード説明と機能
const MODE_DESCRIPTIONS = {
  [MapMode.NORMAL]: '基本的な地図表示と衛星情報を確認できます。',
  [MapMode.ANIMATION]: '衛星の軌道をアニメーションで再生できます。アニメーションコントロールが表示されます。',
  [MapMode.ANALYSIS]: '衛星の軌道を詳細に分析できます。軌道分析パネルが表示されます。'
};

const MODE_FEATURES = {
  [MapMode.NORMAL]: ['基本情報表示', '衛星位置表示', '可視円表示'],
  [MapMode.ANIMATION]: ['時間制御', '軌道アニメーション', '速度調整', '位置情報表示'],
  [MapMode.ANALYSIS]: ['軌道統計', '最大/平均仰角', '可視性分析', '軌道距離計算']
};
```

### 4. 統合コントロールアイコン

`MapControlIcons.tsx`は、地図操作と情報表示のためのアイコンを提供します。

```jsx
// 統合コントロールアイコンの使用例
<MapControlIcons
  position="topleft"
  onZoomIn={handleZoomIn}
  onZoomOut={handleZoomOut}
  onResetView={handleResetView}
  onToggleInfo={() => setPanelState({...panelState, info: !panelState.info})}
  onToggleLegend={() => setPanelState({...panelState, legend: !panelState.legend})}
  onToggleLayers={() => setPanelState({...panelState, layers: !panelState.layers})}
/>
```

### 5. レスポンシブレイアウト

`ResponsiveMapLayout.tsx`は、デバイスサイズに応じたレイアウト調整を行います。

```jsx
// レスポンシブレイアウトの使用例
<ResponsiveMapLayout
  controls={isMobile ? <MobileControls /> : <MapControlIcons />}
  panels={
    <>
      {panelState.info && <SatelliteInfoPanel position={isMobile ? "bottom" : "center"} />}
      {panelState.legend && <LegendPanel position="bottomright" />}
      {panelState.layers && <LayerSettingsPanel position="topright" />}
    </>
  }
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

- デスクトップ: 統合コントロールアイコンが表示されます。
- モバイル: コンパクトなフローティングアクションボタンが表示されます。

モバイル表示では、画面サイズを最大限に活用するために、情報パネルは画面下部に表示され、必要に応じて展開/折りたたみが可能です。また、タッチ操作に最適化されたUIを提供します。

## モード

地図UIは、以下の3つのモードをサポートしています：

1. **通常モード**: 基本的な情報のみを表示します。デフォルトのカラースキームを使用します。
2. **アニメーションモード**: 時間情報と位置情報を表示します。青色ベースのカラースキームを使用し、アニメーション再生コントロールが表示されます。
3. **分析モード**: 詳細な統計情報を表示します。緑色ベースのカラースキームを使用し、タブ切替による多角的な分析が可能です。

モードは、モード切替ボタンで切り替えることができます。モード切替時には、そのモードの説明と利用可能な機能が一時的に表示されます。また、各モードは色による視覚的な区別があり、ユーザーは現在のモードを直感的に認識できます。

## レイヤー

地図UIは、以下のレイヤーをサポートしています：

1. **観測者マーカー**: 観測地点を表示します。
2. **可視性円**: 可視範囲を表示します。
3. **衛星軌道**: 衛星の軌道を表示します。
4. **衛星アニメーション**: 衛星の動きをアニメーションで表示します。

レイヤーは、統合コントロールアイコンからアクセスできるレイヤー設定パネルで表示/非表示を切り替えることができます。各レイヤーは個別に制御可能で、必要に応じて組み合わせて表示できます。

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
4. モバイル対応のさらなる最適化
5. パネル内の情報表示のカスタマイズ機能
6. 多言語対応
7. ユーザー設定の保存機能（表示モードや表示パネルの設定など）

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

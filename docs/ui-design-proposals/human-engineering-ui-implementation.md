# 人間工学最適化UI実装計画書

## 概要

本文書は、「地図UI改善デザイン提案書」で提案された「デザイン3：人間工学最適化UI」を実装するための具体的な計画を示すものです。人間工学に基づいた最適なユーザーインターフェースを構築し、すべてのユーザーにとって使いやすく、学習コストが最小限のアクセシブルなインターフェースを実現します。

## 現状の問題点

現行UIには以下の問題点があります：

1. 地図の中にコントロール用のUIが多すぎて地図自体が隠れてしまう
2. 情報の表示非表示が使いにくい
3. 地図のモードがわかりにくく、モードなしの方が望ましい
4. パネルを開閉するUIは使いにくい
5. 検索パネルをリスト内に配置し開閉可能にした設計がわかりにくい
6. 地図のレイヤー設定は使用頻度が低いため削除が望ましい

## 人間工学最適化UIの特徴

「デザイン3：人間工学最適化UI」は以下の特徴を持ちます：

- **高コントラストUI**: 可読性と認識性の向上
- **大きな操作ターゲット**: タッチしやすく、誤操作を減少
- **論理的グループ化**: 関連機能の近接配置
- **一貫した操作パターン**: 学習しやすい統一された操作方法
- **段階的な情報表示**: 重要度に応じた情報の階層化
- **ヘルプとフィードバック**: 操作ガイダンスとエラー回復の容易化

## 実装方針

### 1. 全体レイアウトの再構築

#### 1.1 2ペインレイアウトの採用

- **左側**: 衛星検索・情報パネル（常時表示）
- **右側**: 地図表示エリア（最大化）

```
+---------------------+--------------------------------+
|                     |                                |
| 検索・情報パネル    |                                |
| (固定幅)            |                                |
|                     |          地図表示エリア        |
|                     |                                |
|                     |                                |
|                     |                                |
+---------------------+--------------------------------+
```

#### 1.2 レスポンシブ対応

- **デスクトップ**: 上記の2ペインレイアウト
- **タブレット**: 2ペインレイアウトを維持するが、左パネルの幅を縮小
- **モバイル**: 上下レイアウトに変更（上部に地図、下部にパネル）または、パネルをスワイプで表示/非表示

### 2. 地図コントロールの最適化

#### 2.1 地図内コントロールの最小化

- 地図内には必要最小限のコントロールのみ配置
  - ズームイン/アウト
  - 現在地表示
  - フルスクリーン切替

#### 2.2 コントロールの視認性向上

- 大きなタッチターゲット（最小44x44px）
- 高コントラストの背景色と境界線
- アイコンと簡潔なラベルの組み合わせ

#### 2.3 コントロールの配置

- 右下にグループ化して配置
- 十分な間隔を確保（誤タップ防止）

### 3. モードレス操作への移行

#### 3.1 モード概念の廃止

- 現在の3つのモード（通常、アニメーション、分析）を統合
- 機能ベースのインターフェースに変更

#### 3.2 機能ベースのタブインターフェース

左側パネルにタブ方式で機能を整理：

1. **検索タブ**: 衛星検索と観測地点設定
2. **情報タブ**: 選択した衛星の詳細情報
3. **軌道タブ**: 軌道表示とアニメーション制御
4. **分析タブ**: 軌道分析と統計情報

### 4. 情報アクセスの効率化

#### 4.1 階層的情報表示

- 重要度に応じた情報の階層化
- 最も重要な情報は常に表示
- 詳細情報はアコーディオンパネルで展開可能
- 凡例情報は右下に固定表示し、常に参照可能に
- 凡例は折りたたみ可能にして、必要に応じて詳細表示/非表示を切り替え可能

#### 4.2 コンテキスト依存情報

- 現在の操作に関連する情報のみを表示
- 不要な情報は非表示にして認知負荷を軽減

### 5. アクセシビリティの向上

#### 5.1 カラーコントラストと色の一貫性

- WCAG AAA基準（7:1以上）を満たすコントラスト比
- カラーだけでなく形状や位置でも情報を伝達
- 軌道タイプと仰角に対して直感的で一貫した色使い：
  - **軌道タイプの色**：
    - LEO（低軌道）: 青色 - 地球に近い軌道を表現
    - MEO（中軌道）: 緑色 - 中間の軌道を表現
    - GEO（静止軌道）: 紫色 - 特殊な軌道を表現
    - HEO（高楕円軌道）: オレンジ色 - 高い軌道を表現
  - **仰角（見やすさ）の色**：
    - 最適（45°以上）: 緑色 - 最適な観測条件
    - 良好（20-45°）: 青色 - 良好な観測条件
    - 可視（10-20°）: オレンジ色 - 注意が必要な観測条件
    - 不良（0-10°）: 赤色 - 困難な観測条件
    - 不可視（0°未満）: グレー色 - 見えない条件

#### 5.2 フォントサイズと可読性

- 最小フォントサイズ16px
- 行間を十分に確保（1.5倍以上）
- 読みやすいサンセリフフォントの使用

#### 5.3 キーボード操作

- すべての機能をキーボードで操作可能に
- フォーカス状態の明確な視覚的表示

### 6. フィードバックとヘルプ

#### 6.1 操作フィードバック

- ボタン押下時の明確な視覚的フィードバック
- 処理中の状態表示（プログレスインジケータ）
- 操作完了時の通知

#### 6.2 インラインヘルプ

- 機能の横に情報アイコンを配置
- ホバーまたはタップでヘルプテキストを表示
- 初回使用時のガイダンス表示

## コンポーネント別実装計画

### 1. ResponsiveMapLayout

```jsx
// 新しいレイアウト構造
<LayoutContainer>
  {/* 左側パネル - 常に表示 */}
  <SidePanel>
    <TabPanel />
  </SidePanel>

  {/* 右側地図エリア */}
  <MapContainer>
    <MapView>
      {/* 最小限のコントロール */}
      <MinimalControls />
      {/* レイヤー */}
      <MapLayers />
    </MapView>
  </MapContainer>
</LayoutContainer>
```

### 2. TabPanel（新コンポーネント）

```jsx
// タブ方式のパネル
<TabPanel>
  <TabList>
    <Tab label="検索" icon={<SearchIcon />} />
    <Tab label="情報" icon={<InfoIcon />} />
    <Tab label="軌道" icon={<TimelineIcon />} />
    <Tab label="分析" icon={<AssessmentIcon />} />
  </TabList>

  <TabContent>
    {/* 検索タブ */}
    <TabPane value="search">
      <SearchPanel />
      <SatelliteList />
    </TabPane>

    {/* 情報タブ */}
    <TabPane value="info">
      <SatelliteInfoPanel />
    </TabPane>

    {/* 軌道タブ */}
    <TabPane value="orbit">
      <OrbitControlPanel />
    </TabPane>

    {/* 分析タブ */}
    <TabPane value="analysis">
      <AnalysisPanel />
    </TabPane>
  </TabContent>
</TabPanel>
```

### 3. MinimalControls（新コンポーネント）

```jsx
// 最小限の地図コントロール
<MinimalControls>
  <ControlButton
    icon={<ZoomInIcon />}
    label="拡大"
    onClick={handleZoomIn}
    tooltip="地図を拡大"
  />
  <ControlButton
    icon={<ZoomOutIcon />}
    label="縮小"
    onClick={handleZoomOut}
    tooltip="地図を縮小"
  />
  <ControlButton
    icon={<MyLocationIcon />}
    label="現在地"
    onClick={handleMyLocation}
    tooltip="現在地に移動"
  />
  <ControlButton
    icon={<FullscreenIcon />}
    label="全画面"
    onClick={handleFullscreen}
    tooltip="全画面表示"
  />
</MinimalControls>
```

### 4. SearchPanel（改良版）

```jsx
// 改良版検索パネル
<SearchPanel>
  <Typography variant="h6">衛星検索</Typography>

  {/* 観測地点設定 */}
  <LocationSelector>
    <Typography variant="subtitle2">観測地点</Typography>
    <CoordinateDisplay lat={center.lat} lng={center.lng} />
    <Button
      startIcon={<EditLocationIcon />}
      onClick={handleLocationEdit}
    >
      地図から選択
    </Button>
  </LocationSelector>

  {/* 日時設定 */}
  <DateTimeSelector>
    <Typography variant="subtitle2">観測期間</Typography>
    <DateTimePicker label="開始" value={startDate} onChange={handleStartDateChange} />
    <DateTimePicker label="終了" value={endDate} onChange={handleEndDateChange} />
  </DateTimeSelector>

  {/* 仰角設定 */}
  <ElevationSelector>
    <Typography variant="subtitle2">
      最低仰角: {minElevation}°
      <Tooltip title="地平線からの角度。値が大きいほど、空の高い位置にある衛星のみが表示されます。">
        <IconButton><HelpOutlineIcon /></IconButton>
      </Tooltip>
    </Typography>
    <Slider
      value={minElevation}
      onChange={handleMinElevationChange}
      min={0}
      max={90}
      step={1}
      marks={[
        { value: 0, label: '0°' },
        { value: 45, label: '45°' },
        { value: 90, label: '90°' },
      ]}
    />
  </ElevationSelector>

  {/* 検索ボタン */}
  <Button
    variant="contained"
    color="primary"
    startIcon={<SearchIcon />}
    onClick={handleSearch}
    disabled={isSearchButtonDisabled()}
    size="large"
  >
    検索
  </Button>
</SearchPanel>
```

### 5. SatelliteInfoPanel（改良版）

```jsx
// 改良版衛星情報パネル
<SatelliteInfoPanel>
  <Typography variant="h6">衛星情報</Typography>

  {/* 基本情報 */}
  <InfoSection title="基本情報">
    <InfoItem label="名称" value={satellite.name} />
    <InfoItem label="NORAD ID" value={satellite.noradId} />
    <InfoItem label="種類" value={satellite.type} />
    <InfoItem label="運用状態" value={satellite.operationalStatus} />
    <InfoItem label="軌道種類" value={satellite.orbitType || '不明'} />
    <InfoItem
      label="軌道高度"
      value={satellite.orbitHeight ? `${satellite.orbitHeight.toLocaleString()} km` : '不明'}
    />
  </InfoSection>

  {/* 位置情報 */}
  <InfoSection title="現在位置">
    <InfoItem label="緯度" value={`${currentPosition.lat.toFixed(6)}°`} />
    <InfoItem label="経度" value={`${currentPosition.lng.toFixed(6)}°`} />
    <InfoItem label="仰角" value={`${currentPosition.elevation.toFixed(2)}°`} />
    <InfoItem label="方位角" value={`${currentPosition.azimuth.toFixed(2)}°`} />
    <InfoItem label="距離" value={`${currentPosition.range.toFixed(2)} km`} />
  </InfoSection>

  {/* 可視性情報 */}
  <InfoSection title="可視性情報">
    <VisibilityChart data={visibilityData} />
    <InfoItem
      label="最大仰角"
      value={`${maxElevation.toFixed(1)}°`}
      color={getVisibilityColor(maxElevation)}
    />
    <InfoItem
      label="可視時間"
      value={formatDuration(visibilityDuration)}
    />
  </InfoSection>
</SatelliteInfoPanel>
```

## 実装スケジュール

### フェーズ1: 基盤構築（2週間）

1. 新しいレイアウト構造の実装
2. タブパネルコンポーネントの作成
3. 最小限の地図コントロールの実装

### フェーズ2: コアコンポーネント改良（3週間）

1. 検索パネルの改良
2. 衛星リストの改良
3. 衛星情報パネルの改良
4. 軌道コントロールパネルの実装

### フェーズ3: 機能統合（2週間）

1. モードレス操作への移行
2. アニメーション機能の統合
3. 分析機能の統合

### フェーズ4: アクセシビリティと最適化（2週間）

1. アクセシビリティの向上
2. パフォーマンス最適化
3. ユーザビリティテスト

### フェーズ5: 最終調整とリリース（1週間）

1. フィードバックに基づく調整
2. ドキュメント整備
3. リリース準備

## 期待される効果

1. **操作性の向上**: 直感的で一貫した操作方法により、学習コストを低減
2. **情報アクセスの効率化**: 必要な情報への素早いアクセスが可能に
3. **地図表示領域の最大化**: 地図の視認性向上により、衛星の位置関係を把握しやすく
4. **アクセシビリティの向上**: 多様なユーザーが利用しやすいインターフェース
5. **エラー率の低減**: 大きな操作ターゲットと明確なフィードバックにより誤操作を防止
6. **長時間使用時の疲労軽減**: 人間工学に基づいたデザインにより、長時間の使用でも疲労を軽減

## 結論

「デザイン3：人間工学最適化UI」の実装により、現行UIの問題点を解決し、すべてのユーザーにとって使いやすく、学習コストが最小限のアクセシブルなインターフェースを実現します。フィッツの法則に基づいた効率的なUI配置、カラーコントラストと視認性の最適化、操作フローの簡略化と標準化、アクセシビリティガイドラインへの準拠により、ユーザーエクスペリエンスを大幅に向上させることが期待されます。

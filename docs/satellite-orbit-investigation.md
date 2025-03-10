# 衛星軌道表示調査レポート

## 問題概要
衛星リストをクリックした際、選択された衛星の期間内の軌道が地図上に表示されるが、観測地点から大きくズレて表示される。

## 観測された現象（スクリーンショット分析）
![スクリーンショット](問題のスクリーンショット)

- **観測地点**: 緯度 35.681200°、経度 139.767100°（東京付近）
- **選択衛星**: NORAD ID: 05118、最大仰角: 69.4°
- **問題の現象**: 軌道線（赤色・青色）が観測地点（青いマーカーと赤い円）から大きく離れた場所に表示されている
- **期待される表示**: 最大仰角が69.4°と高いため、軌道線は観測地点の近くや可視範囲内を通過するはずだが、実際にはアジア大陸方面に表示されている

## コード調査結果

### orbitWorker.ts（座標計算ロジック）
- 168-180行目: 衛星の表示用経度計算で相対座標を使用
```javascript
// 経度調整の根本的な修正（第5版）
// 問題: Leafletの地図では相対座標系を使用する必要がある

// 新しい解決策: 観測地点を中心（0度）とした相対座標系に変換
// 1. 経度差を計算
let lonDiff = satelliteLon - observerLongitude;

// 2. 経度差を-180度から180度の範囲に正規化
if (lonDiff > 180) lonDiff -= 360;
else if (lonDiff < -180) lonDiff += 360;

// 3. 表示用の経度を計算（相対経度をそのまま使用）
// 重要: 相対経度をそのまま使用することで、観測地点が中心（0度）となる
let displayLon = lonDiff;
```

- 251-259行目: 経度差（displayLon）をそのまま経度値として使用
```javascript
orbitPoints.push({
  // ...
  lat: satelliteLat,
  lng: displayLon, // 元のsatelliteLonではなく、表示用の経度を使用
  // ...
});
```

### SatelliteOrbitLayer.tsx（地図表示ロジック）
- 47-50行目: Leafletへの座標設定
```javascript
// セグメントのポイントを作成
const segmentPoints = [
  new LatLng(point1.lat, point1.lng),
  new LatLng(point2.lat, point2.lng)
];
```
- 緯度と経度をそのままLeafletに渡している（lng値が経度ではなく経度差のため、表示がずれる）

## 原因特定

**主要な原因**: orbitWorker.tsで衛星の実際の経度ではなく、「観測地点からの経度差」を軌道点の経度として使用している

- `orbitWorker.ts` の 251-259行目:
  - 実際の衛星の緯度(lat)はそのまま使用
  - 経度(lng)には、実際の経度(satelliteLon)ではなく、観測地点からの経度差(displayLon)を使用

- これにより:
  1. 緯度は正しいが経度が観測地点からの差分になっている
  2. このデータがLeafletマップにそのまま渡される
  3. Leafletは標準的な地理座標系（絶対座標）を使用するため、相対座標として計算された経度がそのまま使われると表示位置が不正確になる

## 修正試行

### 試行1: orbitWorker.tsの修正
最初に、orbitWorker.tsで相対経度ではなく実際の経度を使用するように修正しました。
```javascript
// 修正前:
let displayLon = lonDiff; // 経度差を使用

// 修正後:
let displayLon = satelliteLon; // 実際の経度をそのまま使用
```

結果: 軌道がロサンゼルス付近に表示されるようになり、まだ正しい位置に表示されませんでした。

### 試行2: SatelliteOrbitLayer.tsxでの座標変換
次に、元のorbitWorker.tsの設計（相対経度を使用）を維持し、SatelliteOrbitLayer.tsxで座標変換を行うアプローチを試しました。

```javascript
// 相対経度を絶対経度に変換
const observerLongitude = mapCenter.lng;
let absoluteLng1 = point1.lng + observerLongitude;
let absoluteLng2 = point2.lng + observerLongitude;

// 経度を-180〜180度の範囲に正規化
if (absoluteLng1 > 180) absoluteLng1 -= 360;
else if (absoluteLng1 < -180) absoluteLng1 += 360;

// セグメントのポイントを作成（変換後の経度を使用）
const segmentPoints = [
  new LatLng(point1.lat, absoluteLng1),
  new LatLng(point2.lat, absoluteLng2)
];
```

結果: 地図の拡大率によって軌道表示位置がずれる問題が発生しました。これは、地図の中心点（mapCenter）が拡大率によって変わるためです。

### 試行3: 固定の観測地点座標を使用
地図の拡大率に依存しないよう、SatelliteOrbitLayer.tsxを修正して固定の観測地点座標を使用するようにしました。

```javascript
// SatelliteOrbitLayerにobserverLocationプロパティを追加
interface SatelliteOrbitLayerProps {
  paths: OrbitPath[];
  observerLocation?: { lat: number; lng: number }; // 観測地点の座標
}

// 観測地点の経度を取得（propsから渡された値を優先）
const observerLongitude = observerLocation ? observerLocation.lng : mapCenter.lng;
```

結果: 拡大縮小によるブレはなくなりましたが、軌道位置はまだ正しく表示されていません。

## 今後の調査方針
1. 座標変換の数学的検証: 相対座標から絶対座標への変換ロジックを再検討
2. 日付変更線をまたぐケースの特別処理の見直し
3. 軌道計算の根本的な見直し: satellite.jsライブラリの使用方法が正しいか確認
4. 地図投影法とLeafletの座標系の整合性確認

引き続き調査と修正を進めます。

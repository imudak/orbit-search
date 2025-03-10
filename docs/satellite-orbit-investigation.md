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

## 修正案

1. **orbitWorker.tsの修正（推奨）**:
```javascript
// 問題箇所:
let displayLon = lonDiff; // 経度差を使用

// 修正案:
let displayLon = satelliteLon; // 実際の経度をそのまま使用
```

2. **SatelliteOrbitLayer.tsxで修正する場合**:
```javascript
// 必要な変換を行ってから地図に表示
const observerLongitude = map.getCenter().lng;
const segmentPoints = [
  new LatLng(point1.lat, observerLongitude + point1.lng),
  new LatLng(point2.lat, observerLongitude + point2.lng)
];
```

## 推奨ステップ
1. orbitWorker.tsの修正を実装（表示用の経度として衛星の実際の経度を使用）
2. 修正後にテスト実行し、軌道表示が観測地点を中心に正しく表示されることを確認
3. 日付変更線をまたぐ場合の処理も確認（lngDiff > 170の条件判定）

以上の修正により、衛星軌道は観測地点に対して正しい位置に表示されるようになると考えられます。

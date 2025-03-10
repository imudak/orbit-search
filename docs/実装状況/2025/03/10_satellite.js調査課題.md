# satellite.js 調査課題

## 背景

軌道表示改善の過程で、satellite.jsライブラリの関数使用方法に関する課題が見つかりました。現在は3次元座標系を使用した独自の仰角計算を実装していますが、satellite.jsの提供する関数を正しく使用することで、より効率的かつ正確な計算が可能になる可能性があります。

## 調査課題

1. **satellite.js の `ecfToLookAngles` 関数の正確な使用方法**
   - 現在の実装では、この関数から得られる仰角が正確でない場合がある
   - 特に地球の曲率を考慮した場合の挙動を確認する
   - 地平線より下にある衛星の仰角が正しく負の値として計算されるか検証

2. **座標系の変換と理解**
   - ECI（Earth-Centered Inertial）座標系
   - ECEF（Earth-Centered, Earth-Fixed）座標系
   - 地理座標系（緯度・経度・高度）
   - 地平座標系（方位角・仰角・距離）
   - これらの座標系間の変換方法と satellite.js の関数の対応関係

3. **地球の曲率を考慮した仰角計算**
   - satellite.js が内部でどのように地球の曲率を考慮しているか
   - 観測地点から見た衛星の仰角を正確に計算するための最適な方法

4. **パフォーマンス比較**
   - 現在の独自実装と satellite.js 関数の計算速度比較
   - 大量の軌道点を計算する際の最適化方法

## 期待される成果

- satellite.js の関数を正しく使用するためのガイドライン
- 必要に応じて独自実装と satellite.js 関数を組み合わせた最適な計算方法の提案
- 計算精度とパフォーマンスのバランスを考慮した実装改善案

## 参考リソース

- [satellite.js 公式ドキュメント](https://github.com/shashwatak/satellite-js)
- [Celestial Coordinate Systems](https://en.wikipedia.org/wiki/Celestial_coordinate_system)
- [Orbital Mechanics](https://en.wikipedia.org/wiki/Orbital_mechanics)

import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L, { LatLng } from 'leaflet';
import type { OrbitPath } from '@/types';

interface SatelliteOrbitLayerProps {
  paths: OrbitPath[];
  observerLocation?: { lat: number; lng: number }; // 観測地点の座標（オプション）
}

/**
 * 衛星軌道を表示するレイヤーコンポーネント
 */
const SatelliteOrbitLayer: React.FC<SatelliteOrbitLayerProps> = ({
  paths,
  observerLocation
}) => {
  const map = useMap();

  useEffect(() => {
    if (!paths.length) return;

    // 観測地点の位置を取得（地図の中心点）
    const mapCenter = map.getCenter();

    // 軌道パスの描画
    const lines = paths.flatMap((path, pathIndex) => {
      // 各セグメントのパスを作成
      return path.segments.flatMap((segment, segmentIndex) => {
        const lines: L.Polyline[] = [];

        // セグメント内の各ポイント間に線を引く
        for (let i = 0; i < segment.points.length - 1; i++) {
          const point1 = segment.points[i];
          const point2 = segment.points[i + 1];
          const effectiveAngle = segment.effectiveAngles[i];

          // 日付変更線をまたぐ場合の処理
          // 経度の差が極端に大きい場合は日付変更線をまたいでいると判断
          let lngDiff = Math.abs(point1.lng - point2.lng);
          if (lngDiff > 170) { // 170度以上の差がある場合は日付変更線をまたいでいる
            // 日付変更線をまたぐ場合は線を引かない
            continue;
          }

          // 観測地点からの距離制限を撤廃
          // すべての軌道点を表示する

          // 経度を-180〜180度の範囲に正規化
          let lng1 = point1.lng;
          let lng2 = point2.lng;

          // 経度を-180〜180度の範囲に正規化
          while (lng1 > 180) lng1 -= 360;
          while (lng1 < -180) lng1 += 360;

          while (lng2 > 180) lng2 -= 360;
          while (lng2 < -180) lng2 += 360;

          // 相対座標を計算
          let lng1ForPoint = lng1;
          let lng2ForPoint = lng2;

          if (observerLocation) {
            // 観測地点からの相対経度を計算
            let relLng1 = lng1 - observerLocation.lng;
            let relLng2 = lng2 - observerLocation.lng;

            // -180〜180度の範囲に正規化
            while (relLng1 > 180) relLng1 -= 360;
            while (relLng1 < -180) relLng1 += 360;

            while (relLng2 > 180) relLng2 -= 360;
            while (relLng2 < -180) relLng2 += 360;

            // 相対座標を使用
            lng1ForPoint = observerLocation.lng + relLng1;
            lng2ForPoint = observerLocation.lng + relLng2;

            // 相対座標計算後に再度日付変更線をまたぐかチェック
            let lngDiffAfterRelative = Math.abs(lng1ForPoint - lng2ForPoint);
            if (lngDiffAfterRelative > 170) {
              // 相対座標計算後も日付変更線をまたぐ場合は線を引かない
              continue;
            }
          }

          const segmentPoints = [
            new LatLng(point1.lat, lng1ForPoint),
            new LatLng(point2.lat, lng2ForPoint)
          ];

          // デバッグログを抑制
          // if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
          //   console.log('Orbit display coordinates:', {
          //     lng: lng1,
          //     lat: point1.lat,
          //     elevation: effectiveAngle,
          //     source: observerLocation ? 'fixed observer' : 'map center'
          //   });
          // }

          // 仰角に基づいてスタイルを設定
          // effectiveAngleは現在、orbitWorker.tsで仰角そのものに設定されている
          let color: string;
          let weight: number;
          let opacity: number;

          if (effectiveAngle >= 45) {
            // 高仰角: 赤系（最も見やすく）
            color = '#FF0000';
            weight = 4;
            opacity = 1.0;
          } else if (effectiveAngle >= 20) {
            // 中仰角: オレンジ系
            color = '#FFA500';
            weight = 3;
            opacity = 0.8;
          } else if (effectiveAngle >= 10) {
            // 低仰角: 青系
            color = '#0000FF';
            weight = 2;
            opacity = 0.6; // 低仰角の可視性を少し上げる
          } else if (effectiveAngle >= 0) {
            // 極低仰角: 青系（薄め）
            color = '#0000FF';
            weight = 1.5;
            opacity = 0.4; // 極低仰角でも少し見えるように
          } else {
            // 地平線以下: グレー系
            color = '#808080';
            weight = 1;
            opacity = 0.3;
          }

          // ラインを作成
          const line = L.polyline(segmentPoints, {
            color,
            weight,
            opacity,
            bubblingMouseEvents: true,
          }).addTo(map);

          // マウスオーバー時に仰角を表示
          line.bindTooltip(
            `仰角: ${effectiveAngle.toFixed(1)}°`
          );
          lines.push(line);
        }

        return lines;
      });
    });

    // 配列が入れ子になっているので、平坦化して一つの配列にする
    const allLines = lines.flat();

    return () => {
      // クリーンアップ時に軌道パスを削除
      allLines.forEach(line => line.remove());
    };
  }, [paths, map]);

  return null;
};

export default SatelliteOrbitLayer;

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
          // 経度の差が極端に大きい場合のみ線を引かない（不連続点）
          let lngDiff = Math.abs(point1.lng - point2.lng);
          if (lngDiff > 170) { // 170度以上の差がある場合のみスキップ（ほぼすべての軌道を表示）
            continue;
          }

          // 観測地点からの距離制限を撤廃
          // すべての軌道点を表示する

          // 相対経度を絶対経度に変換（orbitWorker.tsで相対経度を使用しているため）
          // 観測地点の経度を取得（propsから渡された値を優先、なければ地図の中心点を使用）
          const observerLongitude = observerLocation ? observerLocation.lng : mapCenter.lng;

          // 相対経度に観測地点の経度を加算して絶対経度に変換
          let absoluteLng1 = point1.lng + observerLongitude;
          let absoluteLng2 = point2.lng + observerLongitude;

          // 経度を-180〜180度の範囲に正規化
          if (absoluteLng1 > 180) absoluteLng1 -= 360;
          else if (absoluteLng1 < -180) absoluteLng1 += 360;

          if (absoluteLng2 > 180) absoluteLng2 -= 360;
          else if (absoluteLng2 < -180) absoluteLng2 += 360;

          // セグメントのポイントを作成（変換後の経度を使用）
          const segmentPoints = [
            new LatLng(point1.lat, absoluteLng1),
            new LatLng(point2.lat, absoluteLng2)
          ];

          // デバッグログ（開発時のみ表示）
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
            console.log('Orbit display coordinates:', {
              relLng: point1.lng,
              obsLng: observerLongitude,
              absLng: absoluteLng1,
              lat: point1.lat,
              source: observerLocation ? 'fixed observer' : 'map center'
            });
          }

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

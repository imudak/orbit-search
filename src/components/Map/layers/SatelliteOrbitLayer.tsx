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

          // 新しい座標変換アプローチ
          // 1. 相対経度を方位角として扱う（東が正、西が負）
          // 2. 観測地点を中心とした極座標系で考える
          // 3. 方位角と仰角から地図上の座標に変換

          // 方位角（相対経度）をラジアンに変換
          const azimuth1Rad = point1.lng * Math.PI / 180;
          const azimuth2Rad = point2.lng * Math.PI / 180;

          // 仰角をラジアンに変換
          const elevation1Rad = effectiveAngle * Math.PI / 180;

          // 地表面上の距離を計算（仰角が高いほど近くに表示）
          // 90度の場合は観測地点の真上、0度の場合は地平線上
          // 距離の計算を調整（仰角に応じた非線形な距離計算）
          const distance1 = Math.max(0, (90 - Math.max(0, effectiveAngle)) / 90) * 10; // 最大10度の距離

          // 極座標から地理座標への変換
          // 観測地点を中心として、方位角と距離から新しい座標を計算
          const lat1 = observerLocation ? observerLocation.lat : mapCenter.lat;
          const lng1 = observerLongitude;

          // 地球の半径（km）
          const earthRadius = 6371;

          // 距離をラジアンに変換
          const distanceRad1 = distance1 / earthRadius;

          // 新しい緯度経度を計算
          const newLat1 = Math.asin(
            Math.sin(lat1 * Math.PI / 180) * Math.cos(distanceRad1) +
            Math.cos(lat1 * Math.PI / 180) * Math.sin(distanceRad1) * Math.cos(azimuth1Rad)
          ) * 180 / Math.PI;

          const newLng1 = lng1 + Math.atan2(
            Math.sin(azimuth1Rad) * Math.sin(distanceRad1) * Math.cos(lat1 * Math.PI / 180),
            Math.cos(distanceRad1) - Math.sin(lat1 * Math.PI / 180) * Math.sin(newLat1 * Math.PI / 180)
          ) * 180 / Math.PI;

          // 同様に2点目も計算
          const distanceRad2 = distance1 / earthRadius; // 同じ距離を使用

          const newLat2 = Math.asin(
            Math.sin(lat1 * Math.PI / 180) * Math.cos(distanceRad2) +
            Math.cos(lat1 * Math.PI / 180) * Math.sin(distanceRad2) * Math.cos(azimuth2Rad)
          ) * 180 / Math.PI;

          const newLng2 = lng1 + Math.atan2(
            Math.sin(azimuth2Rad) * Math.sin(distanceRad2) * Math.cos(lat1 * Math.PI / 180),
            Math.cos(distanceRad2) - Math.sin(lat1 * Math.PI / 180) * Math.sin(newLat2 * Math.PI / 180)
          ) * 180 / Math.PI;

          // 経度を-180〜180度の範囲に正規化
          let absoluteLng1 = newLng1;
          let absoluteLng2 = newLng2;

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
              newLat: newLat1,
              origLat: point1.lat,
              azimuth: point1.lng,
              elevation: effectiveAngle,
              distance: distance1,
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

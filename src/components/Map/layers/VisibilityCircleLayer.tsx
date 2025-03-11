import React from 'react';
import { Circle, useMap } from 'react-leaflet';
import type { Location } from '@/types';

// 地球の半径（km）
const EARTH_RADIUS = 6371;

// 衛星軌道の種類と高度の定義
export interface OrbitType {
  name: string;
  height: number; // km
  color: string;
}

// デフォルトの軌道種類と高度
export const DEFAULT_ORBIT_TYPES: OrbitType[] = [
  { name: 'LEO', height: 800, color: '#FF0000' },    // 低軌道: 赤
  { name: 'MEO', height: 20000, color: '#00FF00' },  // 中軌道: 緑
  { name: 'GEO', height: 35786, color: '#0000FF' },  // 静止軌道: 青
  { name: 'HEO', height: 40000, color: '#FFA500' }   // 高楕円軌道: オレンジ
];

// 仰角と衛星高度から地表での可視範囲の半径を計算する関数
const calculateVisibleRadius = (elevationDeg: number, satelliteHeight: number): number => {
  // 地球の半径（km）
  const R = EARTH_RADIUS;

  // 仰角をラジアンに変換
  const elevationRad = elevationDeg * Math.PI / 180;

  // 衛星から地球中心までの距離
  const satelliteDistance = R + satelliteHeight;

  // 仰角90度の場合は可視範囲0（真上のみ）
  if (elevationDeg >= 90) {
    return 0;
  }

  // 仰角から地平線までの角度を計算
  const horizonAngle = Math.acos(R / satelliteDistance);

  // 仰角から可視範囲の中心角を計算
  // 仰角0度の場合は地平線まで、仰角90度の場合は0
  const centralAngle = Math.max(0, horizonAngle - elevationRad);

  // 中心角から地表での距離を計算
  return R * centralAngle;
};

interface VisibilityCircleLayerProps {
  center: Location;
  minElevation: number;
  orbitTypes?: OrbitType[];
}

/**
 * 観測地点からの可視範囲を表示するレイヤーコンポーネント
 */
const VisibilityCircleLayer: React.FC<VisibilityCircleLayerProps> = ({
  center,
  minElevation,
  orbitTypes = DEFAULT_ORBIT_TYPES
}) => {
  // Leafletのマップインスタンスを取得
  const map = useMap();

  if (!center) return null;

  return (
    <>
      {/* 各軌道種類ごとの可視範囲を表示（高度の高い順に表示） */}
      {orbitTypes.map((orbitType) => {
        // 最低仰角と衛星高度から可視範囲の半径を計算
        const radiusKm = calculateVisibleRadius(minElevation, orbitType.height);
        // kmをmに変換
        const radiusMeters = radiusKm * 1000;

        return (
          <Circle
            key={orbitType.name}
            center={[center.lat, center.lng]}
            radius={radiusMeters}
            pathOptions={{
              color: orbitType.color,
              weight: 1,
              dashArray: '5, 5',
              fillColor: orbitType.color,
              fillOpacity: 0.05,
              bubblingMouseEvents: true // マウスイベントを下のレイヤーに伝播させる
            }}
          />
        );
      })}
    </>
  );
};

export default VisibilityCircleLayer;

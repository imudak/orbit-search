import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L, { LatLng } from 'leaflet';
import type { OrbitPath } from '@/types';

interface SatelliteOrbitLayerProps {
  paths: OrbitPath[];
}

/**
 * 衛星軌道を表示するレイヤーコンポーネント
 */
const SatelliteOrbitLayer: React.FC<SatelliteOrbitLayerProps> = ({
  paths
}) => {
  const map = useMap();

  useEffect(() => {
    if (!paths.length) return;

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

          // セグメントのポイントを作成
          const segmentPoints = [
            new LatLng(point1.lat, point1.lng),
            new LatLng(point2.lat, point2.lng)
          ];

          // 実効的な角度に基づいてスタイルを設定
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
            opacity = 0.5;
          } else {
            // 極低仰角: グレー系
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

          // マウスオーバー時に実効的な角度を表示
          line.bindTooltip(
            `実効的な角度: ${effectiveAngle.toFixed(1)}°`
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

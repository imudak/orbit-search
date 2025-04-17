import React, { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { calculateDaylightPolygon } from '@/utils/sunCalculations';
import { useMapContext } from '../index';

/**
 * 世界地図上に昼夜の境界線と昼間領域を描画するコンポーネント
 */
const DaylightLayer: React.FC = () => {
  const map = useMap();
  const { animationState } = useMapContext();
  const [daylightLayer, setDaylightLayer] = useState<L.Polygon | null>(null);
  const [terminatorLayer, setTerminatorLayer] = useState<L.Polyline | null>(null);

  // 昼間の色を濃くして視認性を向上
  const DAYLIGHT_COLOR = 'rgba(255, 248, 107, 0.3)'; // 透明度を0.2から0.3に上げて色を濃くする
  const TERMINATOR_COLOR = '#444444';

  useEffect(() => {
    // アニメーションが停止している場合、現在時刻をカレントタイムとする
    const currentTime = animationState.isPlaying
      ? animationState.currentTime
      : new Date();

    // 以前のレイヤーをクリーンアップ
    if (daylightLayer) {
      daylightLayer.remove();
    }
    if (terminatorLayer) {
      terminatorLayer.remove();
    }

    try {
      // 昼夜の境界線と昼間領域を計算
      const daylightPolygons = calculateDaylightPolygon(currentTime);

      // 昼間領域を描画
      const polygons = daylightPolygons.map(coords =>
        coords.map(point => [point[0], point[1]] as [number, number])
      );

      const daylight = L.polygon(polygons, {
        color: TERMINATOR_COLOR,
        weight: 1,
        opacity: 0.7,
        fillColor: DAYLIGHT_COLOR,
        fillOpacity: 0.8, // 透明度を0.5から0.8に上げて視認性を向上
        interactive: false, // マウスイベントを無効化
      }).addTo(map);

      setDaylightLayer(daylight);
    } catch (error) {
      console.error('Failed to render daylight layer:', error);
    }
  }, [map, animationState.isPlaying, animationState.currentTime?.getTime()]);

  return null;
};

export default DaylightLayer;

import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { OrbitPath } from '@/types';
import { AnimationState } from '../panels/AnimationControlPanel';

interface SatelliteAnimationLayerProps {
  path: OrbitPath;
  animationState: AnimationState;
  onPositionUpdate?: (position: AnimationState['currentPosition']) => void;
}

/**
 * 衛星アニメーションを表示するレイヤーコンポーネント
 */
const SatelliteAnimationLayer: React.FC<SatelliteAnimationLayerProps> = ({
  path,
  animationState,
  onPositionUpdate
}) => {
  const map = useMap();
  const satelliteMarkerRef = useRef<L.Marker | null>(null);
  const { currentTime } = animationState;

  // 衛星アイコンの設定
  const satelliteIcon = L.icon({
    iconUrl: '/satellite.svg',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });

  // 指定された時刻に最も近い軌道点のインデックスを見つける
  const findClosestPointIndex = (time: Date): { segmentIndex: number, pointIndex: number } | null => {
    if (!path.segments || path.segments.length === 0) return null;

    // 簡易的な実装：時間に応じて0から最大ポイント数までの間を移動
    // 実際のアプリケーションでは、時刻と軌道データの関係をより正確に計算する必要がある

    // 全ポイント数を計算
    let totalPoints = 0;
    path.segments.forEach(segment => {
      totalPoints += segment.points.length;
    });

    // 現在時刻の割合を計算（0〜1の範囲）
    const startTime = animationState.startTime.getTime();
    const endTime = animationState.endTime.getTime();
    const currentTime = time.getTime();

    // 時間が範囲外の場合は、範囲内に収める
    const normalizedTime = Math.max(startTime, Math.min(currentTime, endTime));
    const timeRatio = (normalizedTime - startTime) / (endTime - startTime);

    // 時間の割合に応じたポイントのインデックスを計算
    const targetIndex = Math.floor(timeRatio * (totalPoints - 1));

    // セグメントとポイントのインデックスを特定
    let pointCounter = 0;
    for (let segmentIndex = 0; segmentIndex < path.segments.length; segmentIndex++) {
      const segment = path.segments[segmentIndex];
      if (pointCounter + segment.points.length > targetIndex) {
        // このセグメント内にターゲットポイントがある
        const pointIndex = targetIndex - pointCounter;
        return { segmentIndex, pointIndex };
      }
      pointCounter += segment.points.length;
    }

    // 最後のポイントを返す（通常はここに到達しないはず）
    if (path.segments.length > 0) {
      const lastSegmentIndex = path.segments.length - 1;
      const lastPointIndex = path.segments[lastSegmentIndex].points.length - 1;
      return { segmentIndex: lastSegmentIndex, pointIndex: lastPointIndex };
    }

    return null;
  };

  // 衛星の位置を更新
  useEffect(() => {
    const pointIndex = findClosestPointIndex(currentTime);

    if (pointIndex) {
      const { segmentIndex, pointIndex: pIndex } = pointIndex;
      const point = path.segments[segmentIndex].points[pIndex];
      const effectiveAngle = path.segments[segmentIndex].effectiveAngles[pIndex];

      if (point && point.lat !== undefined && point.lng !== undefined) {
        // マーカーがまだ作成されていない場合は作成
        if (!satelliteMarkerRef.current) {
          satelliteMarkerRef.current = L.marker([point.lat, point.lng], {
            icon: satelliteIcon,
            zIndexOffset: 1000 // 他のマーカーより前面に表示
          }).addTo(map);

          // ポップアップを設定
          satelliteMarkerRef.current.bindPopup(`
            <b>衛星位置情報</b><br>
            時刻: ${currentTime.toLocaleString()}<br>
            実効的な角度: ${effectiveAngle.toFixed(2)}°
          `);
        } else {
          // マーカーの位置を更新
          satelliteMarkerRef.current.setLatLng([point.lat, point.lng]);

          // ポップアップの内容を更新
          satelliteMarkerRef.current.setPopupContent(`
            <b>衛星位置情報</b><br>
            時刻: ${currentTime.toLocaleString()}<br>
            実効的な角度: ${effectiveAngle.toFixed(2)}°
          `);
        }

        // 位置情報を親コンポーネントに通知
        if (onPositionUpdate) {
          onPositionUpdate({
            lat: point.lat,
            lng: point.lng,
            elevation: effectiveAngle, // 実効的な角度を仰角として使用
            azimuth: 0, // 方位角は計算できないため0とする
            range: 0 // 距離は計算できないため0とする
          });
        }
      }
    }

    // コンポーネントのクリーンアップ
    return () => {
      if (satelliteMarkerRef.current) {
        satelliteMarkerRef.current.remove();
        satelliteMarkerRef.current = null;
      }
    };
  }, [currentTime, map, path, onPositionUpdate, satelliteIcon]);

  return null;
};

export default SatelliteAnimationLayer;

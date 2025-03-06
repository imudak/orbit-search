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
    iconUrl: `${import.meta.env.BASE_URL}satellite.svg`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });

  // 指定された時刻に最も近い軌道点のインデックスを見つける
  const findClosestPointIndex = (time: Date): { segmentIndex: number, pointIndex: number } | null => {
    if (!path.segments || path.segments.length === 0) return null;

    // 開始時刻と終了時刻の間の相対位置を計算
    const totalDuration = animationState.endTime.getTime() - animationState.startTime.getTime();
    const currentPosition = (time.getTime() - animationState.startTime.getTime()) / totalDuration;

    // 全ポイント数を計算
    let totalPoints = 0;
    path.segments.forEach(segment => {
      totalPoints += segment.points.length;
    });

    // 現在の位置に対応するポイントのインデックスを計算
    const targetIndex = Math.floor(currentPosition * totalPoints);

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

    // 最後のポイントを返す
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

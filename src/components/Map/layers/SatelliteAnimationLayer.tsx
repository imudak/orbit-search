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
    iconUrl: import.meta.env.BASE_URL + 'satellite.svg', // Viteの環境変数を使用してベースパスを取得
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });

  // 指定された時刻に最も近い軌道点のインデックスを見つける
  const findClosestPointIndex = (time: Date): { segmentIndex: number, pointIndex: number } | null => {
    // パスのセグメントが存在しない場合はnullを返す
    if (!path.segments || path.segments.length === 0) {
      console.warn('No segments found in path');
      return null;
    }

    // 全ポイント数を計算
    let totalPoints = 0;
    path.segments.forEach(segment => {
      totalPoints += segment.points.length;
    });

    // ポイントが存在しない場合はnullを返す
    if (totalPoints === 0) {
      console.warn('No points found in path segments');
      return null;
    }

    // 現在時刻の割合を計算（0〜1の範囲）
    const startTime = animationState.startTime.getTime();
    const endTime = animationState.endTime.getTime();
    const currentTime = time.getTime();

    // 開始時刻と終了時刻が同じ場合は最初のポイントを返す
    if (startTime === endTime) {
      console.warn('Start time and end time are the same');
      return { segmentIndex: 0, pointIndex: 0 };
    }

    // 時間が範囲外の場合は、範囲内に収める
    const normalizedTime = Math.max(startTime, Math.min(currentTime, endTime));
    const timeRatio = (normalizedTime - startTime) / (endTime - startTime);

    // 時間の割合に応じたポイントのインデックスを計算
    const targetIndex = Math.floor(timeRatio * (totalPoints - 1));

    // セグメントとポイントのインデックスを特定
    let pointCounter = 0;
    for (let segmentIndex = 0; segmentIndex < path.segments.length; segmentIndex++) {
      const segment = path.segments[segmentIndex];
      if (segment.points.length === 0) continue; // 空のセグメントはスキップ

      if (pointCounter + segment.points.length > targetIndex) {
        // このセグメント内にターゲットポイントがある
        const pointIndex = targetIndex - pointCounter;
        return { segmentIndex, pointIndex };
      }
      pointCounter += segment.points.length;
    }

    // 最後のポイントを返す（通常はここに到達しないはず）
    if (path.segments.length > 0) {
      // 最後の有効なセグメントを探す
      for (let i = path.segments.length - 1; i >= 0; i--) {
        if (path.segments[i].points.length > 0) {
          return {
            segmentIndex: i,
            pointIndex: path.segments[i].points.length - 1
          };
        }
      }
    }

    console.warn('Could not find a valid point in path');
    return null;
  };

  // 衛星の位置を更新
  useEffect(() => {
    console.log('Updating satellite position for time:', currentTime.toLocaleString());
    console.log('Path segments:', path.segments ? path.segments.length : 0);

    if (path.segments) {
      const totalPoints = path.segments.reduce((sum, segment) => sum + segment.points.length, 0);
      console.log('Total points in path:', totalPoints);
    }

    const pointIndex = findClosestPointIndex(currentTime);
    console.log('Found point index:', pointIndex);

    if (pointIndex) {
      const { segmentIndex, pointIndex: pIndex } = pointIndex;

      // セグメントとポイントの存在確認
      if (!path.segments[segmentIndex]) {
        console.error('Segment not found:', segmentIndex);
        return;
      }

      const segment = path.segments[segmentIndex];
      if (!segment.points[pIndex]) {
        console.error('Point not found in segment:', pIndex);
        return;
      }

      const point = segment.points[pIndex];
      const effectiveAngle = segment.effectiveAngles[pIndex];

      if (point && point.lat !== undefined && point.lng !== undefined) {
        console.log('Updating marker position:', point.lat, point.lng);

        // マーカーがまだ作成されていない場合は作成
        if (!satelliteMarkerRef.current) {
          console.log('Creating new satellite marker');
          satelliteMarkerRef.current = L.marker([point.lat, point.lng], {
            icon: satelliteIcon,
            zIndexOffset: 1000 // 他のマーカーより前面に表示
          }).addTo(map);

          // ポップアップを設定
          satelliteMarkerRef.current.bindPopup(`
            <b>衛星位置情報</b><br>
            時刻: ${currentTime.toLocaleString()}<br>
            仰角: ${effectiveAngle.toFixed(2)}°
          `);
        } else {
          // マーカーの位置を更新
          satelliteMarkerRef.current.setLatLng([point.lat, point.lng]);

          // ポップアップの内容を更新
          satelliteMarkerRef.current.setPopupContent(`
            <b>衛星位置情報</b><br>
            時刻: ${currentTime.toLocaleString()}<br>
            仰角: ${effectiveAngle.toFixed(2)}°
          `);
        }

        // 位置情報を親コンポーネントに通知
        if (onPositionUpdate) {
          onPositionUpdate({
            lat: point.lat,
            lng: point.lng,
            elevation: effectiveAngle, // 仰角として使用（現在は実際の仰角そのもの）
            azimuth: 0, // 方位角は計算できないため0とする
            range: 0 // 距離は計算できないため0とする
          });
        }
      } else {
        console.warn('Invalid point data:', point);
      }
    } else {
      console.warn('No valid point index found for current time');
    }

    // コンポーネントのクリーンアップ
    return () => {
      if (satelliteMarkerRef.current) {
        console.log('Removing satellite marker');
        satelliteMarkerRef.current.remove();
        satelliteMarkerRef.current = null;
      }
    };
  }, [currentTime, map, path, onPositionUpdate, satelliteIcon]);

  return null;
};

export default SatelliteAnimationLayer;

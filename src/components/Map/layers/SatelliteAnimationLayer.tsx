import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { OrbitPath } from '@/types';
import { AnimationState } from '../panels/AnimationControlPanel';
import '../styles/satellite.css'; // 衛星アイコンのスタイルをインポート
import { ORBIT_COLORS } from './VisibilityCircleLayer';

interface SatelliteAnimationLayerProps {
  path: OrbitPath;
  animationState: AnimationState;
  onPositionUpdate?: (position: AnimationState['currentPosition']) => void;
}

/**
 * 衛星アニメーションを表示するレイヤーコンポーネント
 * シンプルな実装：現在日時の軌道の座標を取得してそこに衛星アイコンを表示する
 */
const SatelliteAnimationLayer: React.FC<SatelliteAnimationLayerProps> = ({
  path,
  animationState,
  onPositionUpdate
}) => {
  const map = useMap();
  const { currentTime } = animationState;
  const satelliteMarkerRef = useRef<L.Marker | null>(null);
  const satelliteIconRef = useRef<L.Icon | null>(null);

  // 衛星アイコンの初期化（一度だけ作成）
  if (!satelliteIconRef.current) {
    // 衛星の軌道タイプに基づいてアイコンクラスを決定
    // 注: 現在の実装ではOrbitPathから軌道タイプを直接取得できないため、
    // 衛星IDから推測するか、デフォルト値を使用する
    let orbitType = 'LEO'; // デフォルトはLEO

    // 衛星IDから軌道タイプを推測（例：IDに基づく簡易な判定）
    const satelliteId = path.satelliteId.toLowerCase();
    if (satelliteId.includes('geo') || satelliteId.includes('geostationary')) {
      orbitType = 'GEO';
    } else if (satelliteId.includes('meo') || satelliteId.includes('medium')) {
      orbitType = 'MEO';
    } else if (satelliteId.includes('heo') || satelliteId.includes('high')) {
      orbitType = 'HEO';
    }

    const iconClass = `satellite-icon satellite-icon-${orbitType.toLowerCase()}`;

    satelliteIconRef.current = L.icon({
      // データURLを使用してアイコンを埋め込む（CSP制約を回避）
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0Ij48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjMTk3NmQyIi8+PHBhdGggZD0iTTEyLDYuNWMwLTEuMSwwLjktMiwyLTJzMiwwLjksMiwycy0wLjksMi0yLDJTMTIsNy42LDEyLDYuNXogTTE3LDguNWwzLDNsLTEuNSwxLjVsLTMtM1Y4LjV6IE03LDguNWwtMywzbDEuNSwxLjVsMy0zVjguNXogTTEyLDExLjVjLTEuMSwwLTIsMC45LTIsMnMwLjksMiwyLDJzMi0wLjksMi0yUzEzLjEsMTEuNSwxMiwxMS41eiBNMTIsMTUuNWMtMS4xLDAtMiwwLjktMiwyczAuOSwyLDIsMnMyLTAuOSwyLTJTMTMuMSwxNS41LDEyLDE1LjV6IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
      className: iconClass
    });
  }

  // 指定された時刻に対応する軌道点を見つける
  const findOrbitPoint = (time: Date) => {
    if (!path.segments || path.segments.length === 0) return null;

    // 全ポイント数を計算
    let totalPoints = 0;
    path.segments.forEach(segment => {
      totalPoints += segment.points.length;
    });
    if (totalPoints === 0) return null;

    // 時間の割合を計算
    const startTime = animationState.startTime.getTime();
    const endTime = animationState.endTime.getTime();
    const currentTime = time.getTime();

    // 時間が範囲外の場合は範囲内に収める
    const normalizedTime = Math.max(startTime, Math.min(currentTime, endTime));
    const timeRatio = (endTime === startTime) ? 0 : (normalizedTime - startTime) / (endTime - startTime);

    // 時間の割合に応じたポイントのインデックスを計算
    const targetIndex = Math.floor(timeRatio * (totalPoints - 1));

    // ポイントを特定
    let pointCounter = 0;
    for (let segmentIndex = 0; segmentIndex < path.segments.length; segmentIndex++) {
      const segment = path.segments[segmentIndex];
      if (segment.points.length === 0) continue;

      if (pointCounter + segment.points.length > targetIndex) {
        const pointIndex = targetIndex - pointCounter;
        const point = segment.points[pointIndex];
        const effectiveAngle = segment.effectiveAngles[pointIndex];
        return { point, effectiveAngle };
      }
      pointCounter += segment.points.length;
    }

    // 最後のポイントを返す
    if (path.segments.length > 0) {
      for (let i = path.segments.length - 1; i >= 0; i--) {
        if (path.segments[i].points.length > 0) {
          const lastSegment = path.segments[i];
          const lastIndex = lastSegment.points.length - 1;
          return {
            point: lastSegment.points[lastIndex],
            effectiveAngle: lastSegment.effectiveAngles[lastIndex]
          };
        }
      }
    }

    return null;
  };

  // 衛星の位置を更新
  useEffect(() => {
    // 現在時刻の軌道点を取得
    const orbitPoint = findOrbitPoint(currentTime);
    if (!orbitPoint) return;

    const { point, effectiveAngle } = orbitPoint;

    // 経度を-180〜180度の範囲に正規化
    let lng = point.lng;
    while (lng > 180) lng -= 360;
    while (lng < -180) lng += 360;

    // マーカーがまだ作成されていない場合は作成
    if (!satelliteMarkerRef.current) {
      // satelliteIconRef.currentがnullでないことを確認
      if (satelliteIconRef.current) {
        satelliteMarkerRef.current = L.marker([point.lat, lng], {
          icon: satelliteIconRef.current,
          zIndexOffset: 1000, // 他のマーカーより前面に表示
          // アニメーションを無効化して点滅を防止
          interactive: true,
          bubblingMouseEvents: false
        }).addTo(map);

        // ポップアップを設定（初回のみ）
        const popupContent = `
          <b>衛星位置情報</b><br>
          時刻: ${currentTime.toLocaleString()}<br>
          仰角: ${effectiveAngle.toFixed(2)}°<br>
          緯度: ${point.lat.toFixed(4)}°<br>
          経度: ${lng.toFixed(4)}°
        `;

        satelliteMarkerRef.current.bindPopup(popupContent);
      }
    } else {
      // マーカーが存在し、アニメーション中の場合のみ位置を更新
      const marker = satelliteMarkerRef.current;
      if (marker && animationState.isPlaying) {
        // アニメーションなしで位置を更新して点滅を防止
        marker.setLatLng([point.lat, lng]);

        // ポップアップ内容を更新（開いている場合のみ）
        if (marker.isPopupOpen()) {
          const popupContent = `
            <b>衛星位置情報</b><br>
            時刻: ${currentTime.toLocaleString()}<br>
            仰角: ${effectiveAngle.toFixed(2)}°<br>
            緯度: ${point.lat.toFixed(4)}°<br>
            経度: ${lng.toFixed(4)}°
          `;
          marker.setPopupContent(popupContent);
        }
      }
    }

    // 位置情報を親コンポーネントに通知
    if (onPositionUpdate) {
      onPositionUpdate({
        lat: point.lat,
        lng: lng,
        elevation: effectiveAngle,
        azimuth: 0,
        range: 0
      });
    }

    // コンポーネントのクリーンアップ
    return () => {
      if (satelliteMarkerRef.current) {
        satelliteMarkerRef.current.remove();
        satelliteMarkerRef.current = null;
      }
    };
  }, [currentTime, map, path, animationState, onPositionUpdate]);

  return null;
};

export default SatelliteAnimationLayer;

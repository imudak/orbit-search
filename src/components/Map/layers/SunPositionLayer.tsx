import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Location } from '@/types';
import { AnimationState } from '../panels/AnimationControlPanel';
import '../styles/sun.css'; // 太陽アイコンのスタイルをインポート
import { calculateSunPosition, calculateSolarDeclination } from '@/utils/sunCalculations';

interface SunPositionLayerProps {
  date: Date;
  observerLocation?: Location;
  key?: string; // Reactのkeyプロパティ
}

/**
 * 太陽の位置をアイコンで表示するレイヤーコンポーネント（改善版）
 */
const SunPositionLayer: React.FC<SunPositionLayerProps> = ({
  date,
  observerLocation
}) => {
  const map = useMap();
  const sunMarkerRef = useRef<L.Marker | null>(null);
  const sunIconRef = useRef<L.DivIcon | L.Icon | null>(null);

  // キャッシュ用のrefオブジェクト
  const positionCache = useRef<Map<number, {lat: number, lng: number}>>(new Map());

  // 太陽アイコンの初期化（一度だけ作成）
  if (!sunIconRef.current) {
    // DivIconを使用して太陽アイコンを作成（よりリアルな表現に）
    sunIconRef.current = L.divIcon({
      html: `
        <div class="sun-icon-container">
          <div class="sun-icon-circle"></div>
          <div class="sun-icon-rays"></div>
        </div>
      `,
      className: 'sun-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });
  }

  // 太陽位置を計算（キャッシュを活用）
  const getSunPosition = (date: Date) => {
    const timestamp = date.getTime();

    // キャッシュに結果があればそれを返す
    if (positionCache.current.has(timestamp)) {
      return positionCache.current.get(timestamp)!; // non-null assertion
    }

    // 新しい計算方法で太陽位置を計算
    const sunPosition = calculateSunPosition(date);

    // 計算結果をキャッシュ
    positionCache.current.set(timestamp, sunPosition);

    // キャッシュが大きくなりすぎないように古いエントリを削除
    if (positionCache.current.size > 100) {
      // 最も古いキーを削除
      const oldestKeys = [...positionCache.current.keys()].sort();
      if (oldestKeys.length > 0) {
        positionCache.current.delete(oldestKeys[0]);
      }
    }

    return sunPosition;
  };

  // 太陽の位置を更新
  useEffect(() => {
    try {
      // 太陽の位置を計算（改善版の計算関数を使用）
      const sunPosition = getSunPosition(date);

      // 太陽の位置が有効な座標かチェック
      if (isNaN(sunPosition.lat) || isNaN(sunPosition.lng)) {
        console.error('無効な太陽位置:', sunPosition);
        return;
      }

      // マーカーがまだ作成されていない場合は作成
      if (!sunMarkerRef.current) {
        // sunIconRef.currentがnullでないことを確認
        if (sunIconRef.current) {
          // 太陽マーカーを作成
          sunMarkerRef.current = L.marker([sunPosition.lat, sunPosition.lng], {
            icon: sunIconRef.current,
            zIndexOffset: 1000, // 他のマーカーより前面に表示
            interactive: true,
            bubblingMouseEvents: false
          }).addTo(map);

          // ポップアップを設定（初回のみ）
          const popupContent = `
            <b>太陽位置情報</b><br>
            時刻: ${date.toLocaleString()}<br>
            経度: ${sunPosition.lng.toFixed(4)}°<br>
            赤緯: ${sunPosition.lat.toFixed(4)}°<br>
            <small>※季節により赤緯（南北位置）が変化します</small>
          `;

          sunMarkerRef.current.bindPopup(popupContent);
        }
      } else {
        // マーカーが存在する場合は位置を更新
        const marker = sunMarkerRef.current;
        if (marker) {
          // 位置を更新（スムーズなアニメーションで移動）
          const isSmallMove = Math.abs(marker.getLatLng().lat - sunPosition.lat) < 5 &&
                              Math.abs(marker.getLatLng().lng - sunPosition.lng) < 5;

          if (isSmallMove) {
            // 小さな移動の場合はアニメーション
            marker.setLatLng([sunPosition.lat, sunPosition.lng]);
          } else {
            // 大きな移動の場合は即時更新
            marker.setLatLng([sunPosition.lat, sunPosition.lng]);
          }

          // ポップアップ内容を更新（開いている場合のみ）
          if (marker.isPopupOpen()) {
            const popupContent = `
              <b>太陽位置情報</b><br>
              時刻: ${date.toLocaleString()}<br>
              経度: ${sunPosition.lng.toFixed(4)}°<br>
              赤緯: ${sunPosition.lat.toFixed(4)}°<br>
              <small>※季節により赤緯（南北位置）が変化します</small>
            `;
            marker.setPopupContent(popupContent);
          }
        }
      }
    } catch (error) {
      console.error('太陽位置の更新中にエラーが発生しました:', error);
    }

    // コンポーネントのクリーンアップ
    return () => {
      if (sunMarkerRef.current) {
        sunMarkerRef.current.remove();
        sunMarkerRef.current = null;
      }
    };
  }, [date.getTime(), map]); // date.getTimeのみを依存配列に含める

  return null;
};

export default SunPositionLayer;

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
 * 太陽の位置をアイコンで表示するレイヤーコンポーネント
 */
const SunPositionLayer: React.FC<SunPositionLayerProps> = ({
  date,
  observerLocation
}) => {
  const map = useMap();
  const sunMarkerRef = useRef<L.Marker | null>(null);
  const sunIconRef = useRef<L.DivIcon | L.Icon | null>(null);

  // 共通のユーティリティ関数を使用

  // 太陽アイコンの初期化（一度だけ作成）
  if (!sunIconRef.current) {
    // DivIconを使用して太陽アイコンを作成
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

  // 太陽の位置を更新
  useEffect(() => {
    // 太陽の位置を計算
    const sunPosition = calculateSunPosition(date);

    try {
      // マーカーがまだ作成されていない場合は作成
      if (!sunMarkerRef.current) {
        // sunIconRef.currentがnullでないことを確認
        if (sunIconRef.current) {
          // 太陽の位置が有効な座標かチェック
          if (isNaN(sunPosition.lat) || isNaN(sunPosition.lng)) {
            console.error('無効な太陽位置:', sunPosition);
            return;
          }

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
            <small>※赤道上（緯度0°）に表示</small><br>
            <small>※実際の赤緯: ${calculateSolarDeclination(date).toFixed(4)}°</small>
          `;

          sunMarkerRef.current.bindPopup(popupContent);
        }
      } else {
        // マーカーが存在する場合は位置を更新
        const marker = sunMarkerRef.current;
        if (marker) {
          try {
            // 太陽の位置が有効な座標かチェック
            if (isNaN(sunPosition.lat) || isNaN(sunPosition.lng)) {
              console.error('無効な太陽位置:', sunPosition);
              return;
            }

            // 位置を更新
            marker.setLatLng([sunPosition.lat, sunPosition.lng]);

            // ポップアップ内容を更新（開いている場合のみ）
            if (marker.isPopupOpen()) {
              const popupContent = `
                <b>太陽位置情報</b><br>
                時刻: ${date.toLocaleString()}<br>
                経度: ${sunPosition.lng.toFixed(4)}°<br>
                <small>※赤道上（緯度0°）に表示</small><br>
                <small>※実際の赤緯: ${calculateSolarDeclination(date).toFixed(4)}°</small>
              `;
              marker.setPopupContent(popupContent);
            }
          } catch (error) {
            console.error('太陽マーカーの更新中にエラーが発生しました:', error);
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

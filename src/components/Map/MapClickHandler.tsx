import React from 'react';
import { useMapEvents } from 'react-leaflet';
import type { Location } from '@/types';

interface MapClickHandlerProps {
  onLocationSelect: (location: Location) => void;
}

/**
 * 地図クリックイベントを処理するコンポーネント
 */
const MapClickHandler: React.FC<MapClickHandlerProps> = ({
  onLocationSelect
}) => {
  // 地図イベントを処理
  useMapEvents({
    click: (e) => {
      // クリックした位置の緯度経度を取得
      const { lat, lng } = e.latlng;

      // 親コンポーネントに通知
      onLocationSelect({
        lat,
        lng
      });

      console.log(`地図がクリックされました: 緯度=${lat}, 経度=${lng}`);
    }
  });

  return null;
};

export default MapClickHandler;

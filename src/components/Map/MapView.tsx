import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import type { Location } from '@/types';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  center?: Location;
  zoom?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * 地図の基本表示のみを担当するコンポーネント
 * 他の機能はすべて子コンポーネントとして渡す
 */
const MapView: React.FC<MapViewProps> = ({
  center = { lat: 35.6812, lng: 139.7671 }, // デフォルト: 東京
  zoom = 5,
  children,
  style = { height: '100%', width: '100%' }
}) => {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      style={style}
      zoomControl={false} // デフォルトのズームコントロールを無効化（カスタムコントロールを使用）
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | &copy; Kazumi OKANO'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </MapContainer>
  );
};

export default MapView;

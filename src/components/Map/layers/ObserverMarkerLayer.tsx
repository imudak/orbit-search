import React from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Typography } from '@mui/material';
import type { Location } from '@/types';

// カスタムマーカーアイコンの設定
const observerIcon = L.icon({
  iconUrl: `${import.meta.env.BASE_URL}marker-icon.png`,
  shadowUrl: `${import.meta.env.BASE_URL}marker-shadow.png`,
  iconSize: [30, 45],  // 少し大きく
  iconAnchor: [15, 45], // アイコンの中心位置
  popupAnchor: [0, -45], // ポップアップの位置
  shadowSize: [41, 41]
});

interface ObserverMarkerLayerProps {
  center: Location;
}

/**
 * 観測地点マーカーを表示するレイヤーコンポーネント
 */
const ObserverMarkerLayer: React.FC<ObserverMarkerLayerProps> = ({
  center
}) => {
  const map = useMap();

  // 観測地点が変更されたら、その位置にマップの中心を移動
  React.useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], map.getZoom());
    }
  }, [center, map]);

  if (!center) return null;

  return (
    <Marker position={[center.lat, center.lng]} icon={observerIcon}>
      <Popup>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>観測地点</Typography>
        <Typography variant="body2">
          緯度: {center.lat.toFixed(6)}<br />
          経度: {center.lng.toFixed(6)}
        </Typography>
      </Popup>
    </Marker>
  );
};

export default ObserverMarkerLayer;

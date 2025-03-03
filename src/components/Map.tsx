import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L, { LatLng } from 'leaflet';
import { styled } from '@mui/material/styles';
import type { Location, OrbitPath } from '@/types';
import 'leaflet/dist/leaflet.css';

// デフォルトアイコンの設定
const defaultIcon = L.icon({
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

const MapWrapper = styled('div')({
  width: '100%',
  height: '500px',
  borderRadius: '8px',
  overflow: 'hidden',
});

interface MapProps {
  center?: Location;
  onLocationSelect: (location: Location) => void;
  orbitPaths?: OrbitPath[];
}

interface OrbitLayerProps {
  paths: OrbitPath[];
}

// マップクリックハンドラーコンポーネント
const MapClickHandler: React.FC<{ onLocationSelect: (location: Location) => void }> = ({
  onLocationSelect,
}) => {
  const map = useMap();

  React.useEffect(() => {
    const handleClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      onLocationSelect({ lat, lng });
    };

    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
    };
  }, [map, onLocationSelect]);

  return null;
};

// 軌道パスの色を生成する関数
const getPathColor = (index: number): string => {
  // 複数のパスを異なる色で表示するための色の配列
  const colors = [
    '#FF4081', // ピンク
    '#2196F3', // 青
    '#4CAF50', // 緑
    '#FFC107', // 黄色
    '#9C27B0', // 紫
    '#FF5722', // オレンジ
    '#607D8B', // 青灰色
    '#E91E63', // 赤紫
    '#3F51B5', // インディゴ
    '#009688', // ティール
  ];

  // インデックスを色の配列の長さで割った余りを使用して色を選択
  return colors[index % colors.length];
};

// 軌道表示レイヤー
const OrbitLayer: React.FC<OrbitLayerProps> = ({ paths }) => {
  const map = useMap();

  React.useEffect(() => {
    if (!paths.length) return;

    // 軌道パスの描画
    const lines = paths.map((path, index) => {
      const latLngs = path.points.map(point => new LatLng(point.lat, point.lng));

      // 最大仰角に基づいてスタイルを設定
      const maxElevation = path.maxElevation;
      const weight = maxElevation >= 60 ? 4 : // 高仰角（60度以上）
                    maxElevation >= 30 ? 3 : // 中仰角（30-60度）
                    2; // 低仰角（30度未満）
      const opacity = maxElevation >= 60 ? 1.0 : // 高仰角
                     maxElevation >= 30 ? 0.8 : // 中仰角
                     0.4; // 低仰角

      // 各パスに色と太さ、不透明度を設定
      return L.polyline(latLngs, {
        color: getPathColor(index),
        weight,
        opacity,
        // パスの情報をポップアップで表示
        bubblingMouseEvents: true,
      }).addTo(map).bindPopup(`パス ${index + 1} (最大仰角: ${maxElevation.toFixed(1)}°)`);
    });

    // すべてのパスが表示されるようにビューを調整
    if (paths.length > 0 && paths[0].points.length > 0) {
      const allPoints = paths.flatMap(path => path.points);
      const bounds = L.latLngBounds(allPoints.map(p => new LatLng(p.lat, p.lng)));
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      // クリーンアップ時に軌道パスを削除
      lines.forEach(line => line.remove());
    };
  }, [paths, map]);

  return null;
};

const Map: React.FC<MapProps> = ({
  center = { lat: 35.6812, lng: 139.7671 }, // デフォルト: 東京
  onLocationSelect,
  orbitPaths = [],
}) => {
  return (
    <MapWrapper>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onLocationSelect={onLocationSelect} />
        {center && (
          <Marker position={[center.lat, center.lng]}>
            <Popup>
              緯度: {center.lat.toFixed(4)}<br />
              経度: {center.lng.toFixed(4)}
            </Popup>
          </Marker>
        )}
        {orbitPaths.length > 0 && <OrbitLayer paths={orbitPaths} />}
      </MapContainer>
    </MapWrapper>
  );
};

export default Map;

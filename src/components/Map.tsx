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
    const lines = paths.flatMap((path, pathIndex) => {
      // 各セグメントのパスを作成
      return path.segments.flatMap((segment, segmentIndex) => {
        const lines: L.Polyline[] = [];

        // セグメント内の各ポイント間に線を引く
        for (let i = 0; i < segment.points.length - 1; i++) {
          const point1 = segment.points[i];
          const point2 = segment.points[i + 1];
          const effectiveAngle = segment.effectiveAngles[i];

          // セグメントのポイントを作成
          const segmentPoints = [
            new LatLng(point1.lat, point1.lng),
            new LatLng(point2.lat, point2.lng)
          ];

          // 実効的な角度に基づいてスタイルを設定
          const weight = effectiveAngle >= 60 ? 4 : // 高角度（60度以上）
                        effectiveAngle >= 30 ? 3 : // 中角度（30-60度）
                        2; // 低角度（30度未満）
          const opacity = effectiveAngle >= 60 ? 1.0 : // 高角度
                         effectiveAngle >= 30 ? 0.8 : // 中角度
                         0.4; // 低角度

          // ラインを作成
          const line = L.polyline(segmentPoints, {
            color: getPathColor(pathIndex),
            weight,
            opacity,
            bubblingMouseEvents: true,
          }).addTo(map);

          // マウスオーバー時に実効的な角度を表示
          line.bindTooltip(
            `実効的な角度: ${effectiveAngle.toFixed(1)}°`
          );
          lines.push(line);
        }

        return lines;
      });
    });

    // すべてのセグメントのポイントを取得してビューを調整
    if (paths.length > 0) {
      const allPoints = paths.flatMap(path =>
        path.segments.flatMap(segment => segment.points)
      );
      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints.map(p => new LatLng(p.lat, p.lng)));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    // 配列が入れ子になっているので、平坦化して一つの配列にする
    const allLines = lines.flat();

    return () => {
      // クリーンアップ時に軌道パスを削除
      allLines.forEach(line => line.remove());
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

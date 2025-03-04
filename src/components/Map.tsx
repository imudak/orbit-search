import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L, { LatLng } from 'leaflet';
import { styled } from '@mui/material/styles';
import { Button, ButtonGroup, Box } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import HomeIcon from '@mui/icons-material/Home';
import type { Location, OrbitPath, SearchFilters } from '@/types';
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

// 地球の半径（km）
const EARTH_RADIUS = 6371;

// 衛星軌道の種類と高度の定義
interface OrbitType {
  name: string;
  height: number; // km
  color: string;
}

const ORBIT_TYPES: OrbitType[] = [
  { name: 'LEO', height: 800, color: '#FF0000' },    // 低軌道: 赤
  { name: 'MEO', height: 20000, color: '#00FF00' },  // 中軌道: 緑
  { name: 'GEO', height: 35786, color: '#0000FF' }   // 静止軌道: 青
];

// 仰角と衛星高度から地表での可視範囲の半径を計算する関数
const calculateVisibleRadius = (elevationDeg: number, satelliteHeight: number): number => {
  // 地球の半径（km）
  const R = EARTH_RADIUS;

  // 仰角をラジアンに変換
  const elevationRad = elevationDeg * Math.PI / 180;

  // 衛星から地球中心までの距離
  const satelliteDistance = R + satelliteHeight;

  // 仰角から中心角を計算
  // 参考: https://en.wikipedia.org/wiki/Satellite_ground_track
  const centralAngle = Math.asin(R / satelliteDistance * Math.cos(elevationRad)) - elevationRad;

  // 中心角から地表での距離を計算
  return R * Math.abs(centralAngle);
};

interface MapProps {
  center?: Location;
  onLocationSelect: (location: Location) => void;
  orbitPaths?: OrbitPath[];
  filters?: SearchFilters;
}

interface OrbitLayerProps {
  paths: OrbitPath[];
}

// 観測地点からの可視範囲を表示するコンポーネント
const VisibilityCircle: React.FC<{
  center: Location;
  minElevation: number;
  orbitType: OrbitType;
}> = ({
  center,
  minElevation,
  orbitType
}) => {
  // Leafletのマップインスタンスを取得
  const map = useMap();

  // 最低仰角と衛星高度から可視範囲の半径を計算
  const radiusKm = calculateVisibleRadius(minElevation, orbitType.height);
  // kmをmに変換
  const radiusMeters = radiusKm * 1000;

  return (
    <Circle
      center={[center.lat, center.lng]}
      radius={radiusMeters}
      pathOptions={{
        color: orbitType.color,
        weight: 1,
        dashArray: '5, 5',
        fillColor: orbitType.color,
        fillOpacity: 0.05,
        bubblingMouseEvents: true // マウスイベントを下のレイヤーに伝播させる
      }}
      eventHandlers={{
        mouseover: (e) => {
          // マウスオーバー時にツールチップを表示
          const tooltip = L.tooltip()
            .setLatLng(e.latlng)
            .setContent(`
              <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">
                ${orbitType.name}衛星の可視範囲
              </div>
              <div>仰角: ${minElevation}度以上</div>
              <div>高度: ${orbitType.height}km</div>
              <div>地表での距離: ${radiusKm.toFixed(0)}km</div>
            `)
            .openOn(map);

          // ツールチップを一時的に保存
          (e.target as any)._tooltip = tooltip;
        },
        mouseout: (e) => {
          // マウスアウト時にツールチップを閉じる
          if ((e.target as any)._tooltip) {
            map.closeTooltip((e.target as any)._tooltip);
            (e.target as any)._tooltip = null;
          }
        },
        click: (e) => {
          // クリックイベントは下のレイヤーに伝播させる
          // 何もしない
        }
      }}
    />
  );
};

// マップコントロールボタン
const MapControls: React.FC<{
  defaultCenter: Location;
  defaultZoom: number;
}> = ({
  defaultCenter,
  defaultZoom
}) => {
  const map = useMap();

  // 全体表示ボタンのクリックハンドラー
  const handleFullView = () => {
    // 軌道パスのすべてのポイントを取得
    const allPolylines = document.querySelectorAll('.leaflet-interactive');
    if (allPolylines.length === 0) return;

    try {
      // 地図上のすべての要素を含む境界を計算
      // 観測地点を中心に、大きめの範囲を表示
      const center = map.getCenter();
      const bounds = L.latLngBounds(
        L.latLng(center.lat - 20, center.lng - 40),
        L.latLng(center.lat + 20, center.lng + 40)
      );

      // 境界が有効な場合、その範囲に合わせて表示
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (error) {
      console.error('Failed to fit bounds:', error);
    }
  };

  // 元の縮尺に戻すボタンのクリックハンドラー
  const handleResetView = () => {
    map.setView([defaultCenter.lat, defaultCenter.lng], defaultZoom);
  };

  // ズームインボタンのクリックハンドラー
  const handleZoomIn = () => {
    map.zoomIn();
  };

  // ズームアウトボタンのクリックハンドラー
  const handleZoomOut = () => {
    map.zoomOut();
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: '4px',
        padding: '5px',
        boxShadow: '0 0 5px rgba(0, 0, 0, 0.3)'
      }}
    >
      <ButtonGroup orientation="vertical" size="small">
        <Button onClick={handleZoomIn} title="ズームイン">
          <ZoomInIcon fontSize="small" />
        </Button>
        <Button onClick={handleZoomOut} title="ズームアウト">
          <ZoomOutIcon fontSize="small" />
        </Button>
        <Button onClick={handleFullView} title="全体表示">
          <FullscreenIcon fontSize="small" />
        </Button>
        <Button onClick={handleResetView} title="元の縮尺に戻す">
          <HomeIcon fontSize="small" />
        </Button>
      </ButtonGroup>
    </Box>
  );
};

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
          let color: string;
          let weight: number;
          let opacity: number;

          if (effectiveAngle >= 45) {
            // 高仰角: 赤系（最も見やすく）
            color = '#FF0000';
            weight = 4;
            opacity = 1.0;
          } else if (effectiveAngle >= 20) {
            // 中仰角: オレンジ系
            color = '#FFA500';
            weight = 3;
            opacity = 0.8;
          } else if (effectiveAngle >= 10) {
            // 低仰角: 青系
            color = '#0000FF';
            weight = 2;
            opacity = 0.5;
          } else {
            // 極低仰角: グレー系
            color = '#808080';
            weight = 1;
            opacity = 0.3;
          }

          // ラインを作成
          const line = L.polyline(segmentPoints, {
            color,
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

    // 以前はここで地図の表示範囲を自動調整していたが、
    // ユーザーからの要望により削除し、元の縮尺を維持するようにした

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
  filters,
}) => {
  // 最低仰角の値（デフォルト10度）
  const minElevation = filters?.minElevation ?? 10;

  // デフォルトのズームレベル
  const defaultZoom = 4;

  return (
    <MapWrapper>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={defaultZoom} // より広い範囲を表示
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onLocationSelect={onLocationSelect} />
        {/* 地図コントロールボタン */}
        <MapControls
          defaultCenter={center}
          defaultZoom={defaultZoom}
        />
        {center && (
          <>
            <Marker position={[center.lat, center.lng]}>
              <Popup>
                緯度: {center.lat.toFixed(4)}<br />
                経度: {center.lng.toFixed(4)}
              </Popup>
            </Marker>
            {/* 各軌道種類ごとの可視範囲を表示 */}
            {ORBIT_TYPES.map((orbitType, index) => (
              <VisibilityCircle
                key={orbitType.name}
                center={center}
                minElevation={minElevation}
                orbitType={orbitType}
              />
            ))}
          </>
        )}
        {orbitPaths.length > 0 && <OrbitLayer paths={orbitPaths} />}
      </MapContainer>
    </MapWrapper>
  );
};

export default Map;

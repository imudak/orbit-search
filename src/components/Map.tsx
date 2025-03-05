import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L, { LatLng } from 'leaflet';
import { styled } from '@mui/material/styles';
import { Button, ButtonGroup, Box, Typography, Paper } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import HomeIcon from '@mui/icons-material/Home';
import LegendToggleIcon from '@mui/icons-material/LegendToggle';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import type { Location, OrbitPath, SearchFilters, SunPath } from '@/types';
import { SunService } from '@/services/sunService';
import 'leaflet/dist/leaflet.css';

// デフォルトアイコンの設定
const defaultIcon = L.icon({
  iconUrl: `${import.meta.env.BASE_URL}marker-icon.png`,
  shadowUrl: `${import.meta.env.BASE_URL}marker-shadow.png`,
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
  position: 'relative', // 子要素の絶対位置指定の基準にする
});

// 地球の半径（km）
const EARTH_RADIUS = 6371;

// 衛星軌道の種類と高度の定義
interface OrbitType {
  name: string;
  height: number; // km
  color: string;
}

// デフォルトの軌道種類と高度
const DEFAULT_ORBIT_TYPES: OrbitType[] = [
  { name: 'LEO', height: 800, color: '#FF0000' },    // 低軌道: 赤
  { name: 'MEO', height: 20000, color: '#00FF00' },  // 中軌道: 緑
  { name: 'GEO', height: 35786, color: '#0000FF' }   // 静止軌道: 青
];

// 軌道種類から色を取得する関数
const getOrbitTypeColor = (orbitType: string): string => {
  switch (orbitType) {
    case 'LEO': return '#FF0000'; // 赤
    case 'MEO': return '#00FF00'; // 緑
    case 'GEO': return '#0000FF'; // 青
    case 'HEO': return '#FFA500'; // オレンジ
    default: return '#808080';    // グレー
  }
};

// 仰角と衛星高度から地表での可視範囲の半径を計算する関数（再修正版）
const calculateVisibleRadius = (elevationDeg: number, satelliteHeight: number): number => {
  // 地球の半径（km）
  const R = EARTH_RADIUS;

  // 仰角をラジアンに変換
  const elevationRad = elevationDeg * Math.PI / 180;

  // 衛星から地球中心までの距離
  const satelliteDistance = R + satelliteHeight;

  // 仰角から中心角を計算（再修正版）
  // 参考: https://en.wikipedia.org/wiki/Satellite_ground_track

  // 仰角90度の場合は可視範囲0（真上のみ）
  if (elevationDeg >= 90) {
    return 0;
  }

  // 仰角から地平線までの角度を計算
  const horizonAngle = Math.acos(R / satelliteDistance);

  // 仰角から可視範囲の中心角を計算
  // 仰角0度の場合は地平線まで、仰角90度の場合は0
  const centralAngle = Math.max(0, horizonAngle - elevationRad);

  // 中心角から地表での距離を計算
  return R * centralAngle;
};

interface MapProps {
  center?: Location;
  onLocationSelect: (location: Location) => void;
  orbitPaths?: OrbitPath[];
  filters?: SearchFilters;
  satellites?: Array<{
    orbitHeight?: number;
    orbitType?: string;
  }>;
  sunPaths?: SunPath[];
}

// 太陽軌道表示レイヤー
const SunPathLayer: React.FC<{
  paths: SunPath[];
  color?: string;
}> = ({ paths, color = '#FFA500' }) => {
  const map = useMap();

  React.useEffect(() => {
    if (!paths.length) return;

    // 太陽軌道の描画
    const lines = paths.flatMap((path) => {
      if (!path.visible || path.points.length < 2) return [];

      const points = path.points.map(point => new LatLng(point.lat, point.lng));
      const line = L.polyline(points, {
        color,
        weight: 2,
        opacity: 0.7,
        dashArray: '5, 5',
      }).addTo(map);

      // マウスオーバー時に日付を表示
      line.bindTooltip(
        `日付: ${path.date.toLocaleDateString('ja-JP')}`
      );

      return [line];
    });

    return () => {
      // クリーンアップ時に軌道を削除
      lines.forEach(line => line.remove());
    };
  }, [paths, map, color]);

  return null;
};

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
    />
  );
};

// マップコントロールボタン（MapContainerの外に配置）
const MapControls: React.FC<{
  map: L.Map | null;
  currentCenter: Location;
  defaultZoom: number;
  showLegend: boolean;
  onToggleLegend: () => void;
  showSunPaths?: boolean;
  onToggleSunPaths?: () => void;
}> = ({
  map,
  currentCenter,
  defaultZoom,
  showLegend,
  onToggleLegend,
  showSunPaths = false,
  onToggleSunPaths
}) => {
  // マップが存在しない場合は何も表示しない
  if (!map) return null;

  // 全体表示ボタンのクリックハンドラー
  const handleFullView = () => {
    // 日本全体が見えるように表示
    const japanBounds = L.latLngBounds(
      L.latLng(24.0, 122.0), // 南西端（沖縄付近）
      L.latLng(46.0, 146.0)  // 北東端（北海道付近）
    );

    // 境界が有効な場合、その範囲に合わせて表示
    if (japanBounds.isValid()) {
      map.fitBounds(japanBounds, { padding: [50, 50] });
    }
  };

  // 元の縮尺に戻すボタンのクリックハンドラー
  const handleResetView = () => {
    // 現在の観測地点を中心に、デフォルトのズームレベルに戻す
    map.setView([currentCenter.lat, currentCenter.lng], defaultZoom);
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
        top: '10px',     // 上部に配置
        right: '10px',   // 右側に配置
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: '4px',
        padding: '5px',
        boxShadow: '0 0 5px rgba(0, 0, 0, 0.3)',
      }}
    >
      <ButtonGroup orientation="horizontal" size="small">
        <Button onClick={handleZoomIn} title="ズームイン">
          <ZoomInIcon fontSize="small" />
        </Button>
        <Button onClick={handleZoomOut} title="ズームアウト">
          <ZoomOutIcon fontSize="small" />
        </Button>
        <Button onClick={handleFullView} title="日本全体表示">
          <FullscreenIcon fontSize="small" />
        </Button>
        <Button onClick={handleResetView} title="選択地点に戻る">
          <HomeIcon fontSize="small" />
        </Button>
        <Button
          onClick={onToggleLegend}
          title={showLegend ? "凡例を非表示" : "凡例を表示"}
          color={showLegend ? "primary" : "inherit"}
        >
          <LegendToggleIcon fontSize="small" />
        </Button>
        {onToggleSunPaths && (
          <Button
            onClick={onToggleSunPaths}
            title={showSunPaths ? "太陽軌道を非表示" : "太陽軌道を表示"}
            color={showSunPaths ? "primary" : "inherit"}
          >
            <WbSunnyIcon fontSize="small" />
          </Button>
        )}
      </ButtonGroup>
    </Box>
  );
};

// MapContainerのマップインスタンスを取得するためのコンポーネント
const MapController: React.FC<{
  onMapReady: (map: L.Map) => void;
}> = ({ onMapReady }) => {
  const map = useMap();

  React.useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  return null;
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

// 可視範囲と軌道の凡例を表示するコンポーネント
const VisibilityLegend: React.FC<{
  minElevation: number;
  orbitTypes?: OrbitType[];
}> = ({ minElevation, orbitTypes = DEFAULT_ORBIT_TYPES }) => {
  return (
    <Paper
      sx={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        zIndex: 1000,
        padding: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '4px',
        boxShadow: '0 0 5px rgba(0, 0, 0, 0.3)',
        maxWidth: '300px',
      }}
    >
      {/* 凡例のタイトル */}
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.1)', pb: 0.5 }}>
        地図の色分け説明
      </Typography>

      {/* 可視範囲の凡例 */}
      <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
        ① 衛星軌道種類別の可視範囲（円）
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
        各高度の衛星が最低仰角{minElevation}°以上で見える範囲
      </Typography>
      {orbitTypes.map((orbitType) => (
        <Box key={orbitType.name} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Box
            sx={{
              width: '16px',
              height: '16px',
              backgroundColor: orbitType.color,
              opacity: 0.7,
              mr: 1,
              border: '1px solid rgba(0, 0, 0, 0.3)',
            }}
          />
          <Typography variant="body2">
            {orbitType.name}（{orbitType.name === 'LEO' ? '低軌道' : orbitType.name === 'MEO' ? '中軌道' : '静止軌道'}）: {orbitType.height.toLocaleString()}km
          </Typography>
        </Box>
      ))}

      {/* 軌道の色分け凡例 */}
      <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 2, borderTop: '1px solid rgba(0, 0, 0, 0.1)', pt: 1 }}>
        ② 衛星軌道の色分け（線）
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
        実効的な角度（見やすさ）に基づく色分け
      </Typography>
      {[
        { angle: '45°以上', color: '#FF0000', weight: 4, description: '最も見やすい' },
        { angle: '20°〜45°', color: '#FFA500', weight: 3, description: '見やすい' },
        { angle: '10°〜20°', color: '#0000FF', weight: 2, description: '見にくい' },
        { angle: '10°未満', color: '#808080', weight: 1, description: '最も見にくい' },
      ].map((item, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Box
            sx={{
              width: '20px',
              height: `${item.weight}px`,
              backgroundColor: item.color,
              mr: 1,
            }}
          />
          <Typography variant="body2">
            {item.angle}: {item.description}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
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

// カスタムマーカーアイコンの設定
const observerIcon = L.icon({
  iconUrl: `${import.meta.env.BASE_URL}marker-icon.png`,
  shadowUrl: `${import.meta.env.BASE_URL}marker-shadow.png`,
  iconSize: [30, 45],  // 少し大きく
  iconAnchor: [15, 45], // アイコンの中心位置
  popupAnchor: [0, -45], // ポップアップの位置
  shadowSize: [41, 41]
});

// 衛星データから軌道種類ごとの高度を集計する関数
const aggregateOrbitHeights = (satellites: Array<{ orbitHeight?: number; orbitType?: string; }> = []): OrbitType[] => {
  // 軌道種類ごとの高度の合計と数を記録
  const orbitTypeData: Record<string, { totalHeight: number; count: number }> = {};

  // 有効な軌道高度と軌道種類を持つ衛星のみを処理
  satellites.forEach(satellite => {
    if (satellite.orbitHeight && satellite.orbitHeight > 0 && satellite.orbitType) {
      const orbitType = satellite.orbitType;
      if (!orbitTypeData[orbitType]) {
        orbitTypeData[orbitType] = { totalHeight: 0, count: 0 };
      }
      orbitTypeData[orbitType].totalHeight += satellite.orbitHeight;
      orbitTypeData[orbitType].count += 1;
    }
  });

  // 軌道種類ごとの平均高度を計算
  const result: OrbitType[] = [];
  Object.entries(orbitTypeData).forEach(([type, data]) => {
    if (data.count > 0) {
      const avgHeight = Math.round(data.totalHeight / data.count);
      result.push({
        name: type,
        height: avgHeight,
        color: getOrbitTypeColor(type)
      });
    }
  });

  // 高度の高い順にソート
  return result.sort((a, b) => b.height - a.height);
};

const Map: React.FC<MapProps> = ({
  center = { lat: 35.6812, lng: 139.7671 }, // デフォルト: 東京
  onLocationSelect,
  orbitPaths = [],
  filters,
  satellites = [],
  sunPaths = [],
}) => {
  // 最低仰角の値（デフォルト10度）
  const minElevation = filters?.minElevation ?? 10;

  // デフォルトのズームレベル（日本全体が見えるレベル）
  const defaultZoom = 5;

  // マップインスタンスを保持するための状態
  const [mapInstance, setMapInstance] = React.useState<L.Map | null>(null);

  // 凡例の表示/非表示を管理する状態
  const [showLegend, setShowLegend] = React.useState(true);
  // 太陽軌道の表示/非表示を管理する状態
  const [showSunPaths, setShowSunPaths] = React.useState(false);

  // 凡例の表示/非表示を切り替えるハンドラー
  const handleToggleLegend = React.useCallback(() => {
    setShowLegend(prev => !prev);
  }, []);

  // 太陽軌道の表示/非表示を切り替えるハンドラー
  const handleToggleSunPaths = React.useCallback(() => {
    setShowSunPaths(prev => !prev);
  }, []);

  // 衛星データから軌道種類ごとの高度を集計
  const orbitTypes = React.useMemo(() => {
    const aggregated = aggregateOrbitHeights(satellites);
    // 集計結果がない場合はデフォルト値を使用
    return aggregated.length > 0 ? aggregated : DEFAULT_ORBIT_TYPES;
  }, [satellites]);

  // 太陽軌道を計算
  const [calculatedSunPaths, setCalculatedSunPaths] = React.useState<SunPath[]>([]);

  // filtersが変更されたときに太陽軌道を再計算
  React.useEffect(() => {
    if (filters && filters.startDate && filters.endDate && filters.location) {
      const settings = {
        enabled: true,
        startDate: filters.startDate,
        endDate: filters.endDate,
        interval: 30, // 30分間隔で計算
        color: '#FFA500'
      };

      const paths = SunService.calculateSunPaths(filters.location, settings);
      setCalculatedSunPaths(paths);
    }
  }, [filters]);

  // マップが準備できたときのコールバック
  const handleMapReady = React.useCallback((map: L.Map) => {
    setMapInstance(map);

    // 地図の初期設定
    map.attributionControl.setPosition('bottomleft');

    // zoomControlが存在する場合のみ削除
    if (map.zoomControl) {
      map.zoomControl.remove(); // デフォルトのズームコントロールを削除（カスタムコントロールを使用）
    }
  }, []);

  return (
    <MapWrapper>
      {/* MapControlsコンポーネントをMapContainerの外に配置 */}
      <MapControls
        map={mapInstance}
        currentCenter={center}
        defaultZoom={defaultZoom}
        showLegend={showLegend}
        onToggleLegend={handleToggleLegend}
        showSunPaths={showSunPaths}
        onToggleSunPaths={handleToggleSunPaths}
      />
      {/* 可視範囲の凡例を表示（showLegendがtrueの場合のみ） */}
      {showLegend && <VisibilityLegend minElevation={minElevation} orbitTypes={orbitTypes} />}
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false} // デフォルトのズームコントロールを無効化
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | &copy; Kazumi OKANO'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onLocationSelect={onLocationSelect} />
        <MapController onMapReady={handleMapReady} />
        {center && (
          <>
            <Marker position={[center.lat, center.lng]} icon={observerIcon}>
              <Popup>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>観測地点</Typography>
                <Typography variant="body2">
                  緯度: {center.lat.toFixed(6)}<br />
                  経度: {center.lng.toFixed(6)}
                </Typography>
              </Popup>
            </Marker>
            {/* 各軌道種類ごとの可視範囲を表示（高度の高い順に表示） */}
            {orbitTypes.map((orbitType, index) => (
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
        {showSunPaths && calculatedSunPaths.length > 0 && (
          <SunPathLayer paths={calculatedSunPaths} color="#FFA500" />
        )}
      </MapContainer>
    </MapWrapper>
  );
};

export default Map;

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L, { LatLng } from 'leaflet';
import { styled } from '@mui/material/styles';
import {
  Button,
  ButtonGroup,
  Box,
  Typography,
  Paper,
  Slider,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import HomeIcon from '@mui/icons-material/Home';
import LegendToggleIcon from '@mui/icons-material/LegendToggle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import InfoIcon from '@mui/icons-material/Info';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import type { Location, OrbitPath, SearchFilters, PassPoint } from '@/types';
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
  marginBottom: '10px', // コントロールパネル用のスペースを確保
});

// 情報パネル用のコンテナ
const InfoPanelContainer = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: '10px',
  gap: '10px',
  position: 'relative', // ボタンの位置決めのため
  zIndex: 1100, // 検索ボックスよりも前面に表示
});

// 情報パネル表示切り替えボタン用のスタイル
const ToggleButtonContainer = styled('div')({
  position: 'absolute',
  top: '-40px',
  right: '0',
  zIndex: 1100,
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

// 衛星アニメーションの状態を表す型
interface AnimationState {
  isPlaying: boolean;
  currentTime: Date;
  startTime: Date;
  endTime: Date;
  playbackSpeed: number;
  currentPosition?: {
    lat: number;
    lng: number;
    elevation: number;
    azimuth: number;
    range: number;
  };
}

interface MapProps {
  center?: Location;
  onLocationSelect: (location: Location) => void;
  orbitPaths?: OrbitPath[];
  filters?: SearchFilters;
  satellites?: Array<{
    orbitHeight?: number;
    orbitType?: string;
  }>;
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
}> = ({
  map,
  currentCenter,
  defaultZoom,
  showLegend,
  onToggleLegend
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

// 衛星アニメーションコンポーネント
interface SatelliteAnimationProps {
  path: OrbitPath;
  animationState: AnimationState;
  setAnimationState: React.Dispatch<React.SetStateAction<AnimationState>>;
  onPositionUpdate?: (position: AnimationState['currentPosition']) => void;
}

const SatelliteAnimation: React.FC<SatelliteAnimationProps> = ({
  path,
  animationState,
  setAnimationState,
  onPositionUpdate
}) => {
  const map = useMap();
  const satelliteMarkerRef = useRef<L.Marker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { isPlaying, currentTime, playbackSpeed } = animationState;

  // 衛星アイコンの設定（衛星SVGアイコンを使用）
  const satelliteIcon = useMemo(() => L.icon({
    iconUrl: `${import.meta.env.BASE_URL}satellite.svg`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  }), []);

  // 指定された時刻に最も近い軌道点のインデックスを見つける
  const findClosestPointIndex = useCallback((time: Date): { segmentIndex: number, pointIndex: number } | null => {
    if (!path.segments || path.segments.length === 0) return null;

    // 開始時刻と終了時刻の間の相対位置を計算
    const totalDuration = animationState.endTime.getTime() - animationState.startTime.getTime();
    const currentPosition = (time.getTime() - animationState.startTime.getTime()) / totalDuration;

    // 全ポイント数を計算
    let totalPoints = 0;
    path.segments.forEach(segment => {
      totalPoints += segment.points.length;
    });

    // 現在の位置に対応するポイントのインデックスを計算
    const targetIndex = Math.floor(currentPosition * totalPoints);

    // セグメントとポイントのインデックスを特定
    let pointCounter = 0;
    for (let segmentIndex = 0; segmentIndex < path.segments.length; segmentIndex++) {
      const segment = path.segments[segmentIndex];
      if (pointCounter + segment.points.length > targetIndex) {
        // このセグメント内にターゲットポイントがある
        const pointIndex = targetIndex - pointCounter;
        return { segmentIndex, pointIndex };
      }
      pointCounter += segment.points.length;
    }

    // 最後のポイントを返す
    if (path.segments.length > 0) {
      const lastSegmentIndex = path.segments.length - 1;
      const lastPointIndex = path.segments[lastSegmentIndex].points.length - 1;
      return { segmentIndex: lastSegmentIndex, pointIndex: lastPointIndex };
    }

    return null;
  }, [path]);

  // 衛星の位置を更新
  const updateSatellitePosition = useCallback((time: Date) => {
    const pointIndex = findClosestPointIndex(time);

    if (pointIndex) {
      const { segmentIndex, pointIndex: pIndex } = pointIndex;
      const point = path.segments[segmentIndex].points[pIndex];
      const effectiveAngle = path.segments[segmentIndex].effectiveAngles[pIndex];

      if (point && point.lat !== undefined && point.lng !== undefined) {
        // マーカーがまだ作成されていない場合は作成
        if (!satelliteMarkerRef.current) {
          satelliteMarkerRef.current = L.marker([point.lat, point.lng], {
            icon: satelliteIcon,
            zIndexOffset: 1000 // 他のマーカーより前面に表示
          }).addTo(map);

          // ポップアップを設定
          satelliteMarkerRef.current.bindPopup(`
            <b>衛星位置情報</b><br>
            時刻: ${time.toLocaleString()}<br>
            実効的な角度: ${effectiveAngle.toFixed(2)}°
          `);
        } else {
          // マーカーの位置を更新
          satelliteMarkerRef.current.setLatLng([point.lat, point.lng]);

          // ポップアップの内容を更新
          satelliteMarkerRef.current.setPopupContent(`
            <b>衛星位置情報</b><br>
            時刻: ${time.toLocaleString()}<br>
            実効的な角度: ${effectiveAngle.toFixed(2)}°
          `);
        }

        // 位置情報を親コンポーネントに通知
        if (onPositionUpdate) {
          onPositionUpdate({
            lat: point.lat,
            lng: point.lng,
            elevation: effectiveAngle, // 実効的な角度を仰角として使用
            azimuth: 0, // 方位角は計算できないため0とする
            range: 0 // 距離は計算できないため0とする
          });
        }
      }
    }
  }, [map, satelliteIcon, findClosestPointIndex, path, onPositionUpdate]);

  // アニメーションフレームの処理
  const animate = useCallback(() => {
    if (isPlaying) {
      // 現在時刻を更新（再生速度に応じて）
      const newTime = new Date(currentTime.getTime() + 1000 * playbackSpeed);

      // 状態を更新
      setAnimationState(prev => ({
        ...prev,
        currentTime: newTime
      }));

      // 衛星位置を更新
      updateSatellitePosition(newTime);

      // 次のフレームをリクエスト
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, currentTime, playbackSpeed, updateSatellitePosition, setAnimationState]);

  // 再生状態が変わったときの処理
  useEffect(() => {
    if (isPlaying) {
      // アニメーション開始
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (animationFrameRef.current) {
      // アニメーション停止
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    return () => {
      // コンポーネントのクリーンアップ時にアニメーションを停止
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, animate]);

  // 現在時刻が変わったときの処理（シーク操作など）
  useEffect(() => {
    // 衛星位置を更新
    updateSatellitePosition(currentTime);
  }, [currentTime, updateSatellitePosition]);

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      // マーカーを削除
      if (satelliteMarkerRef.current) {
        satelliteMarkerRef.current.remove();
        satelliteMarkerRef.current = null;
      }
    };
  }, []);

  return null;
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

// 再生コントロールコンポーネント
interface PlaybackControlsProps {
  animationState: AnimationState;
  onPlayPause: () => void;
  onSeek: (time: Date) => void;
  onSpeedChange: (speed: number) => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  animationState,
  onPlayPause,
  onSeek,
  onSpeedChange
}) => {
  const { isPlaying, currentTime, startTime, endTime, playbackSpeed } = animationState;

  // 現在時刻のスライダー値（ミリ秒）
  const currentTimeValue = currentTime.getTime();
  const startTimeValue = startTime.getTime();
  const endTimeValue = endTime.getTime();

  // 時間をフォーマットする関数
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // 速度変更ハンドラー
  const handleSpeedChange = (event: SelectChangeEvent<number>) => {
    onSpeedChange(Number(event.target.value));
  };

  return (
    <Paper
      sx={{
        padding: '10px',
        backgroundColor: 'rgba(240, 240, 255, 0.95)', // 薄い青色の背景
        borderRadius: '8px', // より丸みを帯びた角
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)', // より強い影
        border: '1px solid rgba(0, 0, 100, 0.1)', // 薄い青色のボーダー
        width: '100%',
        flexGrow: 1,
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
        衛星軌道アニメーション
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <IconButton onClick={onPlayPause} color="primary" size="small">
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>

        <Typography variant="body2" sx={{ ml: 1, minWidth: '80px' }}>
          {formatTime(currentTime)}
        </Typography>

        <FormControl size="small" sx={{ ml: 'auto', minWidth: '100px' }}>
          <Select
            value={playbackSpeed}
            onChange={handleSpeedChange}
            variant="outlined"
            size="small"
          >
            <MenuItem value={1}>1倍速</MenuItem>
            <MenuItem value={5}>5倍速</MenuItem>
            <MenuItem value={10}>10倍速</MenuItem>
            <MenuItem value={60}>60倍速</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Slider
        value={currentTimeValue}
        min={startTimeValue}
        max={endTimeValue}
        onChange={(_, value) => {
          onSeek(new Date(value as number));
        }}
        valueLabelDisplay="auto"
        valueLabelFormat={value => formatTime(new Date(value as number))}
        sx={{ mt: 1 }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption">{formatTime(startTime)}</Typography>
        <Typography variant="caption">{formatTime(endTime)}</Typography>
      </Box>
    </Paper>
  );
};

// 衛星位置情報パネルコンポーネント
interface SatelliteInfoPanelProps {
  satellitePosition: AnimationState['currentPosition'];
  currentTime: Date;
}

const SatelliteInfoPanel: React.FC<SatelliteInfoPanelProps> = ({
  satellitePosition,
  currentTime
}) => {
  if (!satellitePosition) return null;

  return (
    <Paper
      sx={{
        padding: '10px',
        backgroundColor: 'rgba(240, 240, 255, 0.95)', // 薄い青色の背景
        borderRadius: '8px', // より丸みを帯びた角
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)', // より強い影
        border: '1px solid rgba(0, 0, 100, 0.1)', // 薄い青色のボーダー
        width: '100%',
        flexGrow: 1,
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
        衛星位置情報
      </Typography>
      <Typography variant="body2">
        時刻: {currentTime.toLocaleString()}<br />
        緯度: {satellitePosition.lat.toFixed(6)}°<br />
        経度: {satellitePosition.lng.toFixed(6)}°<br />
        仰角: {satellitePosition.elevation.toFixed(2)}°<br />
        方位角: {satellitePosition.azimuth.toFixed(2)}°<br />
        距離: {satellitePosition.range.toFixed(2)}km
      </Typography>
    </Paper>
  );
};

const Map: React.FC<MapProps> = ({
  center = { lat: 35.6812, lng: 139.7671 }, // デフォルト: 東京
  onLocationSelect,
  orbitPaths = [],
  filters,
  satellites = [],
}) => {
  // 最低仰角の値（デフォルト10度）
  const minElevation = filters?.minElevation ?? 10;

  // デフォルトのズームレベル（日本全体が見えるレベル）
  const defaultZoom = 5;

  // マップインスタンスを保持するための状態
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  // 凡例の表示/非表示を管理する状態
  const [showLegend, setShowLegend] = useState(true);

  // 情報パネルの表示/非表示を管理する状態
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  // アニメーション状態
  const [animationState, setAnimationState] = useState<AnimationState>({
    isPlaying: false,
    currentTime: filters?.startDate || new Date(),
    startTime: filters?.startDate || new Date(),
    endTime: filters?.endDate || new Date(Date.now() + 24 * 60 * 60 * 1000), // デフォルトは24時間後
    playbackSpeed: 10, // デフォルトは10倍速
  });

  // 衛星位置情報
  const [satellitePosition, setSatellitePosition] = useState<AnimationState['currentPosition']>();

  // 再生/停止の切り替え
  const handlePlayPause = useCallback(() => {
    setAnimationState(prev => ({
      ...prev,
      isPlaying: !prev.isPlaying
    }));
  }, []);

  // シーク（特定時間に移動）
  const handleSeek = useCallback((time: Date) => {
    setAnimationState(prev => ({
      ...prev,
      currentTime: time
    }));
  }, []);

  // 再生速度の変更
  const handleSpeedChange = useCallback((speed: number) => {
    setAnimationState(prev => ({
      ...prev,
      playbackSpeed: speed
    }));
  }, []);

  // 衛星位置の更新
  const handlePositionUpdate = useCallback((position: AnimationState['currentPosition']) => {
    setSatellitePosition(position);
  }, []);

  // 凡例の表示/非表示を切り替えるハンドラー
  const handleToggleLegend = useCallback(() => {
    setShowLegend(prev => !prev);
  }, []);

  // 情報パネルの表示/非表示を切り替えるハンドラー
  const handleToggleInfoPanel = useCallback(() => {
    setShowInfoPanel(prev => !prev);
  }, []);

  // 衛星データから軌道種類ごとの高度を集計
  const orbitTypes = React.useMemo(() => {
    const aggregated = aggregateOrbitHeights(satellites);
    // 集計結果がない場合はデフォルト値を使用
    return aggregated.length > 0 ? aggregated : DEFAULT_ORBIT_TYPES;
  }, [satellites]);

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
    <>
      <MapWrapper>
        {/* MapControlsコンポーネントをMapContainerの外に配置 */}
        <MapControls
          map={mapInstance}
          currentCenter={center}
          defaultZoom={defaultZoom}
          showLegend={showLegend}
          onToggleLegend={handleToggleLegend}
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
          {orbitPaths.length > 0 && (
            <>
              <OrbitLayer paths={orbitPaths} />
              {/* 選択された軌道パスの衛星アニメーション */}
              <SatelliteAnimation
                path={orbitPaths[0]} // 最初の軌道パスを使用
                animationState={animationState}
                setAnimationState={setAnimationState}
                onPositionUpdate={handlePositionUpdate}
              />
            </>
          )}
        </MapContainer>
      </MapWrapper>

      {/* 情報パネル表示切り替えボタン */}
      {orbitPaths.length > 0 && (
        <ToggleButtonContainer>
          <Button
            variant="contained"
            color={showInfoPanel ? "primary" : "secondary"}
            size="small"
            onClick={handleToggleInfoPanel}
            startIcon={showInfoPanel ? <VisibilityOffIcon /> : <VisibilityIcon />}
          >
            {showInfoPanel ? "情報パネルを隠す" : "情報パネルを表示"}
          </Button>
        </ToggleButtonContainer>
      )}

      {/* 地図の下に情報パネルを配置（showInfoPanelがtrueの場合のみ表示） */}
      {orbitPaths.length > 0 && showInfoPanel && (
        <InfoPanelContainer>
          {/* 再生コントロールパネル */}
          <PlaybackControls
            animationState={animationState}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onSpeedChange={handleSpeedChange}
          />

          {/* 衛星位置情報パネル */}
          {satellitePosition && (
            <SatelliteInfoPanel
              satellitePosition={satellitePosition}
              currentTime={animationState.currentTime}
            />
          )}
        </InfoPanelContainer>
      )}
    </>
  );
};

export default Map;

import React, { useState, useCallback, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import { Box, Button } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LegendToggleIcon from '@mui/icons-material/LegendToggle';
import type { Location, OrbitPath, SearchFilters } from '@/types';

// コンポーネントのインポート
import MapView from './MapView';
import ZoomControls from './controls/ZoomControls';
import ViewControls from './controls/ViewControls';
import LayerControls from './controls/LayerControls';
import ObserverMarkerLayer from './layers/ObserverMarkerLayer';
import VisibilityCircleLayer from './layers/VisibilityCircleLayer';
import SatelliteOrbitLayer from './layers/SatelliteOrbitLayer';
import LegendPanel from './panels/LegendPanel';
import SatelliteInfoPanel from './panels/SatelliteInfoPanel';
import AnimationControlPanel from './panels/AnimationControlPanel';
import { AnimationState } from './panels/AnimationControlPanel';
import { OrbitType, DEFAULT_ORBIT_TYPES } from './layers/VisibilityCircleLayer';
import { MapLayer } from './controls/LayerControls';

// スタイル付きコンポーネント
const MapWrapper = styled('div')({
  width: '100%',
  height: '500px',
  borderRadius: '8px',
  overflow: 'hidden',
  position: 'relative', // 子要素の絶対位置指定の基準にする
  marginBottom: '10px', // コントロールパネル用のスペースを確保
});

// 情報パネル表示切り替えボタン用のスタイル
const ToggleButtonContainer = styled('div')({
  position: 'absolute',
  bottom: '10px',
  right: '120px', // 凡例の左側に配置
  zIndex: 1100,
});

// マップコンポーネントのプロパティ
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

/**
 * 地図コンポーネント
 * 地図の表示と各種コントロール、レイヤー、情報パネルを統合
 */
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

  // 表示/非表示の状態管理
  const [showLegend, setShowLegend] = useState(true);
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

  // レイヤー管理
  const [layers, setLayers] = useState<MapLayer[]>([
    {
      id: 'observer-marker',
      name: '観測地点',
      description: '選択された観測地点を表示します',
      isVisible: true,
      icon: null,
      color: '#1976d2',
    },
    {
      id: 'visibility-circles',
      name: '可視範囲',
      description: '各軌道種類の衛星が見える範囲を表示します',
      isVisible: true,
      icon: null,
      color: '#4caf50',
    },
    {
      id: 'orbit-paths',
      name: '軌道パス',
      description: '選択された衛星の軌道を表示します',
      isVisible: true,
      icon: null,
      color: '#f44336',
    },
  ]);

  // レイヤーの表示/非表示を切り替える
  const handleLayerToggle = useCallback((layerId: string) => {
    setLayers(prevLayers =>
      prevLayers.map(layer =>
        layer.id === layerId ? { ...layer, isVisible: !layer.isVisible } : layer
      )
    );
  }, []);

  // 凡例の表示/非表示を切り替えるハンドラー
  const handleToggleLegend = useCallback(() => {
    setShowLegend(prev => !prev);
  }, []);

  // 情報パネルの表示/非表示を切り替えるハンドラー
  const handleToggleInfoPanel = useCallback(() => {
    setShowInfoPanel(prev => !prev);
  }, []);

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

  // 衛星データから軌道種類ごとの高度を集計
  const orbitTypes = useMemo(() => {
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
        let color = '#808080'; // デフォルト色

        // 軌道種類に応じて色を設定
        switch (type) {
          case 'LEO': color = '#FF0000'; break; // 赤
          case 'MEO': color = '#00FF00'; break; // 緑
          case 'GEO': color = '#0000FF'; break; // 青
          case 'HEO': color = '#FFA500'; break; // オレンジ
        }

        result.push({
          name: type,
          height: avgHeight,
          color
        });
      }
    });

    // 高度の高い順にソート
    return result.sort((a, b) => b.height - a.height);
  }, [satellites]);

  // 各レイヤーの表示状態を取得
  const isLayerVisible = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    return layer ? layer.isVisible : false;
  }, [layers]);

  return (
    <>
      <MapWrapper>
        <MapView center={center} zoom={defaultZoom}>
          {/* コントロール */}
          <ZoomControls position="topright" />
          <ViewControls
            position="topright"
            currentCenter={center}
            defaultZoom={defaultZoom}
          />
          <LayerControls
            position="topright"
            layers={layers}
            onLayerToggle={handleLayerToggle}
          />

          {/* レイヤー */}
          {isLayerVisible('observer-marker') && center && (
            <ObserverMarkerLayer center={center} />
          )}
          {isLayerVisible('visibility-circles') && center && (
            <VisibilityCircleLayer
              center={center}
              minElevation={minElevation}
              orbitTypes={orbitTypes.length > 0 ? orbitTypes : DEFAULT_ORBIT_TYPES}
            />
          )}
          {isLayerVisible('orbit-paths') && orbitPaths.length > 0 && (
            <SatelliteOrbitLayer paths={orbitPaths} />
          )}

          {/* 情報パネル */}
          {showLegend && (
            <LegendPanel
              position="bottomright"
              minElevation={minElevation}
              orbitTypes={orbitTypes.length > 0 ? orbitTypes : DEFAULT_ORBIT_TYPES}
            />
          )}
          {showInfoPanel && orbitPaths.length > 0 && (
            <>
              <AnimationControlPanel
                position="bottom"
                animationState={animationState}
                onPlayPause={handlePlayPause}
                onSeek={handleSeek}
                onSpeedChange={handleSpeedChange}
              />
              {satellitePosition && (
                <SatelliteInfoPanel
                  position="bottomleft"
                  satellite={orbitPaths[0]?.satelliteId ? { id: orbitPaths[0].satelliteId } as any : undefined}
                  currentPosition={satellitePosition}
                  currentTime={animationState.currentTime}
                />
              )}
            </>
          )}
        </MapView>

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

        {/* 凡例表示切り替えボタン */}
        <Box
          sx={{
            position: 'absolute',
            top: '10px',
            right: '200px',
            zIndex: 1100,
          }}
        >
          <Button
            variant="contained"
            color={showLegend ? "primary" : "secondary"}
            size="small"
            onClick={handleToggleLegend}
            startIcon={<LegendToggleIcon />}
          >
            {showLegend ? "凡例を隠す" : "凡例を表示"}
          </Button>
        </Box>
      </MapWrapper>
    </>
  );
};

export default Map;

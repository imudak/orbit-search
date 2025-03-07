import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { Box, Button, useTheme, useMediaQuery } from '@mui/material';
import type { Location, OrbitPath, SearchFilters } from '@/types';

// コンポーネントのインポート
import MapView from './MapView';
import MobileControls from './controls/MobileControls';
import MapControlIcons from './controls/MapControlIcons';
import ResponsiveMapLayout from './layout/ResponsiveMapLayout';
import ObserverMarkerLayer from './layers/ObserverMarkerLayer';
import VisibilityCircleLayer from './layers/VisibilityCircleLayer';
import SatelliteOrbitLayer from './layers/SatelliteOrbitLayer';
import SatelliteAnimationLayer from './layers/SatelliteAnimationLayer';
import LegendPanel from './panels/LegendPanel';
import SatelliteInfoPanel from './panels/SatelliteInfoPanel';
import AnimationControlPanel from './panels/AnimationControlPanel';
import { AnimationState } from './panels/AnimationControlPanel';
import { OrbitType, DEFAULT_ORBIT_TYPES } from './layers/VisibilityCircleLayer';
import { MapLayer } from './controls/LayerControls';
import { LayerProvider, useLayerManager, LayerRenderer } from './layers/LayerManager';
import MapModeSelectorDefault, { ModeProvider, useMapMode, ModeRenderer, MapMode } from './modes/MapModeSelector';
const MapModeSelector = MapModeSelectorDefault.MapModeSelector;
import AnalysisPanel from './modes/AnalysisPanel';

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
  selectedSatellite?: any; // 選択された衛星
}

/**
 * 内部マップコンポーネント
 * LayerManagerのコンテキスト内で使用される
 */
interface InnerMapProps {
  center: Location;
  defaultZoom: number;
  minElevation: number;
  orbitTypes: OrbitType[];
  orbitPaths: OrbitPath[];
  animationState: AnimationState;
  satellitePosition?: AnimationState['currentPosition'];
  handlePlayPause: () => void;
  handleSeek: (time: Date) => void;
  handleSpeedChange: (speed: number) => void;
  handlePositionUpdate: (position: AnimationState['currentPosition']) => void;
}

/**
 * 基本的なマップコンポーネント
 * レイヤーの表示を担当
 */
const InnerMap: React.FC<InnerMapProps> = ({
  center,
  defaultZoom,
  minElevation,
  orbitTypes,
  orbitPaths,
  animationState,
  satellitePosition,
  handlePositionUpdate,
}) => {
  // レイヤー管理コンテキストを使用
  const { layers, toggleLayer } = useLayerManager();

  // レスポンシブ対応のためのメディアクエリ
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <MapView center={center} zoom={defaultZoom}>
      {/* デスクトップ用コントロール（モバイルでは非表示） */}
      {!isMobile && (
        <>
          <MapControlIcons
            position="topright"
            currentCenter={center}
            defaultZoom={defaultZoom}
          />
          <MapModeSelector position="topleft" />
        </>
      )}

      {/* レイヤー */}
      <LayerRenderer layerId="observer-marker">
        {center && <ObserverMarkerLayer center={center} />}
      </LayerRenderer>

      <LayerRenderer layerId="visibility-circles">
        {center && (
          <VisibilityCircleLayer
            center={center}
            minElevation={minElevation}
            orbitTypes={orbitTypes.length > 0 ? orbitTypes : DEFAULT_ORBIT_TYPES}
          />
        )}
      </LayerRenderer>

      <LayerRenderer layerId="orbit-paths">
        {orbitPaths.length > 0 && <SatelliteOrbitLayer paths={orbitPaths} />}
      </LayerRenderer>

      {/* 衛星アニメーション */}
      <LayerRenderer layerId="satellite-animation">
        {orbitPaths.length > 0 && (
          <SatelliteAnimationLayer
            path={orbitPaths[0]}
            animationState={animationState}
            onPositionUpdate={handlePositionUpdate}
          />
        )}
      </LayerRenderer>

      {/* 凡例を地図上にオーバーレイ */}
      <LegendPanel
        minElevation={minElevation}
        orbitTypes={orbitTypes}
      />
    </MapView>
  );
};

/**
 * モード対応のマップコンポーネント
 * モードに応じたパネルの表示を担当
 */
const InnerMapWithModes: React.FC<InnerMapProps> = (props) => {
  // モード管理コンテキストを使用
  const { currentMode } = useMapMode();

  return (
    <>
      <InnerMap {...props} handlePositionUpdate={props.handlePositionUpdate} />

      {/* モードに応じたパネルを表示 */}
      <ModeRenderer mode={MapMode.ANIMATION}>
        {props.orbitPaths.length > 0 && (
          <AnimationControlPanel
            position="bottomleft"
            animationState={props.animationState}
            onPlayPause={props.handlePlayPause}
            onSeek={props.handleSeek}
            onSpeedChange={props.handleSpeedChange}
          />
        )}
      </ModeRenderer>

      <ModeRenderer mode={MapMode.ANALYSIS}>
        <AnalysisPanel
          position="bottom"
          orbitPaths={props.orbitPaths}
        />
      </ModeRenderer>

      {/* 情報パネル表示切り替えボタンは削除 - UnifiedControlPanelに統合 */}
    </>
  );
};

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
  selectedSatellite,
}) => {
  // 最低仰角の値（デフォルト10度）
  const minElevation = filters?.minElevation ?? 10;

  // デフォルトのズームレベル（日本全体が見えるレベル）
  const defaultZoom = 5;

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

  // アニメーション用の衛星位置更新
  useEffect(() => {
    if (orbitPaths.length > 0 && animationState.isPlaying) {
      const interval = setInterval(() => {
        // 現在時刻を更新（再生速度に応じて）
        // 再生速度を10倍に増加
        const newTime = new Date(animationState.currentTime.getTime() + 10000 * animationState.playbackSpeed);

        // 状態を更新
        setAnimationState(prev => ({
          ...prev,
          currentTime: newTime
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [orbitPaths, animationState.isPlaying, animationState.currentTime, animationState.playbackSpeed]);

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

  // レスポンシブ対応のためのメディアクエリ
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <ModeProvider>
      <LayerProvider>
        <ResponsiveMapLayout
          controls={
            isMobile ? (
              <MobileControls
                currentCenter={center}
                defaultZoom={defaultZoom}
              />
            ) : null
          }
          satelliteInfo={
            <SatelliteInfoPanel
              satellite={selectedSatellite}
              currentPosition={satellitePosition}
              currentTime={animationState.currentTime}
              animationState={animationState}
              satelliteId={orbitPaths[0]?.satelliteId}
              center={center}
              orbitPaths={orbitPaths}
              mapCenter={center}
              mapZoom={defaultZoom}
            />
          }
        >
          <InnerMapWithModes
            center={center}
            defaultZoom={defaultZoom}
            minElevation={minElevation}
            orbitTypes={orbitTypes}
            orbitPaths={orbitPaths}
            animationState={animationState}
            satellitePosition={satellitePosition}
            handlePlayPause={handlePlayPause}
            handleSeek={handleSeek}
            handleSpeedChange={handleSpeedChange}
            handlePositionUpdate={handlePositionUpdate}
          />
        </ResponsiveMapLayout>
      </LayerProvider>
    </ModeProvider>
  );
};

export default Map;

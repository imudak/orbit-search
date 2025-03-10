import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { Box, Button, useTheme, useMediaQuery, Snackbar, Alert, Fade } from '@mui/material';
import type { Location, OrbitPath, SearchFilters } from '@/types';

// コンポーネントのインポート
import MapView from './MapView';
import MapClickHandler from './MapClickHandler';
import MobileControls from './controls/MobileControls';
import MapControlIcons from './controls/MapControlIcons';
import ResponsiveMapLayout from './layout/ResponsiveMapLayout';
import ObserverMarkerLayer from './layers/ObserverMarkerLayer';
import VisibilityCircleLayer from './layers/VisibilityCircleLayer';
import SatelliteOrbitLayer from './layers/SatelliteOrbitLayer';
import SatelliteAnimationLayer from './layers/SatelliteAnimationLayer';
import SatelliteInfoPanel from './panels/SatelliteInfoPanel';
import LayerSettingsPanel from './panels/LayerSettingsPanel';
import AnimationControlPanel from './panels/AnimationControlPanel';
import { AnimationState } from './panels/AnimationControlPanel';
import { OrbitType, DEFAULT_ORBIT_TYPES } from './layers/VisibilityCircleLayer';
import { LayerProvider, useLayerManager, LayerRenderer, MapLayer } from './layers/LayerManager';
import MapModeSelectorDefault, { ModeProvider, useMapMode, ModeRenderer, MapMode } from './modes/MapModeSelector';
const MapModeSelector = MapModeSelectorDefault.MapModeSelector;
import AnalysisPanel from './modes/AnalysisPanel';
import NormalPanel from './modes/NormalPanel';
import AnimationPanel from './modes/AnimationPanel';

// パネル表示状態の型定義
interface PanelState {
  info: boolean;      // 衛星情報パネル
  modePanel: boolean; // 各モードのパネル
  legend: boolean;
  layerSettings: boolean; // レイヤー設定パネル
}

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
  panelState: PanelState;
  onToggleInfo: () => void;
  onToggleModePanel: () => void;
  onToggleLegend: () => void;
  onToggleLayerSettings: () => void;
  onLocationSelect: (location: Location) => void; // 地図クリック時の位置選択ハンドラー
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
  panelState,
  onToggleInfo,
  onToggleModePanel,
  onToggleLegend,
  onToggleLayerSettings,
  onLocationSelect
}) => {
  // レイヤー管理コンテキストを使用
  const { layers, toggleLayer } = useLayerManager();
  // モード管理コンテキストを使用
  const { currentMode } = useMapMode();

  // レスポンシブ対応のためのメディアクエリ
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <MapView center={center} zoom={defaultZoom}>
      {/* 地図クリックイベントハンドラー */}
      <MapClickHandler onLocationSelect={onLocationSelect} />

      {/* デスクトップ用コントロール（モバイルでは非表示） */}
      {!isMobile && (
        <>
          <MapControlIcons
            position="topright"
            currentCenter={center}
            defaultZoom={defaultZoom}
            onToggleInfo={onToggleInfo}
            onToggleModePanel={onToggleModePanel}
            onToggleLayerSettings={onToggleLayerSettings}
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
        {orbitPaths.length > 0 && <SatelliteOrbitLayer paths={orbitPaths} observerLocation={center} />}
      </LayerRenderer>

      {/* 衛星アニメーション - アニメーションモードでのみ表示 */}
      <LayerRenderer layerId="satellite-animation">
        {orbitPaths.length > 0 && currentMode === MapMode.ANIMATION && (
          <SatelliteAnimationLayer
            path={orbitPaths[0]}
            animationState={animationState}
            onPositionUpdate={handlePositionUpdate}
          />
        )}
      </LayerRenderer>

      {/* 衛星情報パネル（凡例情報も含む） */}
      <SatelliteInfoPanel
        position="center"
        satellite={orbitPaths.length > 0 ? { name: orbitPaths[0].satelliteId } as any : undefined}
        currentPosition={satellitePosition}
        currentTime={animationState.currentTime}
        animationState={animationState}
        satelliteId={orbitPaths[0]?.satelliteId}
        center={center}
        orbitPaths={orbitPaths}
        mapCenter={center}
        mapZoom={defaultZoom}
        isOpen={panelState.info}
        onClose={onToggleInfo}
        // 凡例関連のプロパティ
        minElevation={minElevation}
        orbitTypes={orbitTypes}
        showLegend={panelState.legend}
        onToggleLegend={onToggleLegend}
      />

      {/* レイヤー設定パネル */}
      <LayerSettingsPanel
        position="topright"
        isOpen={panelState.layerSettings}
        onClose={onToggleLayerSettings}
      />

      {/* 通常モードパネル */}
      <ModeRenderer mode={MapMode.NORMAL}>
        <NormalPanel
          position="bottomleft"
          center={center}
          orbitPaths={orbitPaths}
          isOpen={panelState.modePanel}
          onClose={onToggleModePanel}
        />
      </ModeRenderer>

      {/* アニメーションモードパネル */}
      <ModeRenderer mode={MapMode.ANIMATION}>
        <AnimationPanel
          position="topleft"
          orbitPaths={orbitPaths}
          animationState={animationState}
          satellitePosition={satellitePosition}
          isOpen={panelState.modePanel}
          onClose={onToggleModePanel}
        />
      </ModeRenderer>
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
      <InnerMap
        {...props}
        handlePositionUpdate={props.handlePositionUpdate}
        panelState={props.panelState}
        onToggleInfo={props.onToggleInfo}
        onToggleModePanel={props.onToggleModePanel}
        onToggleLegend={props.onToggleLegend}
        onToggleLayerSettings={props.onToggleLayerSettings}
        onLocationSelect={props.onLocationSelect}
      />

      {/* モードに応じたコントロールパネルを表示 */}
      <ModeRenderer mode={MapMode.ANIMATION}>
        {props.orbitPaths.length > 0 && (
          <AnimationControlPanel
            position="bottomright"
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
          isOpen={props.panelState?.modePanel}
          onClose={props.onToggleModePanel}
        />
      </ModeRenderer>
    </>
  );
};

/**
 * 内部地図コンポーネント
 * ModeProviderの内部で使用される
 */
const MapWithModeContext: React.FC<MapProps> = ({
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

  // パネル表示状態
  const [panelState, setPanelState] = useState<PanelState>({
    info: false,
    modePanel: false,  // モードパネルは初期非表示に変更
    legend: false,
    layerSettings: false
  });

  // パネル表示切替ハンドラー
  const handleToggleInfo = useCallback(() => {
    setPanelState(prev => ({ ...prev, info: !prev.info }));
  }, []);

  const handleToggleModePanel = useCallback(() => {
    setPanelState(prev => ({ ...prev, modePanel: !prev.modePanel }));
  }, []);

  const handleToggleLegend = useCallback(() => {
    setPanelState(prev => ({ ...prev, legend: !prev.legend }));
  }, []);

  const handleToggleLayerSettings = useCallback(() => {
    setPanelState(prev => ({
      ...prev,
      layerSettings: !prev.layerSettings
    }));
  }, []);

  // モード変更通知
  const [modeChangeNotification, setModeChangeNotification] = useState<{
    open: boolean;
    mode: MapMode;
  }>({
    open: false,
    mode: MapMode.NORMAL
  });

  // モード管理コンテキストを使用
  const { currentMode, setMode } = useMapMode();

  // モード変更時の処理
  useEffect(() => {
    // アニメーションモードに初めて切り替えたときのみ自動再生する
    // シーク操作後は自動再生しない
    if (currentMode === MapMode.ANIMATION && !animationState.isPlaying && orbitPaths.length > 0) {
      // モード変更時のみ自動再生する（シーク操作後は自動再生しない）
      if (modeChangeNotification.mode !== MapMode.ANIMATION) {
        // 少し遅延させて自動再生（UIが表示された後に再生開始）
        const timer = setTimeout(() => {
          setAnimationState(prev => ({
            ...prev,
            isPlaying: true
          }));
        }, 1000);
        return () => clearTimeout(timer);
      }
    }

    // アニメーションモードから他のモードに切り替えたとき、アニメーションを停止
    if (currentMode !== MapMode.ANIMATION && animationState.isPlaying) {
      setAnimationState(prev => ({
        ...prev,
        isPlaying: false
      }));
    }

    // モード変更通知を表示
    setModeChangeNotification({
      open: true,
      mode: currentMode
    });

    // 3秒後に通知を非表示
    const timer = setTimeout(() => {
      setModeChangeNotification(prev => ({
        ...prev,
        open: false
      }));
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentMode, animationState.isPlaying, orbitPaths.length]);

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
        const newTime = new Date(animationState.currentTime.getTime() + 10000 * animationState.playbackSpeed);

        // 終了時刻を超えた場合は最初に戻る
        if (newTime > animationState.endTime) {
          setAnimationState(prev => ({
            ...prev,
            currentTime: prev.startTime,
            isPlaying: false // 最後まで再生したら停止
          }));
        } else {
          // 状態を更新
          setAnimationState(prev => ({
            ...prev,
            currentTime: newTime
          }));
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [orbitPaths, animationState.isPlaying, animationState.currentTime, animationState.playbackSpeed, animationState.endTime, animationState.startTime]);

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

  // モード変更通知のメッセージ
  const getModeChangeMessage = (mode: MapMode) => {
    switch (mode) {
      case MapMode.NORMAL:
        return '通常モードに切り替えました。基本的な衛星情報を表示します。';
      case MapMode.ANIMATION:
        return 'アニメーションモードに切り替えました。衛星の軌道をアニメーションで確認できます。';
      case MapMode.ANALYSIS:
        return '分析モードに切り替えました。衛星の軌道を詳細に分析できます。';
      default:
        return 'モードを切り替えました。';
    }
  };

  // モード変更通知の色
  const getModeChangeColor = (mode: MapMode) => {
    switch (mode) {
      case MapMode.NORMAL:
        return 'info';
      case MapMode.ANIMATION:
        return 'primary';
      case MapMode.ANALYSIS:
        return 'success';
      default:
        return 'info';
    }
  };

  return (
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
        // satelliteInfoプロパティは削除（InnerMapコンポーネント内で直接表示）
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
          panelState={panelState}
          onToggleInfo={handleToggleInfo}
          onToggleModePanel={handleToggleModePanel}
          onToggleLegend={handleToggleLegend}
          onToggleLayerSettings={handleToggleLayerSettings}
          onLocationSelect={onLocationSelect}
        />

        {/* モード変更通知 */}
        <Snackbar
          open={modeChangeNotification.open}
          autoHideDuration={3000}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          TransitionComponent={Fade}
        >
          <Alert
            severity={getModeChangeColor(modeChangeNotification.mode) as any}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {getModeChangeMessage(modeChangeNotification.mode)}
          </Alert>
        </Snackbar>
      </ResponsiveMapLayout>
    </LayerProvider>
  );
};

/**
 * 地図コンポーネント
 * 地図の表示と各種コントロール、レイヤー、情報パネルを統合
 */
const Map: React.FC<MapProps> = (props) => {
  return (
    <ModeProvider>
      <MapWithModeContext {...props} />
    </ModeProvider>
  );
};

export default Map;

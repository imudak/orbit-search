import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { Box, Button, useTheme, useMediaQuery, Snackbar, Alert, Fade } from '@mui/material';
import type { Location, OrbitPath, SearchFilters } from '@/types';

// コンポーネントのインポート
import MapView from './MapView';
import MapClickHandler from './MapClickHandler';
import MinimalControls from './controls/MinimalControls';
import ResponsiveMapLayout from './layout/ResponsiveMapLayout';
import TabPanel from './panels/TabPanel';
import ObserverMarkerLayer from './layers/ObserverMarkerLayer';
import VisibilityCircleLayer from './layers/VisibilityCircleLayer';
import SatelliteOrbitLayer from './layers/SatelliteOrbitLayer';
import SatelliteAnimationLayer from './layers/SatelliteAnimationLayer';
import SatelliteInfoPanel from './panels/SatelliteInfoPanel';
import AnimationControlPanel from './panels/AnimationControlPanel';
import { AnimationState } from './panels/AnimationControlPanel';
import { OrbitType, DEFAULT_ORBIT_TYPES } from './layers/VisibilityCircleLayer';
import { LayerProvider, useLayerManager, LayerRenderer } from './layers/LayerManager';
import SearchPanel from '@/components/SearchPanel';
import SatelliteList from '@/components/SatelliteList';

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
  onFiltersChange?: (filters: SearchFilters) => void;
  onSatelliteSelect?: (satellite: any) => void;
  onTLEDownload?: (satellite: any) => void;
  onObservationDataRequest?: (satellite: any) => void;
  isLoading?: boolean;
}

/**
 * 人間工学に基づいた地図コンポーネント
 * 2ペインレイアウトとタブ方式のパネルを採用
 */
const Map: React.FC<MapProps> = ({
  center = { lat: 35.6812, lng: 139.7671 }, // デフォルト: 東京
  onLocationSelect,
  orbitPaths = [],
  filters = {
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    minElevation: 10,
    location: { lat: 35.6812, lng: 139.7671 } // デフォルト: 東京
  },
  satellites = [],
  selectedSatellite,
  onFiltersChange = () => {},
  onSatelliteSelect = () => {},
  onTLEDownload = () => {},
  onObservationDataRequest = () => {},
  isLoading = false,
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

  // レイヤー管理コンテキストを使用
  const { layers, toggleLayer } = useLayerManager();

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

  // 検索パネルコンポーネント
  const searchTabContent = (
    <>
      <SearchPanel
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
      <SatelliteList
        satellites={satellites.map(s => ({ ...s, passes: [] })) as any}
        onTLEDownload={onTLEDownload}
        onObservationDataRequest={onObservationDataRequest}
        onSatelliteSelect={onSatelliteSelect}
        selectedSatellite={selectedSatellite}
        isLoading={isLoading}
        searchPanel={null} // 検索パネルは別途表示するため不要
      />
    </>
  );

  // 情報パネルコンポーネント
  const infoTabContent = (
    <SatelliteInfoPanel
      satellite={selectedSatellite}
      currentPosition={satellitePosition}
      currentTime={animationState.currentTime}
      center={center}
      orbitPaths={orbitPaths}
      minElevation={minElevation}
      orbitTypes={orbitTypes}
      isOpen={true} // タブパネル内では常に表示
    />
  );

  // 軌道タブコンポーネント
  const orbitTabContent = (
    <Box sx={{ p: 2 }}>
      <AnimationControlPanel
        animationState={animationState}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        onSpeedChange={handleSpeedChange}
        position="bottomleft" // 左下に配置
      />
    </Box>
  );

  // 分析タブコンポーネント
  const analysisTabContent = (
    <Box sx={{ p: 2 }}>
      {orbitPaths.length > 0 ? (
        <Box>
          <Box sx={{ mb: 2 }}>
            <Alert severity="info">
              選択された衛星の軌道分析情報を表示します。
            </Alert>
          </Box>
          {/* 分析情報の表示 */}
          {/* 実際の分析情報はフェーズ3で実装 */}
        </Box>
      ) : (
        <Alert severity="warning">
          衛星が選択されていません。衛星を選択すると分析情報が表示されます。
        </Alert>
      )}
    </Box>
  );

  return (
    <LayerProvider>
      <ResponsiveMapLayout
        sidePanel={
          <TabPanel
            searchTab={searchTabContent}
            infoTab={infoTabContent}
            orbitTab={orbitTabContent}
            analysisTab={analysisTabContent}
          />
        }
        controls={
          <MinimalControls
            currentCenter={center}
            onMyLocationClick={() => {
              // ブラウザのジオロケーションAPIを使用して現在地を取得
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const { latitude, longitude } = position.coords;
                  onLocationSelect({ lat: latitude, lng: longitude });
                },
                (error) => {
                  console.error('位置情報の取得に失敗しました:', error);
                }
              );
            }}
          />
        }
      >
        <MapView center={center} zoom={defaultZoom}>
          {/* 地図クリックイベントハンドラー */}
          <MapClickHandler onLocationSelect={onLocationSelect} />

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

          {/* 衛星アニメーション */}
          <LayerRenderer layerId="satellite-animation">
            {orbitPaths.length > 0 && animationState.isPlaying && (
              <SatelliteAnimationLayer
                path={orbitPaths[0]}
                animationState={animationState}
                onPositionUpdate={handlePositionUpdate}
              />
            )}
          </LayerRenderer>
        </MapView>
      </ResponsiveMapLayout>
    </LayerProvider>
  );
};

export default Map;

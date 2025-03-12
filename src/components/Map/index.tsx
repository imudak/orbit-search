import React, { useState, useCallback, useMemo, useEffect, createContext, useContext } from 'react';
import { styled } from '@mui/material/styles';
import { Box, Button, useTheme, useMediaQuery, Snackbar, Alert, Fade, Grid, LinearProgress, Typography, Paper } from '@mui/material';
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
import OrbitControlPanel from './panels/OrbitControlPanel';
import { AnimationState } from './panels/AnimationControlPanel';
import { OrbitType, DEFAULT_ORBIT_TYPES } from './layers/VisibilityCircleLayer';
import { LayerProvider, useLayerManager, LayerRenderer } from './layers/LayerManager';
import SearchPanel from '@/components/SearchPanel';
import SatelliteList from '@/components/SatelliteList';

// マップ状態管理のためのコンテキスト
interface MapContextType {
  animationState: AnimationState;
  setAnimationState: React.Dispatch<React.SetStateAction<AnimationState>>;
  satellitePosition: AnimationState['currentPosition'] | undefined;
  setSatellitePosition: React.Dispatch<React.SetStateAction<AnimationState['currentPosition'] | undefined>>;
  orbitVisibility: {
    showOrbits: boolean;
    showFootprints: boolean;
  };
  setOrbitVisibility: React.Dispatch<React.SetStateAction<{
    showOrbits: boolean;
    showFootprints: boolean;
  }>>;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

// マップコンテキストを使用するためのフック
export const useMapContext = () => {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMapContext must be used within a MapContextProvider');
  }
  return context;
};

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
 * モードレス設計で操作性を向上
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

  // 軌道表示設定
  const [orbitVisibility, setOrbitVisibility] = useState({
    showOrbits: true,
    showFootprints: true,
  });

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
        satellites={satellites as any}
        onTLEDownload={onTLEDownload}
        onObservationDataRequest={onObservationDataRequest}
        onSatelliteSelect={onSatelliteSelect}
        selectedSatellite={selectedSatellite}
        isLoading={isLoading}
        searchPanel={null} // 検索パネルは別途表示するため不要
      />
    </>
  );

  // 衛星情報タブコンポーネント
  const satelliteInfoTabContent = useMemo(() => {
    // 軌道パスがない場合
    if (orbitPaths.length === 0) {
      return (
        <Box sx={{ p: 2 }}>
          <Alert severity="warning">
            衛星が選択されていません。衛星を選択すると分析情報が表示されます。
          </Alert>
        </Box>
      );
    }

    // 軌道パスの統計情報を計算する関数
    const calculateStatistics = (path: OrbitPath) => {
      let totalPoints = 0;
      let totalDistance = 0;
      let minElevation = Infinity;
      let maxElevation = -Infinity;
      let elevationSum = 0;
      let elevationCount = 0;
      let visibleTime = 0; // 可視時間（分）
      let totalTime = 0; // 総時間（分）

      // 各セグメントのポイントを処理
      path.segments.forEach(segment => {
        totalPoints += segment.points.length;
        totalTime += segment.points.length; // 1ポイント = 1分と仮定

        // 各ポイントの実効的な角度を処理
        segment.effectiveAngles.forEach(angle => {
          minElevation = Math.min(minElevation, angle);
          maxElevation = Math.max(maxElevation, angle);
          elevationSum += angle;
          elevationCount++;

          // 可視時間を計算（仰角が10度以上）
          if (angle >= 10) {
            visibleTime++;
          }
        });

        // 各ポイント間の距離を計算
        for (let i = 0; i < segment.points.length - 1; i++) {
          const p1 = segment.points[i];
          const p2 = segment.points[i + 1];

          // 球面上の2点間の距離を計算（ハーバーサイン公式）
          const R = 6371; // 地球の半径（km）
          const dLat = (p2.lat - p1.lat) * Math.PI / 180;
          const dLon = (p2.lng - p1.lng) * Math.PI / 180;
          const a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;

          totalDistance += distance;
        }
      });

      // 平均仰角を計算
      const avgElevation = elevationCount > 0 ? elevationSum / elevationCount : 0;

      // 可視率を計算
      const visibilityRate = totalTime > 0 ? (visibleTime / totalTime) * 100 : 0;

      // 仰角分布を計算
      const elevationDistribution = {
        optimal: 0, // 45度以上
        good: 0,    // 20-45度
        visible: 0, // 10-20度
        poor: 0     // 10度未満
      };

      path.segments.forEach(segment => {
        segment.effectiveAngles.forEach(angle => {
          if (angle >= 45) {
            elevationDistribution.optimal++;
          } else if (angle >= 20) {
            elevationDistribution.good++;
          } else if (angle >= 10) {
            elevationDistribution.visible++;
          } else {
            elevationDistribution.poor++;
          }
        });
      });

      // 分布の割合を計算
      const total = elevationCount || 1; // ゼロ除算を防ぐ
      const distribution = {
        optimal: (elevationDistribution.optimal / total) * 100,
        good: (elevationDistribution.good / total) * 100,
        visible: (elevationDistribution.visible / total) * 100,
        poor: (elevationDistribution.poor / total) * 100
      };

      return {
        totalPoints,
        totalSegments: path.segments.length,
        totalDistance: totalDistance.toFixed(2),
        minElevation: minElevation === Infinity ? 0 : minElevation.toFixed(2),
        maxElevation: maxElevation === -Infinity ? 0 : maxElevation.toFixed(2),
        avgElevation: avgElevation.toFixed(2),
        maxElevationFromPath: path.maxElevation.toFixed(2),
        visibleTime,
        totalTime,
        visibilityRate: visibilityRate.toFixed(1),
        distribution
      };
    };

    // 各軌道パスの統計情報
    const pathStats = orbitPaths.map(calculateStatistics);

    // 可視性の分類
    const getVisibilityCategory = (elevation: number) => {
      if (elevation >= 45) {
        return { label: '最適', color: 'success' };
      } else if (elevation >= 20) {
        return { label: '良好', color: 'primary' };
      } else if (elevation >= 10) {
        return { label: '可視', color: 'warning' };
      } else {
        return { label: '不良', color: 'error' };
      }
    };

    return (
      <Box sx={{ p: 2 }}>
        {orbitPaths.map((path, index) => {
          const stats = pathStats[index];
          const visibilityCategory = getVisibilityCategory(path.maxElevation);

          return (
            <Box key={path.satelliteId} sx={{ mb: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                選択された衛星の軌道分析情報を表示します。
              </Alert>

              <Box sx={{ mb: 2, backgroundColor: 'rgba(255, 255, 255, 0.9)', p: 2, borderRadius: '4px' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  衛星ID: {path.satelliteId}
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>仰角分布</Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ width: '100px', mr: 1 }}>
                      <Typography variant="caption">最適 (45°以上)</Typography>
                    </Box>
                    <Box sx={{ flexGrow: 1, mr: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={stats.distribution.optimal}
                        sx={{
                          height: 16,
                          borderRadius: 2,
                          backgroundColor: 'rgba(76, 175, 80, 0.2)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: 'success.main',
                          }
                        }}
                      />
                    </Box>
                    <Typography variant="body2">{stats.distribution.optimal.toFixed(1)}%</Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ width: '100px', mr: 1 }}>
                      <Typography variant="caption">良好 (20-45°)</Typography>
                    </Box>
                    <Box sx={{ flexGrow: 1, mr: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={stats.distribution.good}
                        sx={{
                          height: 16,
                          borderRadius: 2,
                          backgroundColor: 'rgba(25, 118, 210, 0.2)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: 'primary.main',
                          }
                        }}
                      />
                    </Box>
                    <Typography variant="body2">{stats.distribution.good.toFixed(1)}%</Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ width: '100px', mr: 1 }}>
                      <Typography variant="caption">可視 (10-20°)</Typography>
                    </Box>
                    <Box sx={{ flexGrow: 1, mr: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={stats.distribution.visible}
                        sx={{
                          height: 16,
                          borderRadius: 2,
                          backgroundColor: 'rgba(255, 152, 0, 0.2)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: 'warning.main',
                          }
                        }}
                      />
                    </Box>
                    <Typography variant="body2">{stats.distribution.visible.toFixed(1)}%</Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: '100px', mr: 1 }}>
                      <Typography variant="caption">不良 (10°未満)</Typography>
                    </Box>
                    <Box sx={{ flexGrow: 1, mr: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={stats.distribution.poor}
                        sx={{
                          height: 16,
                          borderRadius: 2,
                          backgroundColor: 'rgba(211, 47, 47, 0.2)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: 'error.main',
                          }
                        }}
                      />
                    </Box>
                    <Typography variant="body2">{stats.distribution.poor.toFixed(1)}%</Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>可視性サマリー</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1, textAlign: 'center', backgroundColor: 'rgba(76, 175, 80, 0.1)' }}>
                        <Typography variant="caption" color="textSecondary">可視時間</Typography>
                        <Typography variant="h6">{stats.visibleTime}分</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1, textAlign: 'center', backgroundColor: 'rgba(76, 175, 80, 0.1)' }}>
                        <Typography variant="caption" color="textSecondary">可視率</Typography>
                        <Typography variant="h6">{stats.visibilityRate}%</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  }, [orbitPaths]);

  // MapContextの値を設定
  const mapContextValue: MapContextType = {
    animationState,
    setAnimationState,
    satellitePosition,
    setSatellitePosition,
    orbitVisibility,
    setOrbitVisibility
  };

  return (
    <MapContext.Provider value={mapContextValue}>
      <LayerProvider>
        <ResponsiveMapLayout
          sidePanel={
            <TabPanel
              searchTab={searchTabContent}
              satelliteInfoTab={satelliteInfoTabContent}
              orbitTab={
                <OrbitControlPanel
                  animationState={animationState}
                  onPlayPause={handlePlayPause}
                  onSeek={handleSeek}
                  onSpeedChange={handleSpeedChange}
                  orbitVisibility={orbitVisibility}
                  onOrbitVisibilityChange={setOrbitVisibility}
                />
              }
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
              {center && orbitVisibility.showFootprints && (
                <VisibilityCircleLayer
                  center={center}
                  minElevation={minElevation}
                  orbitTypes={orbitTypes.length > 0 ? orbitTypes : DEFAULT_ORBIT_TYPES}
                />
              )}
            </LayerRenderer>

            <LayerRenderer layerId="orbit-paths">
              {orbitPaths.length > 0 && orbitVisibility.showOrbits && (
                <SatelliteOrbitLayer paths={orbitPaths} observerLocation={center} />
              )}
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

            {/* マップコントロール */}
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
          </MapView>
        </ResponsiveMapLayout>
      </LayerProvider>
    </MapContext.Provider>
  );
};

export default Map;

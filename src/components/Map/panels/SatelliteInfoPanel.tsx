import React, { useState } from 'react';
import { Paper, Typography, Box, IconButton, Collapse, Divider, Chip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { Satellite, Location, OrbitPath } from '@/types';
import type { AnimationState } from '../panels/AnimationControlPanel';

interface SatelliteInfoPanelProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  satellite?: Satellite;
  currentPosition?: {
    lat: number;
    lng: number;
    elevation: number;
    azimuth: number;
    range: number;
  };
  currentTime?: Date;
  animationState?: AnimationState;
  satelliteId?: string;
  center?: Location;
  orbitPaths?: OrbitPath[];
}

/**
 * 衛星情報を表示するパネルコンポーネント
 */
const SatelliteInfoPanel: React.FC<SatelliteInfoPanelProps> = ({
  position = 'bottomleft',
  satellite,
  currentPosition,
  currentTime = new Date(),
  animationState,
  satelliteId,
  center,
  orbitPaths = [],
}) => {
  const [isOpen, setIsOpen] = useState(true);

  // ポジションに応じたスタイルを設定
  const getPositionStyle = () => {
    switch (position) {
      case 'topleft':
        return { top: '10px', left: '10px' };
      case 'topright':
        return { top: '10px', right: '10px' };
      case 'bottomleft':
        return { bottom: '10px', left: '10px' };
      case 'bottomright':
        return { bottom: '10px', right: '10px' };
      default:
        return { bottom: '10px', left: '10px' };
    }
  };

  // 時間をフォーマットする関数
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // 日付をフォーマットする関数
  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

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

  if (!center && !satellite && !animationState) return null;

  return (
    <Box sx={{
      position: 'absolute',
      ...getPositionStyle(),
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: position.includes('right') ? 'flex-end' : 'flex-start',
      minWidth: '250px', // 最小幅を設定
    }}>
      <Box>
        <IconButton
          size="small"
          onClick={() => setIsOpen(!isOpen)}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
          }}
        >
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>
      </Box>

      <Collapse in={isOpen} sx={{ width: '100%' }}> {/* 幅を100%に設定 */}
        <Paper
          sx={{
            mt: 1,
            padding: '10px',
            backgroundColor: 'rgba(240, 240, 255, 0.95)',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(0, 0, 100, 0.1)',
            minWidth: '250px', // 最小幅を設定
            maxWidth: '300px',
            maxHeight: '80vh',
            overflowY: 'auto',
            width: '100%', // 幅を100%に設定
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.1)', pb: 0.5 }}>
            {satellite ? `衛星情報: ${satellite.name}` : '基本情報'}
          </Typography>

          {/* 観測地点情報 */}
          {center && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                観測地点
              </Typography>
              <Typography variant="body2">
                緯度: {center.lat.toFixed(6)}°<br />
                経度: {center.lng.toFixed(6)}°
              </Typography>
            </Box>
          )}

          {/* 衛星の基本情報 */}
          {satellite && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                基本情報
              </Typography>
              <Typography variant="body2">
                NORAD ID: {satellite.noradId}<br />
                種類: {satellite.type}<br />
                運用状態: {satellite.operationalStatus}<br />
                軌道種類: {satellite.orbitType || '不明'}<br />
                軌道高度: {satellite.orbitHeight ? `${satellite.orbitHeight.toLocaleString()} km` : '不明'}
              </Typography>
            </Box>
          )}

          {/* アニメーション情報 */}
          {animationState && (
            <>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  時間情報
                  <Typography component="span" sx={{ ml: 1, fontSize: '0.8rem', color: 'text.secondary' }}>
                    {animationState.isPlaying ? `${animationState.playbackSpeed}倍速` : '一時停止中'}
                  </Typography>
                </Typography>
                <Typography variant="body2">
                  現在時刻: {formatDate(animationState.currentTime)} {formatTime(animationState.currentTime)}<br />
                  開始時刻: {formatDate(animationState.startTime)} {formatTime(animationState.startTime)}<br />
                  終了時刻: {formatDate(animationState.endTime)} {formatTime(animationState.endTime)}
                </Typography>
              </Box>
            </>
          )}

          {/* 軌道情報 */}
          {orbitPaths.length > 0 && (
            <>
              <Divider sx={{ my: 1 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  軌道情報
                </Typography>
                {orbitPaths.map(path => {
                  const visibilityCategory = getVisibilityCategory(path.maxElevation);
                  return (
                    <Box key={path.satelliteId} sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        衛星ID: {path.satelliteId}
                      </Typography>
                      <Box sx={{ display: 'flex', mt: 0.5 }}>
                        <Chip
                          label={`最大仰角: ${path.maxElevation.toFixed(1)}°`}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Chip
                          label={`可視性: ${visibilityCategory.label}`}
                          color={visibilityCategory.color as any}
                          size="small"
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </>
          )}

          {/* 現在位置情報 */}
          {currentPosition && (
            <>
              <Divider sx={{ my: 1 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  現在位置 {!animationState && `(${formatTime(currentTime)})`}
                </Typography>
                {satelliteId && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    衛星ID: {satelliteId}
                  </Typography>
                )}
                <Typography variant="body2">
                  緯度: {currentPosition.lat.toFixed(6)}°<br />
                  経度: {currentPosition.lng.toFixed(6)}°<br />
                  仰角: {currentPosition.elevation.toFixed(2)}°<br />
                  方位角: {currentPosition.azimuth.toFixed(2)}°<br />
                  距離: {currentPosition.range.toFixed(2)} km
                </Typography>
              </Box>
            </>
          )}

          {/* 衛星が選択されていない場合のメッセージ */}
          {!satellite && !currentPosition && orbitPaths.length === 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              衛星が選択されていません。衛星リストから衛星を選択してください。
            </Typography>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
};

export default SatelliteInfoPanel;

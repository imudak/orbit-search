import React from 'react';
import {
  Paper, Typography, Box, IconButton, Collapse, Divider, Chip,
  Accordion, AccordionSummary, AccordionDetails, useTheme, useMediaQuery
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { Satellite, Location, OrbitPath } from '@/types';
import type { AnimationState } from '../panels/AnimationControlPanel';

interface SatelliteInfoPanelProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright' | 'center';
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
  mapZoom?: number;
  mapCenter?: Location;
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * 衛星情報を表示するパネルコンポーネント
 */
const SatelliteInfoPanel: React.FC<SatelliteInfoPanelProps> = ({
  position = 'center',
  satellite,
  currentPosition,
  currentTime = new Date(),
  animationState,
  satelliteId,
  center,
  orbitPaths = [],
  mapZoom,
  mapCenter,
  isOpen = false,
  onClose,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // ポジションに応じたスタイルを設定
  const getPositionStyle = () => {
    if (position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

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
      alignItems: position === 'center' ? 'center' : position.includes('right') ? 'flex-end' : 'flex-start',
      minWidth: position === 'center' ? '600px' : '250px', // 最小幅を設定
      maxWidth: position === 'center' ? '80%' : (isMobile ? '90vw' : '350px'), // モバイルでは画面幅の90%に制限
    }}>
      <Collapse in={isOpen} sx={{ width: '100%' }}>
        <Paper
          sx={{
            padding: '10px',
            backgroundColor: 'rgba(240, 240, 255, 0.95)',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(0, 0, 100, 0.1)',
            minWidth: position === 'center' ? '600px' : '250px',
            width: '100%',
            maxHeight: isMobile ? '50vh' : '60vh', // 最大高さを調整
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* ヘッダー部分 */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
            pb: 0.5,
            mb: 1
          }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {satellite ? `衛星情報: ${satellite.name}` : '基本情報'}
            </Typography>
            {onClose && (
              <IconButton
                size="small"
                onClick={onClose}
                sx={{ padding: '2px' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          {/* スクロール可能なコンテンツエリア */}
          <Box sx={{
            overflowY: 'auto',
            flex: '1 1 auto',
            pr: 1, // スクロールバー用の余白
            // スクロールバーのスタイル
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(0,0,0,0.05)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '4px',
            }
          }}>
            {/* 観測地点情報 */}
            {center && (
              <Accordion defaultExpanded disableGutters elevation={0}
                sx={{
                  backgroundColor: 'transparent',
                  '&:before': { display: 'none' }, // 区切り線を非表示
                  mb: 1
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    minHeight: '36px',
                    padding: '0 8px',
                    '& .MuiAccordionSummary-content': { margin: '6px 0' }
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    観測地点
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ padding: '0 16px 8px' }}>
                  <Typography variant="body2">
                    緯度: {center.lat.toFixed(6)}°<br />
                    経度: {center.lng.toFixed(6)}°
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}

            {/* 衛星の基本情報 */}
            {satellite && (
              <Accordion defaultExpanded disableGutters elevation={0}
                sx={{
                  backgroundColor: 'transparent',
                  '&:before': { display: 'none' },
                  mb: 1
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    minHeight: '36px',
                    padding: '0 8px',
                    '& .MuiAccordionSummary-content': { margin: '6px 0' }
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    基本情報
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ padding: '0 16px 8px' }}>
                  <Typography variant="body2">
                    NORAD ID: {satellite.noradId}<br />
                    種類: {satellite.type}<br />
                    運用状態: {satellite.operationalStatus}<br />
                    軌道種類: {satellite.orbitType || '不明'}<br />
                    軌道高度: {satellite.orbitHeight ? `${satellite.orbitHeight.toLocaleString()} km` : '不明'}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}

            {/* アニメーション情報 */}
            {animationState && (
              <Accordion defaultExpanded disableGutters elevation={0}
                sx={{
                  backgroundColor: 'transparent',
                  '&:before': { display: 'none' },
                  mb: 1
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    minHeight: '36px',
                    padding: '0 8px',
                    '& .MuiAccordionSummary-content': { margin: '6px 0' }
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    時間情報
                    <Typography component="span" sx={{ ml: 1, fontSize: '0.8rem', color: 'text.secondary' }}>
                      {animationState.isPlaying ? `${animationState.playbackSpeed}倍速` : '一時停止中'}
                    </Typography>
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ padding: '0 16px 8px' }}>
                  <Typography variant="body2">
                    現在時刻: {formatDate(animationState.currentTime)} {formatTime(animationState.currentTime)}<br />
                    開始時刻: {formatDate(animationState.startTime)} {formatTime(animationState.startTime)}<br />
                    終了時刻: {formatDate(animationState.endTime)} {formatTime(animationState.endTime)}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}

            {/* 軌道情報 */}
            {orbitPaths.length > 0 && (
              <Accordion defaultExpanded disableGutters elevation={0}
                sx={{
                  backgroundColor: 'transparent',
                  '&:before': { display: 'none' },
                  mb: 1
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    minHeight: '36px',
                    padding: '0 8px',
                    '& .MuiAccordionSummary-content': { margin: '6px 0' }
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    軌道情報
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ padding: '0 16px 8px' }}>
                  {orbitPaths.map(path => {
                    const visibilityCategory = getVisibilityCategory(path.maxElevation);
                    return (
                      <Box key={path.satelliteId} sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          衛星ID: {path.satelliteId}
                        </Typography>
                        <Box sx={{ display: 'flex', mt: 0.5, flexWrap: 'wrap', gap: '4px' }}>
                          <Chip
                            label={`最大仰角: ${path.maxElevation.toFixed(1)}°`}
                            size="small"
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
                </AccordionDetails>
              </Accordion>
            )}

            {/* 現在位置情報 */}
            {currentPosition && (
              <Accordion defaultExpanded disableGutters elevation={0}
                sx={{
                  backgroundColor: 'transparent',
                  '&:before': { display: 'none' },
                  mb: 1
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    minHeight: '36px',
                    padding: '0 8px',
                    '& .MuiAccordionSummary-content': { margin: '6px 0' }
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    現在位置 {!animationState && `(${formatTime(currentTime)})`}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ padding: '0 16px 8px' }}>
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
                </AccordionDetails>
              </Accordion>
            )}

            {/* 地図情報セクション */}
            {mapCenter && mapZoom && (
              <Accordion defaultExpanded={false} disableGutters elevation={0}
                sx={{
                  backgroundColor: 'transparent',
                  '&:before': { display: 'none' },
                  mb: 1
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    minHeight: '36px',
                    padding: '0 8px',
                    '& .MuiAccordionSummary-content': { margin: '6px 0' }
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    地図情報
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ padding: '0 16px 8px' }}>
                  <Typography variant="body2">
                    中心座標:<br />
                    緯度: {mapCenter.lat.toFixed(6)}°<br />
                    経度: {mapCenter.lng.toFixed(6)}°<br />
                    ズームレベル: {mapZoom}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}

            {/* 衛星が選択されていない場合のメッセージ */}
            {!satellite && !currentPosition && orbitPaths.length === 0 && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, px: 1 }}>
                衛星が選択されていません。衛星リストから衛星を選択してください。
              </Typography>
            )}
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default SatelliteInfoPanel;

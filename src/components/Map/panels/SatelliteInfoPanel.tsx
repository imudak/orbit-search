import React, { useState } from 'react';
import {
  Paper, Typography, Box, IconButton, Collapse, Divider, Chip,
  Accordion, AccordionSummary, AccordionDetails, useTheme, useMediaQuery,
  Tooltip, Card, CardContent, LinearProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SatelliteIcon from '@mui/icons-material/Satellite';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TimelineIcon from '@mui/icons-material/Timeline';
import InfoIcon from '@mui/icons-material/Info';
import VisibilityIcon from '@mui/icons-material/Visibility';
import type { Satellite, Location, OrbitPath } from '@/types';
import type { AnimationState } from '../panels/AnimationControlPanel';
import { OrbitType, DEFAULT_ORBIT_TYPES } from '../layers/VisibilityCircleLayer';

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
  // 凡例関連のプロパティ
  minElevation?: number;
  orbitTypes?: OrbitType[];
  showLegend?: boolean;
  onToggleLegend?: () => void;
}

/**
 * 改良版衛星情報パネルコンポーネント
 * 情報の階層化と視認性を向上
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
  // 凡例関連のプロパティ
  minElevation = 10,
  orbitTypes = DEFAULT_ORBIT_TYPES,
  showLegend = false,
  onToggleLegend = () => {},
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [helpOpen, setHelpOpen] = useState<{ [key: string]: boolean }>({
    basic: false,
    position: false,
    visibility: false,
  });

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

  // ヘルプトグル関数
  const toggleHelp = (section: string) => {
    setHelpOpen(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!center && !satellite && !animationState) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        ...getPositionStyle(),
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: position === 'center' ? 'center' : position.includes('right') ? 'flex-end' : 'flex-start',
        minWidth: position === 'center' ? '600px' : '280px', // 最小幅を設定
        maxWidth: position === 'center' ? '80%' : (isMobile ? '90vw' : '380px'), // モバイルでは画面幅の90%に制限
      }}
      onWheel={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <Collapse
        in={isOpen}
        sx={{ width: '100%' }}
        onWheel={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <Paper
          sx={{
            padding: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            minWidth: position === 'center' ? '600px' : '280px',
            width: '100%',
            maxHeight: isMobile ? '70vh' : '80vh', // 最大高さを調整
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onWheel={(e) => {
            // マウスホイールイベントが伝播しないようにする
            e.stopPropagation();
            // デフォルトの動作も防止
            e.preventDefault();
          }}
        >
          {/* ヘッダー部分 */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
            pb: 1,
            mb: 2
          }}>
            <Typography variant="h6" sx={{
              fontWeight: 'bold',
              color: theme.palette.primary.main,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}>
              <SatelliteIcon />
              {satellite ? `${satellite.name}` : '衛星情報'}
            </Typography>
            {onClose && (
              <IconButton
                size="small"
                onClick={onClose}
                sx={{
                  color: theme.palette.grey[700],
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.08)',
                  }
                }}
                aria-label="閉じる"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          {/* スクロール可能なコンテンツエリア */}
          <Box
            sx={{
              overflowY: 'auto',
              flex: '1 1 auto',
              pr: 1, // スクロールバー用の余白
              maxHeight: isMobile ? 'calc(70vh - 60px)' : 'calc(80vh - 60px)', // 最大高さを明示的に設定
              // スクロールバーのスタイル
              '&::-webkit-scrollbar': {
                width: '8px',
                display: 'block', // スクロールバーを常に表示
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
              }
            }}
          >
            {/* 観測地点情報 */}
            {center && (
              <Card
                elevation={0}
                sx={{
                  mb: 2,
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  px: 2,
                  py: 1,
                  borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                }}>
                  <LocationOnIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    観測地点
                  </Typography>
                  <Tooltip title="観測地点の情報">
                    <IconButton
                      size="small"
                      onClick={() => toggleHelp('position')}
                      sx={{ ml: 'auto' }}
                    >
                      <HelpOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <CardContent sx={{ py: 1.5 }}>
                  <Collapse in={helpOpen.position}>
                    <Box sx={{
                      backgroundColor: 'rgba(0, 0, 0, 0.03)',
                      p: 1.5,
                      borderRadius: '4px',
                      mb: 1.5,
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        観測地点は衛星の可視性を計算するための基準点です。緯度と経度で表される地球上の位置を示します。
                      </Typography>
                    </Box>
                  </Collapse>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">緯度:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {center.lat.toFixed(6)}°
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">経度:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {center.lng.toFixed(6)}°
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* 衛星の基本情報 */}
            {satellite && (
              <Card
                elevation={0}
                sx={{
                  mb: 2,
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  px: 2,
                  py: 1,
                  borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                }}>
                  <InfoIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    基本情報
                  </Typography>
                  <Tooltip title="衛星の基本情報">
                    <IconButton
                      size="small"
                      onClick={() => toggleHelp('basic')}
                      sx={{ ml: 'auto' }}
                    >
                      <HelpOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <CardContent sx={{ py: 1.5 }}>
                  <Collapse in={helpOpen.basic}>
                    <Box sx={{
                      backgroundColor: 'rgba(0, 0, 0, 0.03)',
                      p: 1.5,
                      borderRadius: '4px',
                      mb: 1.5,
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        衛星の基本的な識別情報と軌道特性を示します。NORAD IDは衛星の国際的な識別番号です。
                      </Typography>
                    </Box>
                  </Collapse>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">NORAD ID:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {satellite.noradId}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">種類:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {satellite.type}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">運用状態:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {satellite.operationalStatus}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 0.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">軌道種類:</Typography>
                      <Chip
                        label={satellite.orbitType || '不明'}
                        size="small"
                        color={
                          satellite.orbitType === 'LEO' ? 'error' :
                          satellite.orbitType === 'MEO' ? 'success' :
                          satellite.orbitType === 'GEO' ? 'primary' :
                          satellite.orbitType === 'HEO' ? 'warning' : 'default'
                        }
                        sx={{ height: '20px', '& .MuiChip-label': { px: 1, py: 0 } }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">軌道高度:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {satellite.orbitHeight ? `${satellite.orbitHeight.toLocaleString()} km` : '不明'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* アニメーション情報 */}
            {animationState && (
              <Card
                elevation={0}
                sx={{
                  mb: 2,
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  px: 2,
                  py: 1,
                  borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                }}>
                  <AccessTimeIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    時間情報
                  </Typography>
                  <Chip
                    label={`${animationState.playbackSpeed}倍速`}
                    size="small"
                    color="primary"
                    sx={{ ml: 1, height: '20px', '& .MuiChip-label': { px: 1, py: 0 } }}
                  />
                  {animationState.isPlaying ? (
                    <Chip
                      label="再生中"
                      size="small"
                      color="success"
                      sx={{ ml: 1, height: '20px', '& .MuiChip-label': { px: 1, py: 0 } }}
                    />
                  ) : (
                    <Chip
                      label="一時停止"
                      size="small"
                      color="default"
                      sx={{ ml: 1, height: '20px', '& .MuiChip-label': { px: 1, py: 0 } }}
                    />
                  )}
                </Box>
                <CardContent sx={{ py: 1.5 }}>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      再生進捗:
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={((animationState.currentTime.getTime() - animationState.startTime.getTime()) /
                        (animationState.endTime.getTime() - animationState.startTime.getTime())) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">現在時刻:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {formatDate(animationState.currentTime)} {formatTime(animationState.currentTime)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">開始時刻:</Typography>
                      <Typography variant="body2">
                        {formatDate(animationState.startTime)} {formatTime(animationState.startTime)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">終了時刻:</Typography>
                      <Typography variant="body2">
                        {formatDate(animationState.endTime)} {formatTime(animationState.endTime)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* 軌道情報 */}
            {orbitPaths.length > 0 && (
              <Card
                elevation={0}
                sx={{
                  mb: 2,
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  px: 2,
                  py: 1,
                  borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                }}>
                  <TimelineIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    軌道情報
                  </Typography>
                  <Tooltip title="軌道の可視性について">
                    <IconButton
                      size="small"
                      onClick={() => toggleHelp('visibility')}
                      sx={{ ml: 'auto' }}
                    >
                      <HelpOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <CardContent sx={{ py: 1.5 }}>
                  <Collapse in={helpOpen.visibility}>
                    <Box sx={{
                      backgroundColor: 'rgba(0, 0, 0, 0.03)',
                      p: 1.5,
                      borderRadius: '4px',
                      mb: 1.5,
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        最大仰角は観測地点から見た衛星の最も高い角度です。45°以上が最適な観測条件、20°以上が良好、10°以上が可視、10°未満は不良な観測条件を示します。
                      </Typography>
                    </Box>
                  </Collapse>
                  {orbitPaths.map(path => {
                    const visibilityCategory = getVisibilityCategory(path.maxElevation);
                    return (
                      <Box key={path.satelliteId} sx={{ mb: 1.5, pb: 1.5, borderBottom: '1px solid rgba(0, 0, 0, 0.1)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">衛星ID:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {path.satelliteId}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary">最大仰角:</Typography>
                            <Chip
                              label={`${path.maxElevation.toFixed(1)}°`}
                              size="small"
                              color={visibilityCategory.color as any}
                              sx={{ height: '20px', '& .MuiChip-label': { px: 1, py: 0 } }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary">可視性:</Typography>
                            <Chip
                              label={visibilityCategory.label}
                              size="small"
                              color={visibilityCategory.color as any}
                              sx={{ height: '20px', '& .MuiChip-label': { px: 1, py: 0 } }}
                            />
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* 現在位置情報 */}
            {currentPosition && (
              <Card
                elevation={0}
                sx={{
                  mb: 2,
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  px: 2,
                  py: 1,
                  borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                }}>
                  <VisibilityIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    現在位置 {!animationState && `(${formatTime(currentTime)})`}
                  </Typography>
                </Box>
                <CardContent sx={{ py: 1.5 }}>
                  {satelliteId && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">衛星ID:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {satelliteId}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">緯度:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {currentPosition.lat.toFixed(6)}°
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">経度:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {currentPosition.lng.toFixed(6)}°
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 0.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">仰角:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {currentPosition.elevation.toFixed(2)}°
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">方位角:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {currentPosition.azimuth.toFixed(2)}°
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">距離:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {currentPosition.range.toFixed(2)} km
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* 地図情報セクション */}
            {mapCenter && mapZoom && (
              <Card
                elevation={0}
                sx={{
                  mb: 2,
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  px: 2,
                  py: 1,
                  borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                }}>
                  <LocationOnIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    地図情報
                  </Typography>
                </Box>
                <CardContent sx={{ py: 1.5 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      中心座標:
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">緯度:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {mapCenter.lat.toFixed(6)}°
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">経度:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {mapCenter.lng.toFixed(6)}°
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">ズームレベル:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {mapZoom}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* 凡例情報セクション */}
            <Card
              elevation={0}
              sx={{
                mb: 2,
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  px: 2,
                  py: 1,
                  borderBottom: showLegend ? '1px solid rgba(0, 0, 0, 0.1)' : 'none',
                  cursor: 'pointer',
                }}
                onClick={onToggleLegend}
              >
                <InfoIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                  凡例情報
                </Typography>
                <IconButton
                  size="small"
                  sx={{ ml: 'auto' }}
                >
                  {showLegend ? <ExpandMoreIcon /> : <ExpandMoreIcon sx={{ transform: 'rotate(-90deg)' }} />}
                </IconButton>
              </Box>
              <Collapse in={showLegend}>
                <CardContent sx={{ py: 1.5 }}>
                  {/* 軌道の種類と高度 */}
                  <Typography variant="subtitle2" sx={{ mb: 1, color: theme.palette.primary.main }}>
                    軌道の種類と高度
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
                    {orbitTypes.map((orbitType) => (
                      <Box key={orbitType.name} sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: orbitType.color,
                            opacity: 0.7,
                            mr: 1,
                            border: '1px solid rgba(0, 0, 0, 0.3)',
                            borderRadius: '2px',
                          }}
                        />
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {orbitType.name}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {orbitType.height.toLocaleString()}km
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* 可視性の色分け */}
                  <Typography variant="subtitle2" sx={{ mb: 1, color: theme.palette.primary.main }}>
                    衛星の見やすさ
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip size="small" label="最適" color="success" sx={{ minWidth: '60px', mr: 1 }} />
                      <Typography variant="body2">
                        45°以上 - 非常に良好な観測条件
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip size="small" label="良好" color="primary" sx={{ minWidth: '60px', mr: 1 }} />
                      <Typography variant="body2">
                        20-45° - 良好な観測条件
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip size="small" label="可視" color="warning" sx={{ minWidth: '60px', mr: 1 }} />
                      <Typography variant="body2">
                        10-20° - 観測可能だが障害物に注意
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip size="small" label="不良" color="error" sx={{ minWidth: '60px', mr: 1 }} />
                      <Typography variant="body2">
                        0-10° - 地平線に近く観測困難
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Collapse>
            </Card>

            {/* 衛星が選択されていない場合のメッセージ */}
            {!satellite && !currentPosition && orbitPaths.length === 0 && (
              <Box sx={{
                p: 3,
                textAlign: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.03)',
                borderRadius: '8px',
              }}>
                <SatelliteIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1 }}>
                  衛星が選択されていません
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  衛星リストから衛星を選択してください。
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default SatelliteInfoPanel;

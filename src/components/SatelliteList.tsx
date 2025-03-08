import React, { useState } from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Tooltip,
  CircularProgress,
  Box,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Timeline as TimelineIcon,
  Info as InfoIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import type { Satellite, Pass } from '@/types';

// TLEデータから軌道種類を判断する関数
const getOrbitType = (tle: { line1: string, line2: string }): string => {
  try {
    // TLEの2行目から1日あたりの周回数を取得
    const line2 = tle.line2;
    // 平均運動（1日あたりの周回数）は53-63文字目に格納されている
    const meanMotion = parseFloat(line2.substring(52, 63).trim());

    // 周回数から軌道種類を判断
    if (meanMotion >= 11.25) {
      return 'LEO'; // 低軌道
    } else if (meanMotion >= 2.0) {
      return 'MEO'; // 中軌道
    } else if (meanMotion > 0.9 && meanMotion < 1.1) {
      return 'GEO'; // 静止軌道
    } else {
      return 'HEO'; // 高楕円軌道など
    }
  } catch (error) {
    console.error('TLEデータの解析エラー:', error);
    return '不明';
  }
};

// 軌道種類に応じた色を返す関数
const getOrbitTypeColor = (orbitType: string): 'default' | 'error' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' => {
  switch (orbitType) {
    case 'LEO':
      return 'error'; // 赤
    case 'MEO':
      return 'success'; // 緑
    case 'GEO':
      return 'primary'; // 青
    case 'HEO':
      return 'warning'; // オレンジ
    default:
      return 'default'; // グレー
  }
};

interface SatelliteListProps {
  satellites: Array<Satellite & { passes: Pass[] }>;
  onTLEDownload: (satellite: Satellite) => void;
  onObservationDataRequest: (satellite: Satellite) => void;
  onSatelliteSelect: (satellite: Satellite) => void;
  selectedSatellite?: Satellite;
  isLoading?: boolean;
  searchPanel: React.ReactNode;
}

const SatelliteList: React.FC<SatelliteListProps> = ({
  satellites,
  onTLEDownload,
  onObservationDataRequest,
  onSatelliteSelect,
  selectedSatellite,
  isLoading = false,
  searchPanel,
}) => {
  // 軌道情報ダイアログの状態
  const [infoDialogOpen, setInfoDialogOpen] = useState<boolean>(false);
  if (isLoading) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Paper elevation={3} sx={{ flex: 1, backgroundColor: 'white', overflow: 'auto' }}>
          {/* ヘッダー部分 */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2" sx={{
                fontWeight: 'bold',
                color: '#1976d2',
                display: 'flex',
                alignItems: 'center',
                '&::before': {
                  content: '""',
                  display: 'inline-block',
                  width: '4px',
                  height: '24px',
                  backgroundColor: '#1976d2',
                  marginRight: '8px',
                  borderRadius: '2px'
                }
              }}>
                可視衛星リスト
              </Typography>
            </Box>

            {/* 検索パネル */}
            {searchPanel}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        </Paper>
      </Box>
    );
  }

  if (satellites.length === 0) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Paper elevation={3} sx={{ flex: 1, backgroundColor: 'white', overflow: 'auto' }}>
          {/* ヘッダー部分 */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2" sx={{
                fontWeight: 'bold',
                color: '#1976d2',
                display: 'flex',
                alignItems: 'center',
                '&::before': {
                  content: '""',
                  display: 'inline-block',
                  width: '4px',
                  height: '24px',
                  backgroundColor: '#1976d2',
                  marginRight: '8px',
                  borderRadius: '2px'
                }
              }}>
                可視衛星リスト
              </Typography>
            </Box>

            {/* 検索パネル */}
            {searchPanel}

            <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
              条件に一致する衛星が見つかりません。
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 衛星リスト */}
      <Paper elevation={3} sx={{ flex: 1, backgroundColor: 'white', overflow: 'auto' }}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* ヘッダー部分 */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6" component="h2" sx={{
                  fontWeight: 'bold',
                  color: '#1976d2',
                  display: 'flex',
                  alignItems: 'center',
                  '&::before': {
                    content: '""',
                    display: 'inline-block',
                    width: '4px',
                    height: '24px',
                    backgroundColor: '#1976d2',
                    marginRight: '8px',
                    borderRadius: '2px'
                  }
                }}>
                  可視衛星リスト
                </Typography>
                <Tooltip title="軌道種類と最大仰角について">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => setInfoDialogOpen(true)}
                    sx={{ ml: 1 }}
                  >
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Chip
                label={`合計: ${satellites.length}件`}
                color="primary"
                size="small"
                sx={{ fontWeight: 'bold', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
              />
            </Box>

            {/* 検索パネル */}
            {searchPanel}
          </Box>

          {/* 衛星リスト */}
          <List disablePadding sx={{ flex: 1, overflow: 'auto' }}>
            {satellites.map((satellite, index) => (
              <ListItem
                key={satellite.id}
                disablePadding
                divider
                secondaryAction={
                  <ListItemSecondaryAction>
                    <Tooltip title="観測データをダウンロード">
                      <IconButton
                        edge="end"
                        aria-label="download-observation"
                        onClick={() => onObservationDataRequest(satellite)}
                        sx={{ mr: 1 }}
                      >
                        <TimelineIcon color="primary" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="TLEデータをダウンロード">
                      <IconButton
                        edge="end"
                        aria-label="download-tle"
                        onClick={() => onTLEDownload(satellite)}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                }
              >
                <ListItemButton
                  selected={selectedSatellite?.id === satellite.id}
                  onClick={() => onSatelliteSelect(satellite)}
                  sx={{
                    borderRadius: '4px',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(25, 118, 210, 0.12)',
                      borderLeft: '4px solid #1976d2',
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.2)',
                      }
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          component="span"
                          sx={{
                            minWidth: '30px',
                            fontWeight: 'bold',
                            color: selectedSatellite?.id === satellite.id ? '#1976d2' : 'inherit'
                          }}
                        >
                          {index + 1}.
                        </Typography>
                        <Typography
                          component="span"
                          sx={{
                            fontWeight: selectedSatellite?.id === satellite.id ? 'bold' : 'normal',
                            color: selectedSatellite?.id === satellite.id ? '#1976d2' : 'inherit'
                          }}
                        >
                          {satellite.name}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography component="div" variant="body2">
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                          {/* TLEデータから軌道種類を判断して表示 */}
                          {satellite.tle && (
                            <Chip
                              size="small"
                              label={getOrbitType(satellite.tle)}
                              color={getOrbitTypeColor(getOrbitType(satellite.tle))}
                              sx={{
                                fontWeight: selectedSatellite?.id === satellite.id ? 'bold' : 'normal',
                                boxShadow: selectedSatellite?.id === satellite.id ? '0 1px 3px rgba(0,0,0,0.2)' : 'none'
                              }}
                            />
                          )}
                          {/* 最大仰角を表示（パスがある場合のみ） */}
                          {satellite.passes.length > 0 && (
                            <Chip
                              size="small"
                              label={`最大仰角: ${satellite.passes[0].maxElevation.toFixed(1)}°`}
                              color="primary"
                              sx={{
                                fontWeight: selectedSatellite?.id === satellite.id ? 'bold' : 'normal',
                                boxShadow: selectedSatellite?.id === satellite.id ? '0 1px 3px rgba(0,0,0,0.2)' : 'none'
                              }}
                            />
                          )}
                        </Box>
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Paper>

      {/* 軌道情報ダイアログ */}
      <Dialog
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1
        }}>
          衛星の軌道種類と最大仰角について
          <IconButton
            size="small"
            onClick={() => setInfoDialogOpen(false)}
            aria-label="close"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            衛星リストでは、各衛星の軌道種類と最大仰角を表示しています。
          </Typography>
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            軌道種類:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip size="small" label="LEO" color="error" />
              <Typography variant="body2">低軌道 (Low Earth Orbit) - 高度2,000km以下</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip size="small" label="MEO" color="success" />
              <Typography variant="body2">中軌道 (Medium Earth Orbit) - 高度2,000km〜35,786km</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip size="small" label="GEO" color="primary" />
              <Typography variant="body2">静止軌道 (Geostationary Orbit) - 高度約35,786km</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip size="small" label="HEO" color="warning" />
              <Typography variant="body2">高楕円軌道 (Highly Elliptical Orbit) - 楕円形の軌道</Typography>
            </Box>
          </Box>
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            最大仰角:
          </Typography>
          <Typography variant="body2">
            観測地点から見た衛星の最も高い角度（地平線からの角度）です。90°が真上になります。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialogOpen(false)} color="primary">
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SatelliteList;

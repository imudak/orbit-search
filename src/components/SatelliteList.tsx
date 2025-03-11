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
  Divider,
  Badge,
  Avatar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Timeline as TimelineIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Satellite as SatelliteIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
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

// 最大仰角に応じた色を返す関数
const getElevationColor = (elevation: number): 'default' | 'error' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' => {
  if (elevation >= 45) {
    return 'success'; // 緑（最適）
  } else if (elevation >= 20) {
    return 'primary'; // 青（良好）
  } else if (elevation >= 10) {
    return 'warning'; // オレンジ（可視）
  } else {
    return 'error'; // 赤（不良）
  }
};

// 最大仰角に応じたラベルを返す関数
const getElevationLabel = (elevation: number): string => {
  if (elevation >= 45) {
    return '最適';
  } else if (elevation >= 20) {
    return '良好';
  } else if (elevation >= 10) {
    return '可視';
  } else {
    return '不良';
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

/**
 * 改良版衛星リストコンポーネント
 * 視認性と操作性を向上させた設計
 */
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // ローディング状態の表示
  if (isLoading) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Paper
          elevation={3}
          sx={{
            flex: 1,
            backgroundColor: 'white',
            overflow: 'auto',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* ヘッダー部分 */}
          <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.1)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2" sx={{
                fontWeight: 'bold',
                color: theme.palette.primary.main,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}>
                <SatelliteIcon />
                可視衛星リスト
              </Typography>
            </Box>

            {/* 検索パネル */}
            {searchPanel}
          </Box>

          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 4,
            height: '200px',
          }}>
            <CircularProgress size={48} />
            <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
              衛星データを読み込み中...
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  // 衛星が見つからない場合の表示
  if (satellites.length === 0) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Paper
          elevation={3}
          sx={{
            flex: 1,
            backgroundColor: 'white',
            overflow: 'auto',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* ヘッダー部分 */}
          <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.1)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2" sx={{
                fontWeight: 'bold',
                color: theme.palette.primary.main,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}>
                <SatelliteIcon />
                可視衛星リスト
              </Typography>
            </Box>

            {/* 検索パネル */}
            {searchPanel}
          </Box>

          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 4,
            height: '200px',
          }}>
            <Typography variant="body1" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              条件に一致する衛星が見つかりません。<br />
              検索条件を変更してお試しください。
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  // 衛星リストの表示
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper
        elevation={3}
        sx={{
          flex: 1,
          backgroundColor: 'white',
          overflow: 'auto',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* ヘッダー部分 */}
          <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.1)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2" sx={{
                fontWeight: 'bold',
                color: theme.palette.primary.main,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}>
                <SatelliteIcon />
                可視衛星
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="軌道種類と最大仰角について">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => setInfoDialogOpen(true)}
                  >
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Chip
                  label={`${satellites.length}個`}
                  color="primary"
                  size="small"
                  sx={{
                    fontWeight: 'bold',
                    minWidth: '60px',
                  }}
                />
              </Box>
            </Box>

            {/* 検索パネル */}
            {searchPanel}

            {/* フィルターとソートのオプション - シンプル化 */}
            <Box sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              mt: 1,
              borderTop: '1px solid rgba(0, 0, 0, 0.1)',
              pt: 1,
            }}>
              <Tooltip title="並び替え">
                <IconButton size="small" color="primary">
                  <SortIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* 衛星リスト */}
          <List
            disablePadding
            sx={{
              flex: 1,
              overflow: 'auto',
              '& .MuiListItem-root': {
                transition: 'background-color 0.2s ease',
              },
              '& .MuiListItem-root:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            {satellites.map((satellite, index) => {
              // 軌道種類を取得
              const orbitType = satellite.tle ? getOrbitType(satellite.tle) : '不明';
              // 最大仰角を取得
              const maxElevation = satellite.passes.length > 0 ? satellite.passes[0].maxElevation : 0;

              return (
                <ListItem
                  key={satellite.id}
                  disablePadding
                  divider
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="観測データをダウンロード">
                        <IconButton
                          edge="end"
                          aria-label="download-observation"
                          onClick={() => onObservationDataRequest(satellite)}
                          sx={{
                            color: theme.palette.primary.main,
                            backgroundColor: 'rgba(25, 118, 210, 0.05)',
                            '&:hover': {
                              backgroundColor: 'rgba(25, 118, 210, 0.1)',
                            }
                          }}
                        >
                          <TimelineIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="TLEデータをダウンロード">
                        <IconButton
                          edge="end"
                          aria-label="download-tle"
                          onClick={() => onTLEDownload(satellite)}
                          sx={{
                            color: theme.palette.secondary.main,
                            backgroundColor: 'rgba(156, 39, 176, 0.05)',
                            '&:hover': {
                              backgroundColor: 'rgba(156, 39, 176, 0.1)',
                            }
                          }}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemButton
                    selected={selectedSatellite?.id === satellite.id}
                    onClick={() => onSatelliteSelect(satellite)}
                    sx={{
                      py: 1.5,
                      px: 2,
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
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: getOrbitTypeColor(orbitType) === 'default'
                            ? 'grey.400'
                            : `${getOrbitTypeColor(orbitType)}.main`,
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                        }}
                      >
                        {orbitType}
                      </Avatar>
                    </Box>
                    <ListItemText
                      primary={
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            component="span"
                            sx={{
                              fontWeight: 'bold',
                              color: selectedSatellite?.id === satellite.id ? theme.palette.primary.main : 'inherit',
                              fontSize: '1rem',
                            }}
                          >
                            {satellite.name}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box component="span" sx={{ mt: 0.5, display: 'block' }}>
                          <Box component="span" sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Typography
                              variant="body2"
                              component="span"
                              color="text.secondary"
                              sx={{ mr: 1 }}
                            >
                              ID: {satellite.noradId}
                            </Typography>

                            {/* 最大仰角を表示（パスがある場合のみ） */}
                            {satellite.passes.length > 0 && (
                              <Tooltip title={`最大仰角: ${maxElevation.toFixed(1)}°`}>
                                <Chip
                                  size="small"
                                  label={`${getElevationLabel(maxElevation)} ${maxElevation.toFixed(1)}°`}
                                  color={getElevationColor(maxElevation)}
                                  sx={{
                                    fontWeight: 'bold',
                                    height: '24px',
                                    '& .MuiChip-label': {
                                      px: 1,
                                    }
                                  }}
                                />
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Paper>

      {/* 軌道情報ダイアログ */}
      <Dialog
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
          backgroundColor: theme.palette.primary.main,
          color: 'white',
        }}>
          衛星の軌道種類と最大仰角について
          <IconButton
            size="small"
            onClick={() => setInfoDialogOpen(false)}
            aria-label="close"
            sx={{ color: 'white' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" paragraph>
            衛星リストでは、各衛星の軌道種類と最大仰角を表示しています。これらの情報は衛星の可視性や観測条件を理解するのに役立ちます。
          </Typography>

          <Typography variant="h6" sx={{ mt: 2, mb: 1, color: theme.palette.primary.main }}>
            軌道種類:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'error.main', fontSize: '0.8rem' }}>LEO</Avatar>
              <Box>
                <Typography variant="subtitle2">低軌道 (Low Earth Orbit)</Typography>
                <Typography variant="body2" color="text.secondary">高度2,000km以下の軌道。ISS（国際宇宙ステーション）や多くの地球観測衛星が位置しています。</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'success.main', fontSize: '0.8rem' }}>MEO</Avatar>
              <Box>
                <Typography variant="subtitle2">中軌道 (Medium Earth Orbit)</Typography>
                <Typography variant="body2" color="text.secondary">高度2,000km〜35,786kmの軌道。GPSなどの測位衛星が位置しています。</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.8rem' }}>GEO</Avatar>
              <Box>
                <Typography variant="subtitle2">静止軌道 (Geostationary Orbit)</Typography>
                <Typography variant="body2" color="text.secondary">高度約35,786kmの赤道上の軌道。地球の自転と同じ速度で回るため、地上から見ると常に同じ位置に見えます。</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'warning.main', fontSize: '0.8rem' }}>HEO</Avatar>
              <Box>
                <Typography variant="subtitle2">高楕円軌道 (Highly Elliptical Orbit)</Typography>
                <Typography variant="body2" color="text.secondary">楕円形の軌道で、地球に近い点（近地点）と遠い点（遠地点）の高度差が大きい軌道です。</Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" sx={{ mt: 2, mb: 1, color: theme.palette.primary.main }}>
            最大仰角:
          </Typography>
          <Typography variant="body2" paragraph>
            観測地点から見た衛星の最も高い角度（地平線からの角度）です。90°が真上になります。
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip size="small" label="最適 45°↑" color="success" sx={{ minWidth: '100px' }} />
              <Typography variant="body2">非常に良好な観測条件。衛星が空高く見えます。</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip size="small" label="良好 20-45°" color="primary" sx={{ minWidth: '100px' }} />
              <Typography variant="body2">良好な観測条件。障害物が少ない場所であれば観測可能です。</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip size="small" label="可視 10-20°" color="warning" sx={{ minWidth: '100px' }} />
              <Typography variant="body2">観測可能ですが、建物や木などの障害物に注意が必要です。</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip size="small" label="不良 0-10°" color="error" sx={{ minWidth: '100px' }} />
              <Typography variant="body2">地平線に近く、観測条件は良くありません。障害物に隠れやすいです。</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setInfoDialogOpen(false)}
            color="primary"
            variant="contained"
          >
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SatelliteList;

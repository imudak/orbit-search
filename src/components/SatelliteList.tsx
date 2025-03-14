import React, { useState, useEffect, useMemo } from 'react';
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
  TextField,
  InputAdornment,
  Collapse,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Timeline as TimelineIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt';
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
 * リスト表示領域を拡大し、より多くの衛星を表示
 * NORAD IDによるフィルタリング機能を追加
 */
const SatelliteList: React.FC<SatelliteListProps> = ({
  satellites,
  onTLEDownload,
  onObservationDataRequest,
  onSatelliteSelect,
  selectedSatellite,
  isLoading = false,
  searchPanel, // 使用しない（Map/index.tsxで別途表示）
}) => {
  // 軌道情報ダイアログの状態
  const [infoDialogOpen, setInfoDialogOpen] = useState<boolean>(false);
  // フィルター関連の状態
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const [noradIdFilter, setNoradIdFilter] = useState<string>('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // メモリ使用量を削減するためにフィルタリングをステートではなく計算で行う
  // フィルタリングされた衛星リストを計算する（ステートに保存せず）
  const filteredSatellites: Array<Satellite & { passes: Pass[] }> = useMemo(() => {
    if (!noradIdFilter) {
      return satellites;
    }
    return satellites.filter(satellite =>
      satellite.id.toString().includes(noradIdFilter)
    );
  }, [satellites, noradIdFilter]);

  // フィルター入力の変更ハンドラー
  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNoradIdFilter(event.target.value);
  };

  // フィルターのクリアハンドラー
  const handleClearFilter = () => {
    setNoradIdFilter('');
  };

  // フィルターの開閉ハンドラー
  const toggleFilter = () => {
    setFilterOpen(!filterOpen);
  };

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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" component="h2" sx={{
                fontWeight: 'bold',
                color: theme.palette.primary.main,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}>
                <SatelliteAltIcon sx={{ color: 'primary.main' }} />
                可視衛星リスト
              </Typography>
            </Box>
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" component="h2" sx={{
                fontWeight: 'bold',
                color: theme.palette.primary.main,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}>
                <SatelliteAltIcon sx={{ color: 'primary.main' }} />
                可視衛星リスト
              </Typography>
            </Box>
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
          {/* ヘッダー部分 - コンパクト化 */}
          <Box sx={{
            p: 1.8,
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
          }}>
            <Box sx={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'nowrap'
            }}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minWidth: isMobile ? '120px' : '150px', // 「可視衛星リスト」が収まる最小幅を確保
                flex: '0 0 auto' // 幅を固定（伸縮しない）
              }}>
                <SatelliteAltIcon sx={{ color: 'primary.main', flexShrink: 0 }} />
                <Typography
                  variant="subtitle1"
                  component="h2"
                  sx={{
                    fontWeight: 'bold',
                    color: theme.palette.primary.main,
                    whiteSpace: 'nowrap', // テキストを一行に制限
                    overflow: 'visible', // はみ出しを許可
                  }}
                >
                  可視衛星リスト
                </Typography>
              </Box>

              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexShrink: 0 // 収縮しないように設定
              }}>
                <Tooltip title="NORAD IDでフィルタリング">
                  <IconButton
                    size="small"
                    color={filterOpen ? "primary" : "default"}
                    onClick={toggleFilter}
                    sx={{
                      backgroundColor: filterOpen ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                      padding: '4px', // パディングを小さくして省スペース化
                    }}
                  >
                    <FilterListIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="軌道種類と最大仰角について">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => setInfoDialogOpen(true)}
                    sx={{
                      padding: '4px', // パディングを小さくして省スペース化
                    }}
                  >
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Chip
                  label={filteredSatellites.length < satellites.length
                    ? `${filteredSatellites.length}/${satellites.length}`
                    : `${satellites.length}個`}
                  color="primary"
                  size="small"
                  sx={{
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                    height: '24px',
                    '& .MuiChip-label': {
                      px: 1,
                    }
                  }}
                />
              </Box>
            </Box>

            {/* NORAD IDフィルター入力欄 */}
            <Collapse in={filterOpen} timeout="auto" unmountOnExit>
              <Box sx={{ mt: 1, px: 1, pb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="NORAD IDで絞り込み"
                  value={noradIdFilter}
                  onChange={handleFilterChange}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: noradIdFilter && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={handleClearFilter}
                          edge="end"
                          aria-label="clear filter"
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: {
                      backgroundColor: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(0, 0, 0, 0.15)',
                      },
                    }
                  }}
                />
              </Box>
            </Collapse>
          </Box>

          {/* 衛星リスト - 表示領域拡大 */}
          <List
            disablePadding
            sx={{
              flex: 1,
              overflow: 'auto',
              maxHeight: 'calc(100vh - 200px)', // より多くのスペースを確保
              '& .MuiListItem-root': {
                transition: 'background-color 0.2s ease',
              },
              '& .MuiListItem-root:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            {filteredSatellites.length === 0 ? (
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                p: 4,
                height: '200px',
              }}>
                <Typography variant="body1" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                  NORAD ID「{noradIdFilter}」に一致する衛星が見つかりません。<br />
                  フィルター条件を変更してお試しください。
                </Typography>
              </Box>
            ) : (
              filteredSatellites.map((satellite, index) => {
              // 軌道種類を取得
              const orbitType = satellite.tle ? getOrbitType(satellite.tle) : '不明';
              // 最大仰角を取得
              const maxElevation = satellite.passes.length > 0
                ? Math.max(...satellite.passes.map(pass => pass.maxElevation))
                : 0;

              return (
                <ListItem
                  key={satellite.id}
                  disablePadding
                  divider
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="観測データをダウンロード">
                        <IconButton
                          edge="end"
                          aria-label="download-observation"
                          onClick={() => onObservationDataRequest(satellite)}
                          size="small"
                          sx={{
                            color: theme.palette.primary.main,
                            backgroundColor: 'rgba(25, 118, 210, 0.05)',
                            '&:hover': {
                              backgroundColor: 'rgba(25, 118, 210, 0.1)',
                            }
                          }}
                        >
                          <TimelineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="TLEデータをダウンロード">
                        <IconButton
                          edge="end"
                          aria-label="download-tle"
                          onClick={() => onTLEDownload(satellite)}
                          size="small"
                          sx={{
                            color: theme.palette.secondary.main,
                            backgroundColor: 'rgba(156, 39, 176, 0.05)',
                            '&:hover': {
                              backgroundColor: 'rgba(156, 39, 176, 0.1)',
                            }
                          }}
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemButton
                    selected={selectedSatellite?.id === satellite.id}
                    onClick={() => onSatelliteSelect(satellite)}
                    sx={{
                      py: 1.2, // 高さを適度に確保
                      px: 2.5, // 左右の余白を増やす
                      my: 0.3, // リスト項目間の余白を追加
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
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 2.5 }}>
                      <Avatar
                        sx={{
                          width: 36, // サイズを少し縮小
                          height: 36, // サイズを少し縮小
                          bgcolor: getOrbitTypeColor(orbitType) === 'default'
                            ? 'grey.400'
                            : `${getOrbitTypeColor(orbitType)}.main`,
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '0.9rem', // フォントサイズを少し縮小
                        }}
                      >
                        {orbitType}
                      </Avatar>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, width: '100%' }}>
                      {/* 番号とNORAD ID */}
                      <Typography
                        component="div"
                        sx={{
                          fontWeight: 'bold',
                          color: selectedSatellite?.id === satellite.id ? theme.palette.primary.main : 'inherit',
                          fontSize: '0.95rem', // フォントサイズを少し縮小
                        }}
                      >
                        {index + 1}. NORAD ID: {satellite.id}
                      </Typography>

                      {/* 最大仰角を別の行に表示 */}
                      <Chip
                        size="small"
                        label={`最大仰角: ${maxElevation.toFixed(1)}°`}
                        color={getElevationColor(maxElevation)}
                        sx={{
                          fontWeight: 'bold',
                          height: '20px', // 高さを少し縮小
                          alignSelf: 'flex-start',
                          '& .MuiChip-label': {
                            px: 1,
                            fontSize: '0.75rem', // フォントサイズを少し縮小
                          }
                        }}
                      />
                    </Box>
                  </ListItemButton>
                </ListItem>
              );
            }))}
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

import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Chip,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  LinearProgress,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BarChartIcon from '@mui/icons-material/BarChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { OrbitPath } from '@/types';

interface AnalysisPanelProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright' | 'bottom';
  orbitPaths: OrbitPath[];
}

// 分析タブの種類
enum AnalysisTab {
  SUMMARY = 'summary',
  DETAILS = 'details',
  VISIBILITY = 'visibility'
}

/**
 * 分析モード用のパネルコンポーネント
 * 衛星軌道の詳細な分析情報を表示
 */
const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  position = 'bottom',
  orbitPaths
}) => {
  const [currentTab, setCurrentTab] = useState<AnalysisTab>(AnalysisTab.SUMMARY);
  const [showHelp, setShowHelp] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 初回表示時にヘルプを表示
  useEffect(() => {
    if (orbitPaths.length > 0) {
      setShowHelp(true);
      const timer = setTimeout(() => {
        setShowHelp(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [orbitPaths.length]);

  // ポジションに応じたスタイルを設定
  const getPositionStyle = () => {
    if (position === 'bottom') {
      return {
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 40px)',
        maxWidth: '800px'
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

  // 軌道パスがない場合
  if (orbitPaths.length === 0) {
    return (
      <Paper
        sx={{
          position: 'absolute',
          ...getPositionStyle(),
          zIndex: 1000,
          padding: '10px',
          backgroundColor: 'rgba(76, 175, 80, 0.9)', // 緑色の背景（分析モードを強調）
          color: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(0, 100, 0, 0.1)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AssessmentIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            軌道分析モード
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ mt: 1 }}>
          分析するための軌道データがありません。衛星を選択してください。
        </Typography>
        <Box sx={{ mt: 1, p: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: '4px' }}>
          <Typography variant="caption">
            このモードでは、衛星の軌道を詳細に分析し、可視性や軌道特性を評価できます。
          </Typography>
        </Box>
      </Paper>
    );
  }

  // 軌道パスの統計情報を計算
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

  // 各軌道パスの統計情報
  const pathStats = orbitPaths.map(calculateStatistics);

  // タブ変更ハンドラー
  const handleTabChange = (_: React.SyntheticEvent, newValue: AnalysisTab) => {
    setCurrentTab(newValue);
  };

  // サマリータブの内容
  const renderSummaryTab = () => {
    return (
      <Box sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          {orbitPaths.map((path, index) => {
            const stats = pathStats[index];
            const visibilityCategory = getVisibilityCategory(path.maxElevation);

            return (
              <Grid item xs={12} md={orbitPaths.length > 1 ? 6 : 12} key={path.satelliteId}>
                <Card
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                      衛星ID: {path.satelliteId}
                      <Chip
                        label={`可視性: ${visibilityCategory.label}`}
                        color={visibilityCategory.color as any}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Typography>

                    <Box sx={{ mt: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="textSecondary">最大仰角</Typography>
                          <Typography variant="h6">{stats.maxElevationFromPath}°</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="textSecondary">平均仰角</Typography>
                          <Typography variant="h6">{stats.avgElevation}°</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="textSecondary">可視時間</Typography>
                          <Typography variant="h6">{stats.visibleTime}分</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="textSecondary">可視率</Typography>
                          <Typography variant="h6">{stats.visibilityRate}%</Typography>
                        </Grid>
                      </Grid>
                    </Box>

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="textSecondary">仰角分布</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Tooltip title={`最適 (45°以上): ${stats.distribution.optimal.toFixed(1)}%`}>
                          <Box>
                            <Typography variant="caption">最適</Typography>
                            <LinearProgress
                              variant="determinate"
                              value={stats.distribution.optimal}
                              sx={{
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: 'success.main',
                                }
                              }}
                            />
                          </Box>
                        </Tooltip>
                        <Tooltip title={`良好 (20-45°): ${stats.distribution.good.toFixed(1)}%`}>
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption">良好</Typography>
                            <LinearProgress
                              variant="determinate"
                              value={stats.distribution.good}
                              sx={{
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: 'rgba(25, 118, 210, 0.2)',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: 'primary.main',
                                }
                              }}
                            />
                          </Box>
                        </Tooltip>
                        <Tooltip title={`可視 (10-20°): ${stats.distribution.visible.toFixed(1)}%`}>
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption">可視</Typography>
                            <LinearProgress
                              variant="determinate"
                              value={stats.distribution.visible}
                              sx={{
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: 'rgba(255, 152, 0, 0.2)',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: 'warning.main',
                                }
                              }}
                            />
                          </Box>
                        </Tooltip>
                        <Tooltip title={`不良 (10°未満): ${stats.distribution.poor.toFixed(1)}%`}>
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption">不良</Typography>
                            <LinearProgress
                              variant="determinate"
                              value={stats.distribution.poor}
                              sx={{
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: 'rgba(211, 47, 47, 0.2)',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: 'error.main',
                                }
                              }}
                            />
                          </Box>
                        </Tooltip>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };

  // 詳細タブの内容
  const renderDetailsTab = () => {
    return (
      <Box sx={{ mt: 2 }}>
        {orbitPaths.map((path, index) => {
          const stats = pathStats[index];
          const visibilityCategory = getVisibilityCategory(path.maxElevation);

          return (
            <Box key={path.satelliteId} sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                衛星ID: {path.satelliteId}
                <Chip
                  label={`可視性: ${visibilityCategory.label}`}
                  color={visibilityCategory.color as any}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>

              <TableContainer component={Box} sx={{ mt: 1, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>項目</TableCell>
                      <TableCell align="right">値</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>最大仰角</TableCell>
                      <TableCell align="right">{stats.maxElevationFromPath}°</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>平均仰角</TableCell>
                      <TableCell align="right">{stats.avgElevation}°</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>最小仰角</TableCell>
                      <TableCell align="right">{stats.minElevation}°</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>総距離</TableCell>
                      <TableCell align="right">{stats.totalDistance} km</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>セグメント数</TableCell>
                      <TableCell align="right">{stats.totalSegments}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>ポイント数</TableCell>
                      <TableCell align="right">{stats.totalPoints}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>可視時間</TableCell>
                      <TableCell align="right">{stats.visibleTime}分</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>総時間</TableCell>
                      <TableCell align="right">{stats.totalTime}分</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>可視率</TableCell>
                      <TableCell align="right">{stats.visibilityRate}%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {index < orbitPaths.length - 1 && (
                <Divider sx={{ my: 1 }} />
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  // 可視性タブの内容
  const renderVisibilityTab = () => {
    return (
      <Box sx={{ mt: 2 }}>
        {orbitPaths.map((path, index) => {
          const stats = pathStats[index];

          return (
            <Box key={path.satelliteId} sx={{ mb: 2, backgroundColor: 'rgba(255, 255, 255, 0.9)', p: 2, borderRadius: '4px' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
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

              {index < orbitPaths.length - 1 && (
                <Divider sx={{ my: 2 }} />
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  // ヘルプパネル
  const renderHelpPanel = () => {
    if (!showHelp) return null;

    return (
      <Paper
        sx={{
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1001,
          padding: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
          maxWidth: '80%',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          分析モードの使い方
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BarChartIcon fontSize="small" sx={{ mr: 1 }} />
            <Typography variant="caption">サマリー: 主要な分析結果を視覚的に表示</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AssessmentIcon fontSize="small" sx={{ mr: 1 }} />
            <Typography variant="caption">詳細: すべての分析データを表形式で表示</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TimelineIcon fontSize="small" sx={{ mr: 1 }} />
            <Typography variant="caption">可視性: 仰角分布と可視性の詳細分析</Typography>
          </Box>
        </Box>
        <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
          タブを切り替えて、異なる視点から軌道データを分析できます。
        </Typography>
      </Paper>
    );
  };

  return (
    <>
      <Paper
        sx={{
          position: 'absolute',
          ...getPositionStyle(),
          zIndex: 1000,
          padding: '10px',
          backgroundColor: 'rgba(76, 175, 80, 0.9)', // 緑色の背景（分析モードを強調）
          color: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(0, 100, 0, 0.1)',
          maxHeight: '60vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <AssessmentIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
            軌道分析
          </Typography>
          <Tooltip title="分析ヘルプを表示">
            <IconButton
              size="small"
              onClick={() => setShowHelp(!showHelp)}
              sx={{ color: 'white', opacity: 0.8, '&:hover': { opacity: 1 } }}
            >
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            minHeight: '36px',
            '& .MuiTab-root': {
              minHeight: '36px',
              color: 'rgba(255, 255, 255, 0.7)',
              '&.Mui-selected': {
                color: 'white',
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'white',
            }
          }}
        >
          <Tab
            icon={<BarChartIcon fontSize="small" />}
            label="サマリー"
            value={AnalysisTab.SUMMARY}
            sx={{ fontSize: '0.75rem' }}
          />
          <Tab
            icon={<AssessmentIcon fontSize="small" />}
            label="詳細"
            value={AnalysisTab.DETAILS}
            sx={{ fontSize: '0.75rem' }}
          />
          <Tab
            icon={<TimelineIcon fontSize="small" />}
            label="可視性"
            value={AnalysisTab.VISIBILITY}
            sx={{ fontSize: '0.75rem' }}
          />
        </Tabs>

        <Box sx={{
          overflowY: 'auto',
          flex: '1 1 auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'rgba(0,0,0,0.1)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(255,255,255,0.3)',
            borderRadius: '4px',
          }
        }}>
          {currentTab === AnalysisTab.SUMMARY && renderSummaryTab()}
          {currentTab === AnalysisTab.DETAILS && renderDetailsTab()}
          {currentTab === AnalysisTab.VISIBILITY && renderVisibilityTab()}
        </Box>
      </Paper>
      {renderHelpPanel()}
    </>
  );
};

export default AnalysisPanel;

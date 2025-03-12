import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  useTheme,
} from '@mui/material';
import type { OrbitPath } from '@/types';

interface SatelliteInfoTabProps {
  orbitPaths: OrbitPath[];
  pathStats: Array<{
    totalPoints: number;
    totalSegments: number;
    totalDistance: string;
    minElevation: string;
    maxElevation: string;
    avgElevation: string;
    maxElevationFromPath: string;
    visibleTime: number;
    totalTime: number;
    visibilityRate: string;
    distribution: {
      optimal: number;
      good: number;
      visible: number;
      poor: number;
    };
  }>;
}

/**
 * 衛星情報タブコンポーネント
 * 衛星軌道の詳細情報と可視性分析を統合して表示
 */
const SatelliteInfoTab: React.FC<SatelliteInfoTabProps> = ({ orbitPaths, pathStats }) => {
  const theme = useTheme();

  return (
    <Box sx={{ mt: 2 }} role="tabpanel" aria-labelledby="tab-satellite-info">
      {orbitPaths.map((path, index) => {
        const stats = pathStats[index];

        return (
          <Box
            key={path.satelliteId}
            sx={{
              mb: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              p: 2,
              borderRadius: '4px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
            }}
          >
            <Typography
              variant="body1"
              sx={{
                fontWeight: 'bold',
                fontSize: '1rem',
                color: theme.palette.text.primary,
                lineHeight: 1.5,
              }}
            >
              衛星ID: {path.satelliteId}
            </Typography>

            {/* 仰角分布 */}
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="body1"
                sx={{
                  mb: 1,
                  fontSize: '1rem',
                  color: theme.palette.text.primary,
                  fontWeight: 'medium',
                }}
              >
                仰角分布
              </Typography>

              {/* 最適 */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ width: '120px', mr: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.9rem',
                      color: theme.palette.text.primary,
                      lineHeight: 1.5,
                    }}
                  >
                    最適 (45°以上)
                  </Typography>
                </Box>
                <Box sx={{ flexGrow: 1, mr: 2 }}>
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
                    aria-label={`最適仰角の割合: ${stats.distribution.optimal.toFixed(1)}%`}
                  />
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: '1rem',
                    color: theme.palette.text.primary,
                    fontWeight: 'medium',
                    minWidth: '50px',
                    textAlign: 'right',
                  }}
                >
                  {stats.distribution.optimal.toFixed(1)}%
                </Typography>
              </Box>

              {/* 良好 */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ width: '120px', mr: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.9rem',
                      color: theme.palette.text.primary,
                      lineHeight: 1.5,
                    }}
                  >
                    良好 (20-45°)
                  </Typography>
                </Box>
                <Box sx={{ flexGrow: 1, mr: 2 }}>
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
                    aria-label={`良好仰角の割合: ${stats.distribution.good.toFixed(1)}%`}
                  />
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: '1rem',
                    color: theme.palette.text.primary,
                    fontWeight: 'medium',
                    minWidth: '50px',
                    textAlign: 'right',
                  }}
                >
                  {stats.distribution.good.toFixed(1)}%
                </Typography>
              </Box>

              {/* 可視 */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ width: '120px', mr: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.9rem',
                      color: theme.palette.text.primary,
                      lineHeight: 1.5,
                    }}
                  >
                    可視 (10-20°)
                  </Typography>
                </Box>
                <Box sx={{ flexGrow: 1, mr: 2 }}>
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
                    aria-label={`可視仰角の割合: ${stats.distribution.visible.toFixed(1)}%`}
                  />
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: '1rem',
                    color: theme.palette.text.primary,
                    fontWeight: 'medium',
                    minWidth: '50px',
                    textAlign: 'right',
                  }}
                >
                  {stats.distribution.visible.toFixed(1)}%
                </Typography>
              </Box>

              {/* 不良 */}
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '120px', mr: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.9rem',
                      color: theme.palette.text.primary,
                      lineHeight: 1.5,
                    }}
                  >
                    不良 (10°未満)
                  </Typography>
                </Box>
                <Box sx={{ flexGrow: 1, mr: 2 }}>
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
                    aria-label={`不良仰角の割合: ${stats.distribution.poor.toFixed(1)}%`}
                  />
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: '1rem',
                    color: theme.palette.text.primary,
                    fontWeight: 'medium',
                    minWidth: '50px',
                    textAlign: 'right',
                  }}
                >
                  {stats.distribution.poor.toFixed(1)}%
                </Typography>
              </Box>
            </Box>

            {/* 可視性サマリー */}
            <Box sx={{ mt: 3 }}>
              <Typography
                variant="body1"
                sx={{
                  mb: 1,
                  fontSize: '1rem',
                  color: theme.palette.text.primary,
                  fontWeight: 'medium',
                }}
              >
                可視性サマリー
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                      border: '1px solid rgba(76, 175, 80, 0.2)',
                      borderRadius: '4px',
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.primary"
                      sx={{
                        fontSize: '0.9rem',
                        fontWeight: 'medium',
                        mb: 1,
                      }}
                    >
                      可視時間
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontSize: '1.25rem',
                        color: theme.palette.text.primary,
                        fontWeight: 'bold',
                      }}
                    >
                      {stats.visibleTime}分
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                      border: '1px solid rgba(76, 175, 80, 0.2)',
                      borderRadius: '4px',
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.primary"
                      sx={{
                        fontSize: '0.9rem',
                        fontWeight: 'medium',
                        mb: 1,
                      }}
                    >
                      可視率
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontSize: '1.25rem',
                        color: theme.palette.text.primary,
                        fontWeight: 'bold',
                      }}
                    >
                      {stats.visibilityRate}%
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            {/* 詳細データ */}
            <Box sx={{ mt: 3 }}>
              <Typography
                variant="body1"
                sx={{
                  mb: 1,
                  fontSize: '1rem',
                  color: theme.palette.text.primary,
                  fontWeight: 'medium',
                }}
              >
                詳細データ
              </Typography>
              <TableContainer
                component={Box}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '4px',
                }}
              >
                <Table size="medium" aria-label={`衛星${path.satelliteId}の詳細データ`}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: '1rem', fontWeight: 'medium', color: theme.palette.text.primary }}>
                        項目
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '1rem', fontWeight: 'medium', color: theme.palette.text.primary }}>
                        値
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>最大仰角</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>{stats.maxElevationFromPath}°</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>平均仰角</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>{stats.avgElevation}°</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>最小仰角</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>{stats.minElevation}°</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>総距離</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>{stats.totalDistance} km</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>セグメント数</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>{stats.totalSegments}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>ポイント数</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>{stats.totalPoints}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>総時間</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>{stats.totalTime}分</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
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

export default SatelliteInfoTab;

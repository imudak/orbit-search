import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Paper,
  Grid,
  Divider,
  useTheme,
} from '@mui/material';
import type { OrbitPath } from '@/types';

interface VisibilityAnalysisTabProps {
  orbitPaths: OrbitPath[];
  pathStats: Array<{
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
 * 可視性分析タブコンポーネント
 * 衛星軌道の可視性に関する詳細な分析情報を表示
 */
const VisibilityAnalysisTab: React.FC<VisibilityAnalysisTabProps> = ({ orbitPaths, pathStats }) => {
  const theme = useTheme();

  return (
    <Box sx={{ mt: 2 }} role="tabpanel" aria-labelledby="tab-visibility">
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

            {index < orbitPaths.length - 1 && (
              <Divider sx={{ my: 2 }} />
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default VisibilityAnalysisTab;

import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Chip,
  Typography,
  useTheme,
} from '@mui/material';
import type { OrbitPath } from '@/types';

interface DetailedAnalysisTabProps {
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
  }>;
}

/**
 * 詳細分析タブコンポーネント
 * 衛星軌道の詳細な分析情報を表形式で表示
 */
const DetailedAnalysisTab: React.FC<DetailedAnalysisTabProps> = ({ orbitPaths, pathStats }) => {
  const theme = useTheme();

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
    <Box sx={{ mt: 2 }} role="tabpanel" aria-labelledby="tab-details">
      {orbitPaths.map((path, index) => {
        const stats = pathStats[index];
        const visibilityCategory = getVisibilityCategory(path.maxElevation);

        return (
          <Box key={path.satelliteId} sx={{ mb: 2 }}>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                fontSize: '1rem',
                color: theme.palette.text.primary,
                lineHeight: 1.5,
              }}
            >
              衛星ID: {path.satelliteId}
              <Chip
                label={`可視性: ${visibilityCategory.label}`}
                color={visibilityCategory.color as any}
                size="medium"
                sx={{
                  ml: 1,
                  fontSize: '0.875rem',
                  height: '28px',
                }}
              />
            </Typography>

            <TableContainer
              component={Box}
              sx={{
                mt: 1,
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
                    <TableCell sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>可視時間</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>{stats.visibleTime}分</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>総時間</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>{stats.totalTime}分</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>可視率</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.9rem', color: theme.palette.text.primary }}>{stats.visibilityRate}%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {index < orbitPaths.length - 1 && (
              <Divider sx={{ my: 2 }} />
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default DetailedAnalysisTab;

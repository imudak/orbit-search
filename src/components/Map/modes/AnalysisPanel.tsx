import React from 'react';
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
  Chip
} from '@mui/material';
import type { OrbitPath } from '@/types';

interface AnalysisPanelProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright' | 'bottom';
  orbitPaths: OrbitPath[];
}

/**
 * 分析モード用のパネルコンポーネント
 * 衛星軌道の詳細な分析情報を表示
 */
const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  position = 'bottom',
  orbitPaths
}) => {
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
          backgroundColor: 'rgba(240, 240, 255, 0.95)',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(0, 0, 100, 0.1)',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          軌道分析
        </Typography>
        <Typography variant="body2">
          分析するための軌道データがありません。衛星を選択してください。
        </Typography>
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

    // 各セグメントのポイントを処理
    path.segments.forEach(segment => {
      totalPoints += segment.points.length;

      // 各ポイントの実効的な角度を処理
      segment.effectiveAngles.forEach(angle => {
        minElevation = Math.min(minElevation, angle);
        maxElevation = Math.max(maxElevation, angle);
        elevationSum += angle;
        elevationCount++;
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

    return {
      totalPoints,
      totalSegments: path.segments.length,
      totalDistance: totalDistance.toFixed(2),
      minElevation: minElevation === Infinity ? 0 : minElevation.toFixed(2),
      maxElevation: maxElevation === -Infinity ? 0 : maxElevation.toFixed(2),
      avgElevation: avgElevation.toFixed(2),
      maxElevationFromPath: path.maxElevation.toFixed(2)
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

  return (
    <Paper
      sx={{
        position: 'absolute',
        ...getPositionStyle(),
        zIndex: 1000,
        padding: '10px',
        backgroundColor: 'rgba(240, 240, 255, 0.95)',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(0, 0, 100, 0.1)',
        maxHeight: '300px',
        overflow: 'auto'
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.1)', pb: 0.5 }}>
        軌道分析
      </Typography>

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

            <TableContainer component={Box} sx={{ mt: 1 }}>
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
                </TableBody>
              </Table>
            </TableContainer>

            {index < orbitPaths.length - 1 && (
              <Divider sx={{ my: 1 }} />
            )}
          </Box>
        );
      })}
    </Paper>
  );
};

export default AnalysisPanel;

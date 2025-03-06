import React from 'react';
import { Paper, Typography, Box, Chip } from '@mui/material';
import type { Location, OrbitPath } from '@/types';

interface NormalPanelProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright' | 'bottom';
  center: Location;
  orbitPaths: OrbitPath[];
}

/**
 * 通常モード用のパネルコンポーネント
 * 基本的な情報のみを表示
 */
const NormalPanel: React.FC<NormalPanelProps> = ({
  position = 'bottomleft',
  center,
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
        maxWidth: '300px',
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.1)', pb: 0.5 }}>
        基本情報
      </Typography>

      {/* 観測地点情報 */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
          観測地点
        </Typography>
        <Typography variant="body2">
          緯度: {center.lat.toFixed(6)}°<br />
          経度: {center.lng.toFixed(6)}°
        </Typography>
      </Box>

      {/* 衛星情報（選択されている場合） */}
      {orbitPaths.length > 0 && (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            選択中の衛星
          </Typography>
          {orbitPaths.map(path => {
            const visibilityCategory = getVisibilityCategory(path.maxElevation);

            return (
              <Box key={path.satelliteId} sx={{ mt: 1 }}>
                <Typography variant="body2">
                  衛星ID: {path.satelliteId}
                </Typography>
                <Box sx={{ display: 'flex', mt: 0.5 }}>
                  <Chip
                    label={`最大仰角: ${path.maxElevation.toFixed(1)}°`}
                    size="small"
                    sx={{ mr: 1 }}
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
        </Box>
      )}

      {/* 衛星が選択されていない場合 */}
      {orbitPaths.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          衛星が選択されていません。衛星リストから衛星を選択してください。
        </Typography>
      )}
    </Paper>
  );
};

export default NormalPanel;

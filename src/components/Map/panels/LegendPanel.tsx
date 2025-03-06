import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { OrbitType, DEFAULT_ORBIT_TYPES } from '../layers/VisibilityCircleLayer';

interface LegendPanelProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  minElevation: number;
  orbitTypes?: OrbitType[];
}

/**
 * 地図の凡例を表示するパネルコンポーネント
 */
const LegendPanel: React.FC<LegendPanelProps> = ({
  position = 'bottomright',
  minElevation,
  orbitTypes = DEFAULT_ORBIT_TYPES
}) => {
  // ポジションに応じたスタイルを設定
  const getPositionStyle = () => {
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
        return { bottom: '10px', right: '10px' };
    }
  };

  return (
    <Paper
      sx={{
        position: 'absolute',
        ...getPositionStyle(),
        zIndex: 1000,
        padding: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '4px',
        boxShadow: '0 0 5px rgba(0, 0, 0, 0.3)',
        maxWidth: '300px',
      }}
    >
      {/* 凡例のタイトル */}
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.1)', pb: 0.5 }}>
        地図の色分け説明
      </Typography>

      {/* 可視範囲の凡例 */}
      <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
        ① 衛星軌道種類別の可視範囲（円）
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
        各高度の衛星が最低仰角{minElevation}°以上で見える範囲
      </Typography>
      {orbitTypes.map((orbitType) => (
        <Box key={orbitType.name} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Box
            sx={{
              width: '16px',
              height: '16px',
              backgroundColor: orbitType.color,
              opacity: 0.7,
              mr: 1,
              border: '1px solid rgba(0, 0, 0, 0.3)',
            }}
          />
          <Typography variant="body2">
            {orbitType.name}（{orbitType.name === 'LEO' ? '低軌道' : orbitType.name === 'MEO' ? '中軌道' : '静止軌道'}）: {orbitType.height.toLocaleString()}km
          </Typography>
        </Box>
      ))}

      {/* 軌道の色分け凡例 */}
      <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 2, borderTop: '1px solid rgba(0, 0, 0, 0.1)', pt: 1 }}>
        ② 衛星軌道の色分け（線）
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
        実効的な角度（見やすさ）に基づく色分け
      </Typography>
      {[
        { angle: '45°以上', color: '#FF0000', weight: 4, description: '最も見やすい' },
        { angle: '20°〜45°', color: '#FFA500', weight: 3, description: '見やすい' },
        { angle: '10°〜20°', color: '#0000FF', weight: 2, description: '見にくい' },
        { angle: '10°未満', color: '#808080', weight: 1, description: '最も見にくい' },
      ].map((item, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Box
            sx={{
              width: '20px',
              height: `${item.weight}px`,
              backgroundColor: item.color,
              mr: 1,
            }}
          />
          <Typography variant="body2">
            {item.angle}: {item.description}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
};

export default LegendPanel;

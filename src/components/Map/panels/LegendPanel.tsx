import React from 'react';
import { Paper, Typography, Box, Collapse, Switch, Tooltip } from '@mui/material';
import { OrbitType, DEFAULT_ORBIT_TYPES } from '../layers/VisibilityCircleLayer';
import { useLayerManager } from '../layers/LayerManager';

interface LegendPanelProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright' | 'center';
  minElevation: number;
  orbitTypes?: OrbitType[];
  isLegendOpen?: boolean;
  isLayersOpen?: boolean;
}

/**
 * 地図の凡例を表示するパネルコンポーネント
 */
const LegendPanel: React.FC<LegendPanelProps> = ({
  position = 'center',
  minElevation,
  orbitTypes = DEFAULT_ORBIT_TYPES,
  isLegendOpen = false,
  isLayersOpen = false
}) => {
  const { layers, toggleLayer } = useLayerManager();

  // ポジションに応じたスタイルを設定
  const getPositionStyle = () => {
    if (position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    return {
      ...(position.includes('top') ? { top: '10px' } : { bottom: '10px' }),
      ...(position.includes('right') ? { right: '10px' } : { left: '10px' }),
    };
  };

  return (
    <Box sx={{
      position: 'absolute',
      ...getPositionStyle(),
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: position === 'center' ? 'center' : position.includes('right') ? 'flex-end' : 'flex-start',
      gap: 1
    }}>
      <Collapse in={isLegendOpen} sx={{ minWidth: 0 }}>
        <Paper
          elevation={2}
          sx={{
            padding: '4px 6px',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            borderRadius: '4px',
            width: position === 'center' ? '400px' : 'fit-content',
            minWidth: '120px',
            maxWidth: position === 'center' ? '80%' : '180px',
            fontSize: '0.75rem',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
            }
          }}
        >
        {/* 衛星の種類 */}
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mb: 0.5 }}>
          軌道の種類と高度
        </Typography>
        {orbitTypes.map((orbitType) => (
          <Box key={orbitType.name} sx={{ display: 'flex', alignItems: 'center', mb: 0.3 }}>
            <Box
              sx={{
                width: '8px',
                height: '8px',
                backgroundColor: orbitType.color,
                opacity: 0.7,
                mr: 0.5,
                border: '1px solid rgba(0, 0, 0, 0.3)',
              }}
            />
            <Typography sx={{ fontSize: '0.7rem' }}>
              {orbitType.name}: {orbitType.height.toLocaleString()}km
            </Typography>
          </Box>
        ))}

        {/* 可視性の色分け */}
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 1, mb: 0.5, borderTop: '1px solid rgba(0, 0, 0, 0.1)', pt: 0.5 }}>
          衛星の見やすさ
        </Typography>
        {[
          { angle: '45°↑', color: '#FF0000', weight: 2 },
          { angle: '20-45°', color: '#FFA500', weight: 2 },
          { angle: '↓20°', color: '#808080', weight: 2 },
        ].map((item, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.3 }}>
            <Box
              sx={{
                width: '12px',
                height: '2px',
                backgroundColor: item.color,
                mr: 0.5,
              }}
            />
            <Typography sx={{ fontSize: '0.7rem' }}>
              {item.angle}
            </Typography>
          </Box>
        ))}
      </Paper>
    </Collapse>

    <Collapse in={isLayersOpen} sx={{ minWidth: 0 }}>
      <Paper
        elevation={2}
        sx={{
          padding: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          borderRadius: '4px',
          width: '200px',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
          }
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1 }}>レイヤー設定</Typography>
        {layers.map((layer) => (
          <Box
            key={layer.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: layer.color || 'primary.main',
                  borderRadius: '2px',
                }}
              />
              <Tooltip title={layer.description || ''}>
                <Typography variant="body2">{layer.name}</Typography>
              </Tooltip>
            </Box>
            <Switch
              size="small"
              checked={layer.isVisible}
              onChange={() => toggleLayer(layer.id)}
            />
          </Box>
        ))}
      </Paper>
    </Collapse>
  </Box>
  );
};

export default LegendPanel;

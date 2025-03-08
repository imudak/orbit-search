import React from 'react';
import {
  Paper, Typography, Box, IconButton, Collapse, Tooltip, Switch
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useLayerManager } from '../layers/LayerManager';

interface LayerSettingsPanelProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright' | 'center';
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * レイヤー設定を表示するパネルコンポーネント
 */
const LayerSettingsPanel: React.FC<LayerSettingsPanelProps> = ({
  position = 'topright',
  isOpen = false,
  onClose,
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
        return { top: '10px', right: '10px' };
    }
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        ...getPositionStyle(),
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: position === 'center' ? 'center' : position.includes('right') ? 'flex-end' : 'flex-start',
        minWidth: '250px',
        maxWidth: '350px',
      }}
      onWheel={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <Collapse
        in={isOpen}
        sx={{ width: '100%' }}
        onWheel={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <Paper
          sx={{
            padding: '10px',
            backgroundColor: 'rgba(240, 240, 255, 0.95)',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(0, 0, 100, 0.1)',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
          onWheel={(e) => {
            // マウスホイールイベントが伝播しないようにする
            e.stopPropagation();
            // デフォルトの動作も防止
            e.preventDefault();
          }}
        >
          {/* ヘッダー部分 */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
            pb: 0.5,
            mb: 1
          }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              レイヤー設定
            </Typography>
            {onClose && (
              <IconButton
                size="small"
                onClick={onClose}
                sx={{ padding: '2px' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          {/* レイヤー設定コンテンツ */}
          <Box
            sx={{
              overflowY: 'auto',
              flex: '1 1 auto',
              pr: 1, // スクロールバー用の余白
              maxHeight: 'calc(60vh - 60px)', // 最大高さを明示的に設定
              // スクロールバーのスタイル
              '&::-webkit-scrollbar': {
                width: '8px',
                display: 'block', // スクロールバーを常に表示
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
              }
            }}
          >
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
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default LayerSettingsPanel;

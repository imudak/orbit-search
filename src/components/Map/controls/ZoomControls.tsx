import React from 'react';
import { useMap } from 'react-leaflet';
import { Box, Button, ButtonGroup } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

interface ZoomControlsProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
}

/**
 * 地図のズームコントロールコンポーネント
 * ズームイン・ズームアウトの機能を提供
 */
const ZoomControls: React.FC<ZoomControlsProps> = ({
  position = 'topright'
}) => {
  // Leafletのマップインスタンスを取得
  const map = useMap();

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
        return { top: '10px', right: '10px' };
    }
  };

  // ズームインボタンのクリックハンドラー
  const handleZoomIn = () => {
    map.zoomIn();
  };

  // ズームアウトボタンのクリックハンドラー
  const handleZoomOut = () => {
    map.zoomOut();
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        ...getPositionStyle(),
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: '4px',
        padding: '5px',
        boxShadow: '0 0 5px rgba(0, 0, 0, 0.3)',
      }}
    >
      <ButtonGroup orientation="vertical" size="small">
        <Button onClick={handleZoomIn} title="ズームイン">
          <ZoomInIcon fontSize="small" />
        </Button>
        <Button onClick={handleZoomOut} title="ズームアウト">
          <ZoomOutIcon fontSize="small" />
        </Button>
      </ButtonGroup>
    </Box>
  );
};

export default ZoomControls;

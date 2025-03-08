import React from 'react';
import { useMap } from 'react-leaflet';
import { Box, Button, ButtonGroup } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import HomeIcon from '@mui/icons-material/Home';
import L from 'leaflet';
import type { Location } from '@/types';

interface ViewControlsProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  currentCenter?: Location;
  defaultZoom?: number;
}

/**
 * 地図の表示コントロールコンポーネント
 * 全体表示、選択地点に戻るなどの機能を提供
 */
const ViewControls: React.FC<ViewControlsProps> = ({
  position = 'topright',
  currentCenter,
  defaultZoom = 5
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

  // 全体表示ボタンのクリックハンドラー
  const handleFullView = () => {
    // 日本全体が見えるように表示
    const japanBounds = L.latLngBounds(
      L.latLng(24.0, 122.0), // 南西端（沖縄付近）
      L.latLng(46.0, 146.0)  // 北東端（北海道付近）
    );

    // 境界が有効な場合、その範囲に合わせて表示
    if (japanBounds.isValid()) {
      map.fitBounds(japanBounds, { padding: [50, 50] });
    }
  };

  // 元の縮尺に戻すボタンのクリックハンドラー
  const handleResetView = () => {
    if (currentCenter) {
      // 現在の観測地点を中心に、デフォルトのズームレベルに戻す
      map.setView([currentCenter.lat, currentCenter.lng], defaultZoom);
    }
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
        ml: position === 'topright' ? '60px' : 0, // ZoomControlsの横に配置する場合
      }}
    >
      <ButtonGroup orientation="horizontal" size="small">
        <Button onClick={handleFullView} title="日本全体表示">
          <FullscreenIcon fontSize="small" />
        </Button>
        <Button
          onClick={handleResetView}
          title="選択地点に戻る"
          disabled={!currentCenter}
        >
          <HomeIcon fontSize="small" />
        </Button>
      </ButtonGroup>
    </Box>
  );
};

export default ViewControls;

import React, { useState } from 'react';
import { IconButton, Box, Tooltip, Divider } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import HomeIcon from '@mui/icons-material/Home';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LayersIcon from '@mui/icons-material/Layers';
import InfoIcon from '@mui/icons-material/Info';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Location } from '@/types';

interface MapControlIconsProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  currentCenter?: Location;
  defaultZoom?: number;
  onToggleInfo?: () => void;
  onToggleModePanel?: () => void;
  onToggleLayers?: () => void;
  onToggleLayerSettings?: () => void;
}

/**
 * 地図操作用のアイコンコントロールコンポーネント
 */
const MapControlIcons: React.FC<MapControlIconsProps> = ({
  position = 'topright',
  currentCenter,
  defaultZoom = 5,
  onToggleInfo,
  onToggleModePanel,
  onToggleLayers,
  onToggleLayerSettings,
}) => {
  const map = useMap();

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

  const handleZoomIn = (e: React.MouseEvent<HTMLButtonElement>) => {
    // クリックイベントが地図まで伝播しないようにする
    e.stopPropagation();
    map.zoomIn();
  };

  const handleZoomOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    // クリックイベントが地図まで伝播しないようにする
    e.stopPropagation();
    map.zoomOut();
  };

  const handleFullView = (e: React.MouseEvent<HTMLButtonElement>) => {
    // クリックイベントが地図まで伝播しないようにする
    e.stopPropagation();
    const japanBounds = L.latLngBounds(
      L.latLng(24.0, 122.0), // 南西端（沖縄付近）
      L.latLng(46.0, 146.0)  // 北東端（北海道付近）
    );
    if (japanBounds.isValid()) {
      map.fitBounds(japanBounds, { padding: [50, 50] });
    }
  };

  const handleResetView = (e: React.MouseEvent<HTMLButtonElement>) => {
    // クリックイベントが地図まで伝播しないようにする
    e.stopPropagation();
    if (currentCenter) {
      map.setView([currentCenter.lat, currentCenter.lng], defaultZoom);
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
        gap: 1,
        '& .MuiIconButton-root': {
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 1)',
          },
        },
      }}
    >
      {/* 地図操作アイコン */}
      <Tooltip title="拡大" placement="left">
        <IconButton size="small" onClick={handleZoomIn}>
          <ZoomInIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="縮小" placement="left">
        <IconButton size="small" onClick={handleZoomOut}>
          <ZoomOutIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="全体表示" placement="left">
        <IconButton size="small" onClick={handleFullView}>
          <FullscreenIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="地点に戻る" placement="left">
        <IconButton
          size="small"
          onClick={handleResetView}
          disabled={!currentCenter}
        >
          <HomeIcon />
        </IconButton>
      </Tooltip>

      {/* 区切り線 */}
      <Divider sx={{ my: 0.5 }} />

      {/* 情報表示アイコン */}
      {onToggleInfo && (
        <Tooltip title="衛星情報" placement="left">
          <IconButton size="small" onClick={(e) => {
            e.stopPropagation();
            onToggleInfo();
          }}>
            <InfoIcon />
          </IconButton>
        </Tooltip>
      )}
      {onToggleModePanel && (
        <Tooltip title="モードパネル" placement="left">
          <IconButton size="small" onClick={(e) => {
            e.stopPropagation();
            onToggleModePanel();
          }}>
            <DashboardIcon />
          </IconButton>
        </Tooltip>
      )}
      {onToggleLayerSettings && (
        <Tooltip title="レイヤー設定" placement="left">
          <IconButton size="small" onClick={(e) => {
            e.stopPropagation();
            onToggleLayerSettings();
          }}>
            <LayersIcon />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default MapControlIcons;

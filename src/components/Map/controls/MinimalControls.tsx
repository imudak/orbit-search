import React from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Location } from '@/types';

// コントロールボタンのスタイル
const ControlButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  color: theme.palette.primary.main,
  border: '1px solid rgba(0, 0, 0, 0.2)',
  borderRadius: '8px',
  padding: '12px',
  minWidth: '44px',
  minHeight: '44px',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
  },
  '&:active': {
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
    transform: 'translateY(1px)',
  },
  '& .MuiSvgIcon-root': {
    fontSize: '1.5rem',
  },
}));

// コントロールコンテナのスタイル
const ControlContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: '20px',
  right: '20px',
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  [theme.breakpoints.down('sm')]: {
    bottom: '10px',
    right: '10px',
    gap: '8px',
  },
}));

interface MinimalControlsProps {
  currentCenter?: Location;
  onMyLocationClick?: () => void;
}

/**
 * 最小限の地図コントロールコンポーネント
 * 視認性と操作性を向上させた大きなコントロールボタンを提供
 */
const MinimalControls: React.FC<MinimalControlsProps> = ({
  currentCenter,
  onMyLocationClick,
}) => {
  const map = useMap();

  // ズームイン
  const handleZoomIn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    map.zoomIn();
  };

  // ズームアウト
  const handleZoomOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    map.zoomOut();
  };

  // 現在地に移動
  const handleMyLocation = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onMyLocationClick) {
      onMyLocationClick();
    } else if (currentCenter) {
      map.setView([currentCenter.lat, currentCenter.lng], 13);
    } else {
      // ブラウザのジオロケーションAPIを使用
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.setView([latitude, longitude], 13);
        },
        (error) => {
          console.error('位置情報の取得に失敗しました:', error);
          // エラー時はデフォルト位置（東京）に移動
          map.setView([35.6812, 139.7671], 10);
        }
      );
    }
  };

  // フルスクリーン切替
  const handleFullscreen = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    const mapContainer = map.getContainer();

    if (!document.fullscreenElement) {
      // フルスクリーンに切り替え
      if (mapContainer.requestFullscreen) {
        mapContainer.requestFullscreen();
      } else if ((mapContainer as any).mozRequestFullScreen) {
        (mapContainer as any).mozRequestFullScreen();
      } else if ((mapContainer as any).webkitRequestFullscreen) {
        (mapContainer as any).webkitRequestFullscreen();
      } else if ((mapContainer as any).msRequestFullscreen) {
        (mapContainer as any).msRequestFullscreen();
      }
    } else {
      // フルスクリーンを解除
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }

    // フルスクリーン切替後にマップサイズを更新
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  };

  return (
    <ControlContainer>
      <Tooltip title="拡大" placement="left">
        <ControlButton onClick={handleZoomIn} aria-label="拡大">
          <ZoomInIcon />
        </ControlButton>
      </Tooltip>

      <Tooltip title="縮小" placement="left">
        <ControlButton onClick={handleZoomOut} aria-label="縮小">
          <ZoomOutIcon />
        </ControlButton>
      </Tooltip>

      <Tooltip title="現在地" placement="left">
        <ControlButton onClick={handleMyLocation} aria-label="現在地">
          <MyLocationIcon />
        </ControlButton>
      </Tooltip>

      <Tooltip title="全画面表示" placement="left">
        <ControlButton onClick={handleFullscreen} aria-label="全画面表示">
          <FullscreenIcon />
        </ControlButton>
      </Tooltip>
    </ControlContainer>
  );
};

export default MinimalControls;

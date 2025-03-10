import React, { useState } from 'react';
import {
  Box,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Tooltip,
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import HomeIcon from '@mui/icons-material/Home';
import LayersIcon from '@mui/icons-material/Layers';
import MapIcon from '@mui/icons-material/Map';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Location } from '@/types';
import { useLayerManager } from '../layers/LayerManager';

interface MobileControlsProps {
  currentCenter?: Location;
  defaultZoom?: number;
}

/**
 * モバイル向けのコンパクトなコントロールコンポーネント
 * SpeedDialを使用して、必要な機能をコンパクトに提供
 */
const MobileControls: React.FC<MobileControlsProps> = ({
  currentCenter,
  defaultZoom = 5,
}) => {
  // SpeedDialの開閉状態
  const [open, setOpen] = useState(false);

  // Leafletのマップインスタンスを取得
  const map = useMap();

  // レイヤー管理コンテキストを使用
  const { layers, toggleLayer } = useLayerManager();

  // SpeedDialの開閉を切り替える
  const handleToggle = () => {
    setOpen(!open);
  };

  // SpeedDialを閉じる
  const handleClose = () => {
    setOpen(false);
  };

  // SpeedDialのクリックイベントが地図に伝播しないようにするためのラッパー
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 全体表示ボタンのクリックハンドラー
  const handleFullView = (e: React.MouseEvent<HTMLDivElement>) => {
    // クリックイベントが地図まで伝播しないようにする
    e.stopPropagation();

    // 日本全体が見えるように表示
    const japanBounds = L.latLngBounds(
      L.latLng(24.0, 122.0), // 南西端（沖縄付近）
      L.latLng(46.0, 146.0)  // 北東端（北海道付近）
    );

    // 境界が有効な場合、その範囲に合わせて表示
    if (japanBounds.isValid()) {
      map.fitBounds(japanBounds, { padding: [50, 50] });
    }
    handleClose();
  };

  // 元の縮尺に戻すボタンのクリックハンドラー
  const handleResetView = (e: React.MouseEvent<HTMLDivElement>) => {
    // クリックイベントが地図まで伝播しないようにする
    e.stopPropagation();

    if (currentCenter) {
      // 現在の観測地点を中心に、デフォルトのズームレベルに戻す
      map.setView([currentCenter.lat, currentCenter.lng], defaultZoom);
    }
    handleClose();
  };

  // ズームインボタンのクリックハンドラー
  const handleZoomIn = (e: React.MouseEvent<HTMLDivElement>) => {
    // クリックイベントが地図まで伝播しないようにする
    e.stopPropagation();

    map.zoomIn();
    handleClose();
  };

  // ズームアウトボタンのクリックハンドラー
  const handleZoomOut = (e: React.MouseEvent<HTMLDivElement>) => {
    // クリックイベントが地図まで伝播しないようにする
    e.stopPropagation();

    map.zoomOut();
    handleClose();
  };

  // レイヤーダイアログを表示するハンドラー
  const handleShowLayers = (e: React.MouseEvent<HTMLDivElement>) => {
    // クリックイベントが地図まで伝播しないようにする
    e.stopPropagation();

    // レイヤーダイアログの表示は未実装
    // 将来的にはモバイル向けのレイヤー選択ダイアログを実装する
    handleClose();
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 16, right: 16 }}>
      <Tooltip title="地図コントロール" placement="left">
        <Box onClick={stopPropagation}>
          <SpeedDial
            ariaLabel="地図コントロール"
            icon={<SpeedDialIcon icon={<MapIcon />} />}
            onClose={handleClose}
            onOpen={handleToggle}
            open={open}
            direction="up"
            sx={{
              '& .MuiSpeedDial-fab': {
                backgroundColor: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              },
            }}
          >
          <SpeedDialAction
            icon={<ZoomInIcon />}
            tooltipTitle="拡大"
            onClick={handleZoomIn}
          />
          <SpeedDialAction
            icon={<ZoomOutIcon />}
            tooltipTitle="縮小"
            onClick={handleZoomOut}
          />
          <SpeedDialAction
            icon={<FullscreenIcon />}
            tooltipTitle="全体表示"
            onClick={handleFullView}
          />
          {currentCenter && (
            <SpeedDialAction
              icon={<HomeIcon />}
              tooltipTitle="地点に戻る"
              onClick={handleResetView}
            />
          )}
          <SpeedDialAction
            icon={<LayersIcon />}
            tooltipTitle="レイヤー"
            onClick={handleShowLayers}
          />
        </SpeedDial>
        </Box>
      </Tooltip>
    </Box>
  );
};

export default MobileControls;

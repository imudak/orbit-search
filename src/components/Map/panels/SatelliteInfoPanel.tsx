import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import type { Satellite } from '@/types';

interface SatelliteInfoPanelProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  satellite?: Satellite;
  currentPosition?: {
    lat: number;
    lng: number;
    elevation: number;
    azimuth: number;
    range: number;
  };
  currentTime?: Date;
}

/**
 * 衛星情報を表示するパネルコンポーネント
 */
const SatelliteInfoPanel: React.FC<SatelliteInfoPanelProps> = ({
  position = 'bottomleft',
  satellite,
  currentPosition,
  currentTime = new Date()
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
        return { bottom: '10px', left: '10px' };
    }
  };

  if (!satellite) return null;

  return (
    <Paper
      sx={{
        position: 'absolute',
        ...getPositionStyle(),
        zIndex: 1000,
        padding: '10px',
        backgroundColor: 'rgba(240, 240, 255, 0.95)', // 薄い青色の背景
        borderRadius: '8px', // より丸みを帯びた角
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)', // より強い影
        border: '1px solid rgba(0, 0, 100, 0.1)', // 薄い青色のボーダー
        maxWidth: '300px',
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.1)', pb: 0.5 }}>
        衛星情報: {satellite.name}
      </Typography>

      <Box sx={{ mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
          基本情報
        </Typography>
        <Typography variant="body2">
          NORAD ID: {satellite.noradId}<br />
          種類: {satellite.type}<br />
          運用状態: {satellite.operationalStatus}<br />
          軌道種類: {satellite.orbitType || '不明'}<br />
          軌道高度: {satellite.orbitHeight ? `${satellite.orbitHeight.toLocaleString()} km` : '不明'}
        </Typography>
      </Box>

      {currentPosition && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            現在位置 ({currentTime.toLocaleTimeString()})
          </Typography>
          <Typography variant="body2">
            緯度: {currentPosition.lat.toFixed(6)}°<br />
            経度: {currentPosition.lng.toFixed(6)}°<br />
            仰角: {currentPosition.elevation.toFixed(2)}°<br />
            方位角: {currentPosition.azimuth.toFixed(2)}°<br />
            距離: {currentPosition.range.toFixed(2)} km
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default SatelliteInfoPanel;

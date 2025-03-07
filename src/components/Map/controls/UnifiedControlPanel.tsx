import React, { useState } from 'react';
import {
  Paper,
  Tabs,
  Tab,
  Box,
  Typography,
  IconButton,
  Collapse,
  Divider,
  Button,
  Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MapIcon from '@mui/icons-material/Map';
import LayersIcon from '@mui/icons-material/Layers';
import InfoIcon from '@mui/icons-material/Info';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import HomeIcon from '@mui/icons-material/Home';
import LegendToggleIcon from '@mui/icons-material/LegendToggle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Location } from '@/types';
import { MapLayer } from './LayerControls';
import { useLayerManager } from '../layers/LayerManager';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

/**
 * タブパネルコンポーネント
 */
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`control-tabpanel-${index}`}
      aria-labelledby={`control-tab-${index}`}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

interface UnifiedControlPanelProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  currentCenter?: Location;
  defaultZoom?: number;
}

/**
 * 統一コントロールパネルコンポーネント
 * 地図、レイヤー、情報の各コントロールをタブ形式で提供
 */
const UnifiedControlPanel: React.FC<UnifiedControlPanelProps> = ({
  position = 'topright',
  currentCenter,
  defaultZoom = 5,
}) => {
  // タブの状態
  const [activeTab, setActiveTab] = useState(0);
  // パネルの展開/折りたたみ状態
  const [expanded, setExpanded] = useState(true);

  // Leafletのマップインスタンスを取得
  const map = useMap();

  // レイヤー管理コンテキストを使用
  const { layers, toggleLayer } = useLayerManager();

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

  // タブ変更ハンドラー
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // パネルの展開/折りたたみを切り替える
  const toggleExpanded = () => {
    setExpanded(!expanded);
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

  // ズームインボタンのクリックハンドラー
  const handleZoomIn = () => {
    map.zoomIn();
  };

  // ズームアウトボタンのクリックハンドラー
  const handleZoomOut = () => {
    map.zoomOut();
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        ...getPositionStyle(),
        zIndex: 1002, // 最前面に表示
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '4px',
        overflow: 'hidden',
        width: expanded ? '300px' : 'auto',
        transition: 'width 0.3s ease',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
        maxHeight: expanded ? '80vh' : 'auto', // 高さを制限
        overflowY: expanded ? 'auto' : 'hidden', // スクロール可能に
      }}
    >
      {/* ヘッダー部分 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 16px',
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          地図コントロール
        </Typography>
        <IconButton
          size="small"
          onClick={toggleExpanded}
          sx={{ color: 'inherit' }}
        >
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      {/* コンテンツ部分 */}
      <Collapse in={expanded}>
        <Box>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab icon={<MapIcon />} label="地図" />
            <Tab icon={<LayersIcon />} label="レイヤー" />
            <Tab icon={<InfoIcon />} label="情報" />
          </Tabs>

          {/* 地図タブ */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                地図操作
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Tooltip title="ズームイン">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleZoomIn}
                    startIcon={<ZoomInIcon />}
                  >
                    拡大
                  </Button>
                </Tooltip>
                <Tooltip title="ズームアウト">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleZoomOut}
                    startIcon={<ZoomOutIcon />}
                  >
                    縮小
                  </Button>
                </Tooltip>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Tooltip title="日本全体表示">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleFullView}
                    startIcon={<FullscreenIcon />}
                  >
                    全体表示
                  </Button>
                </Tooltip>
                <Tooltip title="選択地点に戻る">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleResetView}
                    startIcon={<HomeIcon />}
                    disabled={!currentCenter}
                  >
                    地点に戻る
                  </Button>
                </Tooltip>
              </Box>
            </Box>
          </TabPanel>

          {/* レイヤータブ */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                レイヤー表示設定
              </Typography>
              {layers.map((layer) => (
                <Box
                  key={layer.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1,
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0, 0, 0, 0.03)',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.05)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        backgroundColor: layer.color || 'primary.main',
                        borderRadius: '2px',
                        mr: 1,
                      }}
                    />
                    <Typography variant="body2">{layer.name}</Typography>
                  </Box>
                  <Button
                    variant={layer.isVisible ? "contained" : "outlined"}
                    color={layer.isVisible ? "primary" : "inherit"}
                    size="small"
                    onClick={() => {
                      console.log('Toggle layer clicked:', layer.id, 'current state:', layer.isVisible);
                      toggleLayer(layer.id);
                    }}
                  >
                    {layer.isVisible ? "表示中" : "非表示"}
                  </Button>
                </Box>
              ))}
            </Box>
          </TabPanel>

          {/* 情報タブ */}
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                地図情報
              </Typography>
              {currentCenter && (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    観測地点
                  </Typography>
                  <Typography variant="body2">
                    緯度: {currentCenter.lat.toFixed(6)}°<br />
                    経度: {currentCenter.lng.toFixed(6)}°
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  現在の表示
                </Typography>
                <Typography variant="body2">
                  ズームレベル: {map.getZoom()}<br />
                  中心座標: {map.getCenter().lat.toFixed(6)}°, {map.getCenter().lng.toFixed(6)}°
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                地図データ: © OpenStreetMap contributors<br />
                アプリケーション: © Kazumi OKANO
              </Typography>
            </Box>
          </TabPanel>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default UnifiedControlPanel;

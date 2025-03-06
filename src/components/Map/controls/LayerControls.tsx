import React from 'react';
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  Typography,
  Tooltip,
  IconButton,
  Collapse
} from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export interface MapLayer {
  id: string;
  name: string;
  description: string;
  isVisible: boolean;
  icon?: React.ReactNode;
  color?: string;
}

interface LayerControlsProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  layers: MapLayer[];
  onLayerToggle: (layerId: string) => void;
}

/**
 * 地図のレイヤー管理コントロールコンポーネント
 * 各レイヤーの表示/非表示を切り替える機能を提供
 */
const LayerControls: React.FC<LayerControlsProps> = ({
  position = 'topright',
  layers,
  onLayerToggle
}) => {
  const [expanded, setExpanded] = React.useState(false);

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

  // パネルの展開/折りたたみを切り替える
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        ...getPositionStyle(),
        zIndex: 1000,
        ml: position === 'topright' ? '120px' : 0, // 他のコントロールの横に配置する場合
      }}
    >
      <Paper
        elevation={3}
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '4px',
          overflow: 'hidden',
          width: expanded ? '250px' : 'auto',
          transition: 'width 0.3s ease',
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
            cursor: 'pointer',
          }}
          onClick={toggleExpanded}
        >
          <LayersIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
            レイヤー
          </Typography>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>

        {/* レイヤーリスト */}
        <Collapse in={expanded}>
          <List dense disablePadding>
            {layers.map((layer) => (
              <ListItem key={layer.id} divider>
                <ListItemIcon sx={{ minWidth: '40px' }}>
                  {layer.icon || (
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        backgroundColor: layer.color || 'primary.main',
                        borderRadius: '2px',
                      }}
                    />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={layer.name}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
                <Tooltip title={layer.description} placement="left">
                  <IconButton size="small" sx={{ mr: 1 }}>
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Switch
                  edge="end"
                  size="small"
                  checked={layer.isVisible}
                  onChange={() => onLayerToggle(layer.id)}
                  color="primary"
                />
              </ListItem>
            ))}
          </List>
        </Collapse>
      </Paper>
    </Box>
  );
};

export default LayerControls;

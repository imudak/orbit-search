import React from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Card,
  CardContent,
  Typography,
  Tooltip,
  CircularProgress,
  Box,
  Chip,
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import type { Satellite, Pass } from '@/types';

// TLEデータから軌道種類を判断する関数
const getOrbitType = (tle: { line1: string, line2: string }): string => {
  try {
    // TLEの2行目から1日あたりの周回数を取得
    const line2 = tle.line2;
    // 平均運動（1日あたりの周回数）は53-63文字目に格納されている
    const meanMotion = parseFloat(line2.substring(52, 63).trim());

    // 周回数から軌道種類を判断
    if (meanMotion >= 11.25) {
      return 'LEO'; // 低軌道
    } else if (meanMotion >= 2.0) {
      return 'MEO'; // 中軌道
    } else if (meanMotion > 0.9 && meanMotion < 1.1) {
      return 'GEO'; // 静止軌道
    } else {
      return 'HEO'; // 高楕円軌道など
    }
  } catch (error) {
    console.error('TLEデータの解析エラー:', error);
    return '不明';
  }
};

// 軌道種類に応じた色を返す関数
const getOrbitTypeColor = (orbitType: string): 'default' | 'error' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' => {
  switch (orbitType) {
    case 'LEO':
      return 'error'; // 赤
    case 'MEO':
      return 'success'; // 緑
    case 'GEO':
      return 'primary'; // 青
    case 'HEO':
      return 'warning'; // オレンジ
    default:
      return 'default'; // グレー
  }
};

interface SatelliteListProps {
  satellites: Array<Satellite & { passes: Pass[] }>;
  onTLEDownload: (satellite: Satellite) => void;
  onSatelliteSelect: (satellite: Satellite) => void;
  selectedSatellite?: Satellite;
  isLoading?: boolean;
}

const SatelliteList: React.FC<SatelliteListProps> = ({
  satellites,
  onTLEDownload,
  onSatelliteSelect,
  selectedSatellite,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          p: 4,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (satellites.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary" align="center">
          条件に一致する衛星が見つかりません。
        </Typography>
      </Box>
    );
  }

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // 衛星の情報を表示する関数（現在は使用していない）

  return (
    <Card
      variant="outlined"
      sx={{
        maxHeight: 'calc(100vh - 200px)', // 画面の高さから余白を引いた値
        overflow: 'auto' // コンテンツがはみ出した場合にスクロールバーを表示
      }}
    >
      <CardContent sx={{ p: 1 }}>
        {/* リストのタイトルと総数を表示 */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="h2" sx={{
            fontWeight: 'bold',
            color: '#1976d2',
            display: 'flex',
            alignItems: 'center',
            '&::before': {
              content: '""',
              display: 'inline-block',
              width: '4px',
              height: '24px',
              backgroundColor: '#1976d2',
              marginRight: '8px',
              borderRadius: '2px'
            }
          }}>
            可視衛星リスト
          </Typography>
          <Chip
            label={`合計: ${satellites.length}件`}
            color="primary"
            size="small"
            sx={{ fontWeight: 'bold', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
          />
        </Box>

        {/* 衛星情報の説明 */}
        <Box sx={{
          mb: 2,
          p: 1,
          backgroundColor: 'rgba(25, 118, 210, 0.05)',
          borderRadius: '4px',
          border: '1px solid rgba(25, 118, 210, 0.1)'
        }}>
          <Typography variant="body2" color="text.secondary" component="div">
            ※衛星の軌道種類と最大仰角を表示しています
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            <Chip size="small" label="LEO: 低軌道" color="error" />
            <Chip size="small" label="MEO: 中軌道" color="success" />
            <Chip size="small" label="GEO: 静止軌道" color="primary" />
            <Chip size="small" label="HEO: 高楕円軌道" color="warning" />
          </Box>
        </Box>

        <List disablePadding>
          {satellites.map((satellite, index) => (
            <ListItem
              key={satellite.id}
              disablePadding
              divider
              secondaryAction={
                <ListItemSecondaryAction>
                  <Tooltip title="TLEデータをダウンロード">
                    <IconButton
                      edge="end"
                      aria-label="download"
                      onClick={() => onTLEDownload(satellite)}
                    >
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              }
            >
              <ListItemButton
                selected={selectedSatellite?.id === satellite.id}
                onClick={() => onSatelliteSelect(satellite)}
                sx={{
                  borderRadius: '4px',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(25, 118, 210, 0.12)',
                    borderLeft: '4px solid #1976d2',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.2)',
                    }
                  }
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        component="span"
                        sx={{
                          minWidth: '30px',
                          fontWeight: 'bold',
                          color: selectedSatellite?.id === satellite.id ? '#1976d2' : 'inherit'
                        }}
                      >
                        {index + 1}.
                      </Typography>
                      <Typography
                        component="span"
                        sx={{
                          fontWeight: selectedSatellite?.id === satellite.id ? 'bold' : 'normal',
                          color: selectedSatellite?.id === satellite.id ? '#1976d2' : 'inherit'
                        }}
                      >
                        {satellite.name}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography component="div" variant="body2">
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                        {/* TLEデータから軌道種類を判断して表示 */}
                        {satellite.tle && (
                          <Chip
                            size="small"
                            label={getOrbitType(satellite.tle)}
                            color={getOrbitTypeColor(getOrbitType(satellite.tle))}
                            sx={{
                              fontWeight: selectedSatellite?.id === satellite.id ? 'bold' : 'normal',
                              boxShadow: selectedSatellite?.id === satellite.id ? '0 1px 3px rgba(0,0,0,0.2)' : 'none'
                            }}
                          />
                        )}
                        {/* 最大仰角を表示（パスがある場合のみ） */}
                        {satellite.passes.length > 0 && (
                          <Chip
                            size="small"
                            label={`最大仰角: ${satellite.passes[0].maxElevation.toFixed(1)}°`}
                            color="primary"
                            sx={{
                              fontWeight: selectedSatellite?.id === satellite.id ? 'bold' : 'normal',
                              boxShadow: selectedSatellite?.id === satellite.id ? '0 1px 3px rgba(0,0,0,0.2)' : 'none'
                            }}
                          />
                        )}
                      </Box>
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default SatelliteList;

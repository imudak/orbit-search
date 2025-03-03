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

  const renderSecondaryText = (satellite: Satellite & { passes: Pass[] }) => {
    if (satellite.passes.length === 0) {
      return '可視パスなし';
    }

    return [
      `最大仰角: ${satellite.passes[0].maxElevation.toFixed(1)}°`,
      `次回可視: ${formatDateTime(satellite.passes[0].startTime)}`
    ].join('\n');
  };

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
        <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="h2">
            可視衛星リスト
          </Typography>
          <Chip
            label={`合計: ${satellites.length}件`}
            color="primary"
            size="small"
          />
        </Box>

        {/* パス数の説明 */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          ※パス数：今後24時間以内に観測地点から見える衛星の通過回数
        </Typography>

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
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography component="span" sx={{ minWidth: '30px', fontWeight: 'bold' }}>
                        {index + 1}.
                      </Typography>
                      {satellite.name}
                      <Chip
                        size="small"
                        label={`パス数: ${satellite.passes.length}`}
                        color="primary"
                      />
                    </Box>
                  }
                  secondary={renderSecondaryText(satellite)}
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

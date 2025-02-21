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
import DownloadIcon from '@mui/icons-material/Download';
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

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 0 }}>
        <List disablePadding>
          {satellites.map((satellite) => (
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
                      {satellite.name}
                      <Chip
                        size="small"
                        label={`パス数: ${satellite.passes.length}`}
                        color="primary"
                      />
                    </Box>
                  }
                  secondary={
                    satellite.passes.length > 0 ? (
                      <>
                        <Typography variant="caption" component="div">
                          最大仰角: {satellite.passes[0].maxElevation.toFixed(1)}°
                        </Typography>
                        <Typography variant="caption" component="div">
                          次回可視: {formatDateTime(satellite.passes[0].startTime)}
                        </Typography>
                      </>
                    ) : (
                      '可視パスなし'
                    )
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

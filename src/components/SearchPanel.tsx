import React from 'react';
import {
  Card,
  CardContent,
  TextField,
  FormControl,
  FormControlLabel,
  Checkbox,
  Slider,
  Typography,
  Box,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import type { SearchFilters } from '@/types';

interface SearchPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ filters, onFiltersChange }) => {
  const handleStartDateChange = (date: Date | null) => {
    if (date) {
      onFiltersChange({
        ...filters,
        startDate: date,
      });
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    if (date) {
      onFiltersChange({
        ...filters,
        endDate: date,
      });
    }
  };

  const handleMinElevationChange = (_: Event, value: number | number[]) => {
    onFiltersChange({
      ...filters,
      minElevation: value as number,
    });
  };

  const handleDaylightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      considerDaylight: event.target.checked,
    });
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 期間選択 */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <DateTimePicker
              label="開始日時"
              value={filters.startDate}
              onChange={handleStartDateChange}
              format="yyyy/MM/dd HH:mm"
              ampm={false}
              sx={{ flex: 1 }}
            />
            <DateTimePicker
              label="終了日時"
              value={filters.endDate}
              onChange={handleEndDateChange}
              format="yyyy/MM/dd HH:mm"
              ampm={false}
              sx={{ flex: 1 }}
            />
          </Box>

          {/* 最低仰角設定 */}
          <Box>
            <Typography gutterBottom>
              最低仰角: {filters.minElevation}°
            </Typography>
            <Slider
              value={filters.minElevation}
              onChange={handleMinElevationChange}
              min={0}
              max={90}
              step={1}
              marks={[
                { value: 0, label: '0°' },
                { value: 30, label: '30°' },
                { value: 60, label: '60°' },
                { value: 90, label: '90°' },
              ]}
              valueLabelDisplay="auto"
            />
          </Box>

          {/* 昼夜の考慮 */}
          <FormControl component="fieldset">
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.considerDaylight ?? false}
                  onChange={handleDaylightChange}
                />
              }
              label="昼夜を考慮する"
            />
          </FormControl>

          {/* 現在の観測地点情報 */}
          {filters.location && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                観測地点
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={`緯度: ${filters.location.lat.toFixed(4)}, 経度: ${filters.location.lng.toFixed(4)}`}
                InputProps={{ readOnly: true }}
              />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default SearchPanel;

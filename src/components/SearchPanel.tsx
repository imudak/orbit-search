import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Checkbox,
  Slider,
  Typography,
  Box,
  TextField,
  Tooltip,
  IconButton,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import type { SearchFilters } from '@/types';

interface SearchPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

// デバウンス処理のためのカスタムフック
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ filters, onFiltersChange }) => {
  // スライダーの内部状態
  const [sliderValue, setSliderValue] = useState<number>(filters.minElevation);

  // ローカルタイムゾーンを取得
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timeZoneAbbr = new Intl.DateTimeFormat('en-US', {
    timeZoneName: 'short',
    timeZone
  }).formatToParts(new Date())
    .find(part => part.type === 'timeZoneName')?.value || timeZone;

  // デバウンスされた値
  const debouncedSliderValue = useDebounce<number>(sliderValue, 500); // 500ms遅延

  // デバウンスされた値が変更されたときに親コンポーネントに通知
  useEffect(() => {
    if (debouncedSliderValue !== filters.minElevation) {
      onFiltersChange({
        ...filters,
        minElevation: debouncedSliderValue,
      });
    }
  }, [debouncedSliderValue, filters, onFiltersChange]);

  const handleStartDateChange = (value: unknown) => {
    if (value instanceof Date && !isNaN(value.getTime())) {
      onFiltersChange({
        ...filters,
        startDate: value,
      });
    }
  };

  const handleEndDateChange = (value: unknown) => {
    if (value instanceof Date && !isNaN(value.getTime())) {
      onFiltersChange({
        ...filters,
        endDate: value,
      });
    }
  };

  // スライダーの値が変更されたときは内部状態のみ更新
  const handleMinElevationChange = (_: Event, value: number | number[]) => {
    setSliderValue(value as number);
  };

  // 昼夜の考慮は削除

  return (
    <Card
      variant="outlined"
      sx={{
        backgroundColor: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      <CardContent>
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}>
          {/* 期間選択 */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <DateTimePicker
                label={`開始日時 (${timeZoneAbbr})`}
                value={filters.startDate}
                onChange={handleStartDateChange}
                renderInput={(props) => (
                  <TextField
                    {...props}
                    fullWidth
                    size="small"
                    sx={{
                      backgroundColor: 'white',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '4px'
                      }
                    }}
                  />
                )}
                inputFormat="yyyy/MM/dd HH:mm"
                ampm={false}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <DateTimePicker
                label={`終了日時 (${timeZoneAbbr})`}
                value={filters.endDate}
                onChange={handleEndDateChange}
                renderInput={(props) => (
                  <TextField
                    {...props}
                    fullWidth
                    size="small"
                    sx={{
                      backgroundColor: 'white',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '4px'
                      }
                    }}
                  />
                )}
                inputFormat="yyyy/MM/dd HH:mm"
                ampm={false}
              />
            </Box>
          </Box>

          {/* 最低仰角と観測地点を横並びに */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* 最低仰角設定 */}
            <Box sx={{ flex: 1 }}>
              <Typography gutterBottom>
                最低仰角: {sliderValue}°
                <Tooltip title="地平線からの角度。値が大きいほど、空の高い位置にある衛星のみが表示されます。">
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <HelpOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              <Slider
                value={sliderValue}
                onChange={handleMinElevationChange}
                min={0}
                max={90}
                step={1}
                marks={[
                  { value: 0, label: '0°' },
                  { value: 45, label: '45°' },
                  { value: 90, label: '90°' },
                ]}
                valueLabelDisplay="auto"
              />
            </Box>

            {/* 現在の観測地点情報 */}
            {filters.location && (
              <Box sx={{ flex: 1 }}>
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
        </Box>
      </CardContent>
    </Card>
  );
};

export default SearchPanel;

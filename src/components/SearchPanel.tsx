import React, { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  FormControlLabel,
  Checkbox,
  Slider,
  Typography,
  Box,
  TextField,
  Tooltip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SearchIcon from '@mui/icons-material/Search';
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
  // 内部状態
  const [sliderValue, setSliderValue] = useState<number>(filters.minElevation);
  const [localStartDate, setLocalStartDate] = useState<Date>(filters.startDate);
  const [localEndDate, setLocalEndDate] = useState<Date>(filters.endDate);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string>('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [dateError, setDateError] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(true);

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

  // 日付の差を計算する関数（日数）
  const calculateDateDifference = (start: Date, end: Date): number => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // 日付が有効かどうかをチェックする関数
  const isValidDateRange = (): boolean => {
    return localStartDate.getTime() <= localEndDate.getTime();
  };

  // 現在の設定が既に検索済みかどうかをチェックする関数
  const isCurrentSettingSearched = (): boolean => {
    return (
      localStartDate.getTime() === filters.startDate.getTime() &&
      localEndDate.getTime() === filters.endDate.getTime() &&
      sliderValue === filters.minElevation
    );
  };

  // 検索ボタンが無効かどうかをチェックする関数
  const isSearchButtonDisabled = (): boolean => {
    return !isValidDateRange() || isSearching || isCurrentSettingSearched();
  };

  // 検索ボタンがクリックされたときのハンドラー
  const handleSearch = () => {
    // 日付の範囲が無効な場合
    if (!isValidDateRange()) {
      setDateError(true);
      setWarningMessage('開始日時は終了日時より前に設定してください。');
      setConfirmDialogOpen(true);
      return;
    }

    setDateError(false);

    // 日付の差を計算
    const dateDiff = calculateDateDifference(localStartDate, localEndDate);

    // 日付の差が30日以上の場合は警告を表示
    if (dateDiff > 30) {
      setWarningMessage(`選択された期間は${dateDiff}日間です。長期間の検索は計算に時間がかかる場合があります。続行しますか？`);
      setConfirmDialogOpen(true);
    } else {
      // 30日以内の場合はそのまま検索を実行
      executeSearch();
    }
  };

  // 確認ダイアログで「はい」がクリックされたときのハンドラー
  const handleConfirmSearch = () => {
    setConfirmDialogOpen(false);
    executeSearch();
  };

  // 実際に検索を実行する関数
  const executeSearch = () => {
    // 検索中の状態にする
    setIsSearching(true);

    // 検索を実行
    onFiltersChange({
      ...filters,
      startDate: localStartDate,
      endDate: localEndDate,
    });

    // 警告メッセージを表示（検索は実行される）
    if (calculateDateDifference(localStartDate, localEndDate) > 30) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }

    // 検索完了後、状態を更新
    setTimeout(() => {
      setIsSearching(false);
    }, 500); // 少し遅延を入れて、ボタンの無効化が視覚的にわかるようにする
  };

  // 日付の有効性をチェックして、エラー状態を更新する関数
  const validateDates = (start: Date, end: Date) => {
    const isValid = start.getTime() <= end.getTime();
    setDateError(!isValid);
    return isValid;
  };

  const handleStartDateChange = (value: unknown) => {
    if (value instanceof Date && !isNaN(value.getTime())) {
      setLocalStartDate(value);
      // 日付が変更されたら有効性をチェック
      validateDates(value, localEndDate);
    }
  };

  const handleEndDateChange = (value: unknown) => {
    if (value instanceof Date && !isNaN(value.getTime())) {
      setLocalEndDate(value);
      // 日付が変更されたら有効性をチェック
      validateDates(localStartDate, value);
    }
  };

  // スライダーの値が変更されたときは内部状態のみ更新
  const handleMinElevationChange = (_: Event, value: number | number[]) => {
    setSliderValue(value as number);
  };

  return (
    <Accordion
      defaultExpanded={true}
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="search-panel-content"
        id="search-panel-header"
        sx={{
          minHeight: '40px',
          py: 0,
          backgroundColor: 'rgba(25, 118, 210, 0.08)',
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.12)',
          },
          borderRadius: '4px',
          border: '1px solid rgba(25, 118, 210, 0.2)',
          my: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SearchIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'primary.main' }}>
            検索条件を設定
          </Typography>
          <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
            (クリックして{expanded ? '閉じる' : '開く'})
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ py: 1, px: 2 }}>
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
          {/* 期間選択 - 日時表示エリアを広げて幅を統一 */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Box sx={{ width: '220px' }}>
              <DateTimePicker
                label={`開始 (${timeZoneAbbr})`}
                value={localStartDate}
                onChange={handleStartDateChange}
                renderInput={(props) => (
                  <TextField
                    {...props}
                    fullWidth
                    size="small"
                    error={dateError}
                    helperText={dateError ? '開始日時は終了日時より前に' : ''}
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
            <Box sx={{ width: '220px' }}>
              <DateTimePicker
                label={`終了 (${timeZoneAbbr})`}
                value={localEndDate}
                onChange={handleEndDateChange}
                renderInput={(props) => (
                  <TextField
                    {...props}
                    fullWidth
                    size="small"
                    error={dateError}
                    helperText={dateError ? '終了日時は開始日時より後に' : ''}
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
            {/* 検索ボタンを同じ行に配置 */}
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={isSearchButtonDisabled()}
              sx={{ height: '40px', alignSelf: 'flex-start', mt: '4px' }}
            >
              {isSearching ? '検索中...' : '検索'}
            </Button>
          </Box>

          {/* 警告メッセージ */}
          {dateError && (
            <Alert severity="error" sx={{ py: 0.5, px: 1 }}>
              開始日時は終了日時より前に設定してください。
            </Alert>
          )}
          {showWarning && (
            <Alert severity="warning" sx={{ py: 0.5, px: 1 }}>
              選択された期間は{calculateDateDifference(localStartDate, localEndDate)}日間です。長期間の検索は計算に時間がかかる場合があります。
            </Alert>
          )}

          {/* 最低仰角設定 - よりコンパクトに */}
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" gutterBottom>
              最低仰角: {sliderValue}°
              <Tooltip title="地平線からの角度。値が大きいほど、空の高い位置にある衛星のみが表示されます。">
                <IconButton size="small" sx={{ ml: 0.5, p: 0.5 }}>
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
                { value: 10, label: '10°' },
                { value: 20, label: '20°' },
                { value: 30, label: '30°' },
                { value: 45, label: '45°' },
                { value: 60, label: '60°' },
                { value: 75, label: '75°' },
                { value: 90, label: '90°' },
              ]}
              valueLabelDisplay="auto"
            />
          </Box>
        </Box>
      </AccordionDetails>

      {/* 確認ダイアログ */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>長期間の検索</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {warningMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} color="primary">
            キャンセル
          </Button>
          <Button onClick={handleConfirmSearch} color="primary" autoFocus>
            続行
          </Button>
        </DialogActions>
      </Dialog>
    </Accordion>
  );
};

export default SearchPanel;

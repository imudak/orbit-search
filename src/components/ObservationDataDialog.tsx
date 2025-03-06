import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Box,
  Typography,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';

interface ObservationDataDialogProps {
  open: boolean;
  onClose: () => void;
  onDownload: (stepSize: number) => void;
  isLoading: boolean;
  satelliteName: string;
}

const ObservationDataDialog: React.FC<ObservationDataDialogProps> = ({
  open,
  onClose,
  onDownload,
  isLoading,
  satelliteName
}) => {
  const [stepValue, setStepValue] = useState<number>(1);
  const [stepUnit, setStepUnit] = useState<string>('seconds');

  const handleStepValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setStepValue(isNaN(value) || value < 1 ? 1 : value);
  };

  const handleStepUnitChange = (e: SelectChangeEvent) => {
    setStepUnit(e.target.value);
  };

  const handleDownload = () => {
    // 単位に応じて時間間隔をミリ秒に変換
    let stepSize = stepValue;
    switch (stepUnit) {
      case 'seconds':
        stepSize = stepValue * 1000;
        break;
      case 'minutes':
        stepSize = stepValue * 60 * 1000;
        break;
      case 'hours':
        stepSize = stepValue * 60 * 60 * 1000;
        break;
    }

    onDownload(stepSize);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableRestoreFocus
    >
      <DialogTitle>観測データのダウンロード</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            衛星「{satelliteName}」の観測データ（方位角、仰角、距離）をダウンロードします。
            時間間隔を指定してください。
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, mt: 2 }}>
          <TextField
            label="時間間隔"
            type="number"
            value={stepValue}
            onChange={handleStepValueChange}
            inputProps={{ min: 1 }}
            sx={{ width: '40%' }}
            autoFocus
          />

          <FormControl sx={{ width: '60%' }}>
            <InputLabel>単位</InputLabel>
            <Select
              value={stepUnit}
              onChange={handleStepUnitChange}
              label="単位"
            >
              <MenuItem value="seconds">秒</MenuItem>
              <MenuItem value="minutes">分</MenuItem>
              <MenuItem value="hours">時間</MenuItem>
            </Select>
            <FormHelperText>
              {stepUnit === 'seconds' && '1秒間隔が最も詳細なデータになります'}
              {stepUnit === 'minutes' && '長時間の観測には分単位が適しています'}
              {stepUnit === 'hours' && '非常に長期間の観測に使用します'}
            </FormHelperText>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">キャンセル</Button>
        <Button
          onClick={handleDownload}
          color="primary"
          variant="contained"
          disabled={isLoading || stepValue < 1}
        >
          {isLoading ? <CircularProgress size={24} /> : 'ダウンロード'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ObservationDataDialog;

import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Slider,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

// 衛星アニメーションの状態を表す型
export interface AnimationState {
  isPlaying: boolean;
  currentTime: Date;
  startTime: Date;
  endTime: Date;
  playbackSpeed: number;
  currentPosition?: {
    lat: number;
    lng: number;
    elevation: number;
    azimuth: number;
    range: number;
  };
}

interface AnimationControlPanelProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright' | 'bottom';
  animationState: AnimationState;
  onPlayPause: () => void;
  onSeek: (time: Date) => void;
  onSpeedChange: (speed: number) => void;
}

/**
 * 衛星アニメーションのコントロールパネルコンポーネント
 */
const AnimationControlPanel: React.FC<AnimationControlPanelProps> = ({
  position = 'bottom',
  animationState,
  onPlayPause,
  onSeek,
  onSpeedChange
}) => {
  const { isPlaying, currentTime, startTime, endTime, playbackSpeed } = animationState;

  // 現在時刻のスライダー値（ミリ秒）
  const currentTimeValue = currentTime.getTime();
  const startTimeValue = startTime.getTime();
  const endTimeValue = endTime.getTime();

  // ポジションに応じたスタイルを設定
  const getPositionStyle = () => {
    if (position === 'bottom') {
      return {
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 40px)',
        maxWidth: '800px'
      };
    }

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

  // 時間をフォーマットする関数
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // 速度変更ハンドラー
  const handleSpeedChange = (event: SelectChangeEvent<number>) => {
    onSpeedChange(Number(event.target.value));
  };

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
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
        衛星軌道アニメーション
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <IconButton onClick={onPlayPause} color="primary" size="small">
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>

        <Typography variant="body2" sx={{ ml: 1, minWidth: '80px' }}>
          {formatTime(currentTime)}
        </Typography>

        <FormControl size="small" sx={{ ml: 'auto', minWidth: '100px' }}>
          <Select
            value={playbackSpeed}
            onChange={handleSpeedChange}
            variant="outlined"
            size="small"
          >
            <MenuItem value={1}>1倍速</MenuItem>
            <MenuItem value={5}>5倍速</MenuItem>
            <MenuItem value={10}>10倍速</MenuItem>
            <MenuItem value={60}>60倍速</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Slider
        value={currentTimeValue}
        min={startTimeValue}
        max={endTimeValue}
        onChange={(_, value) => {
          onSeek(new Date(value as number));
        }}
        valueLabelDisplay="auto"
        valueLabelFormat={value => formatTime(new Date(value as number))}
        sx={{ mt: 1 }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption">{formatTime(startTime)}</Typography>
        <Typography variant="caption">{formatTime(endTime)}</Typography>
      </Box>
    </Paper>
  );
};

export default AnimationControlPanel;

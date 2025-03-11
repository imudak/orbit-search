import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Slider,
  Button,
  TextField,
  useTheme,
  useMediaQuery
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';

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
  isCompact?: boolean;
}

/**
 * 衛星アニメーションのコントロールパネルコンポーネント
 * デモデザインに近づけたシンプルなUI
 */
const AnimationControlPanel: React.FC<AnimationControlPanelProps> = ({
  position = 'bottom',
  animationState,
  onPlayPause,
  onSeek,
  onSpeedChange
}) => {
  const { isPlaying, currentTime, startTime, endTime, playbackSpeed } = animationState;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
        maxWidth: '600px'
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

  // 日付をフォーマットする関数
  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  // 日時の完全なフォーマット
  const formatDateTime = (date: Date) => {
    return `${formatDate(date)} ${formatTime(date)}`;
  };

  // リセットハンドラー
  const handleReset = () => {
    onSeek(startTime);
  };

  return (
    <Paper
      sx={{
        position: 'absolute',
        ...getPositionStyle(),
        zIndex: 1001,
        padding: '16px',
        backgroundColor: 'white',
        color: 'rgba(0, 0, 0, 0.87)',
        borderRadius: '8px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
        width: 'calc(100% - 40px)',
        maxWidth: '600px',
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            軌道制御
          </span>
        </Typography>

        {/* 時間制御 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>時間制御</Typography>
          <TextField
            fullWidth
            size="small"
            value={formatDateTime(currentTime)}
            sx={{ mb: 1 }}
            InputProps={{
              readOnly: true,
            }}
          />
          <Slider
            value={currentTimeValue}
            min={startTimeValue}
            max={endTimeValue}
            onChange={(_, value) => {
              onSeek(new Date(value as number));
            }}
            sx={{
              color: 'primary.main',
              height: 4,
              '& .MuiSlider-thumb': {
                width: 20,
                height: 20,
              },
              '& .MuiSlider-rail': {
                backgroundColor: '#d3d3d3',
              },
            }}
          />
        </Box>

        {/* 再生速度コントロール */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            再生速度: {playbackSpeed}倍速
          </Typography>
          <Slider
            value={playbackSpeed}
            min={1}
            max={100}
            onChange={(_, value) => {
              onSpeedChange(value as number);
            }}
            sx={{
              color: 'primary.main',
              height: 4,
              '& .MuiSlider-thumb': {
                width: 20,
                height: 20,
              },
              '& .MuiSlider-rail': {
                backgroundColor: '#d3d3d3',
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              1倍速
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              50倍速
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              100倍速
            </Typography>
          </Box>
        </Box>

        {/* 再生コントロールボタン */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            onClick={onPlayPause}
            sx={{ flex: 1 }}
          >
            {isPlaying ? '一時停止' : '再生'}
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<ReplayIcon />}
            onClick={handleReset}
            sx={{ flex: 1 }}
          >
            リセット
          </Button>
        </Box>
      </Box>

      {/* 軌道情報 */}
      <Box>
        <Typography variant="subtitle2" sx={{
          fontWeight: 'bold',
          mb: 1,
          pb: 0.5,
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
        }}>
          軌道情報
        </Typography>
        <Box sx={{ display: 'flex', mb: 0.5 }}>
          <Typography variant="body2" sx={{ width: 100, color: 'text.secondary' }}>周回周期</Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>92.68分</Typography>
        </Box>
        <Box sx={{ display: 'flex', mb: 0.5 }}>
          <Typography variant="body2" sx={{ width: 100, color: 'text.secondary' }}>軌道傾斜角</Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>51.64°</Typography>
        </Box>
        <Box sx={{ display: 'flex', mb: 0.5 }}>
          <Typography variant="body2" sx={{ width: 100, color: 'text.secondary' }}>離心率</Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>0.0004364</Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default AnimationControlPanel;

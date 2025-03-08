import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Slider,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tooltip,
  Fade,
  Chip,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

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
  const [showHelp, setShowHelp] = useState(false);
  const [showTimeInfo, setShowTimeInfo] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 現在時刻のスライダー値（ミリ秒）
  const currentTimeValue = currentTime.getTime();
  const startTimeValue = startTime.getTime();
  const endTimeValue = endTime.getTime();
  const totalDuration = endTimeValue - startTimeValue;
  const progress = ((currentTimeValue - startTimeValue) / totalDuration) * 100;

  // 初回表示時にヘルプを表示
  useEffect(() => {
    setShowHelp(true);
    const timer = setTimeout(() => {
      setShowHelp(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

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

  // 日付をフォーマットする関数
  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  // 速度変更ハンドラー
  const handleSpeedChange = (event: SelectChangeEvent<number>) => {
    onSpeedChange(Number(event.target.value));
  };

  // 30分前後にシークするハンドラー
  const handleSkip = (minutes: number) => {
    const newTime = new Date(currentTime.getTime() + minutes * 60 * 1000);
    // 範囲内に収める
    if (newTime < startTime) {
      onSeek(startTime);
    } else if (newTime > endTime) {
      onSeek(endTime);
    } else {
      onSeek(newTime);
    }
  };

  // 開始/終了時間にジャンプするハンドラー
  const handleJump = (toStart: boolean) => {
    onSeek(toStart ? startTime : endTime);
  };

  return (
    <>
      <Paper
        sx={{
          position: 'absolute',
          ...getPositionStyle(),
          zIndex: 1001, // 他のパネルより前面に表示
          padding: '10px',
          backgroundColor: 'rgba(25, 118, 210, 0.9)', // 青色の背景（アニメーションモードを強調）
          color: 'white',
          borderRadius: '8px', // より丸みを帯びた角
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)', // より強い影
          border: '1px solid rgba(0, 0, 100, 0.2)', // 薄い青色のボーダー
          width: 'calc(100% - 40px)', // 幅を調整
          maxWidth: '600px', // 最大幅を制限
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
            衛星軌道アニメーション
            <Chip
              label={`${playbackSpeed}倍速`}
              size="small"
              sx={{ ml: 1, backgroundColor: 'rgba(255, 255, 255, 0.3)', color: 'white' }}
            />
          </Typography>
          <Tooltip title="時間情報を表示">
            <IconButton
              size="small"
              onClick={() => setShowTimeInfo(!showTimeInfo)}
              sx={{ color: 'white', opacity: 0.8, '&:hover': { opacity: 1 } }}
            >
              <AccessTimeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="操作ヘルプを表示">
            <IconButton
              size="small"
              onClick={() => setShowHelp(!showHelp)}
              sx={{ color: 'white', opacity: 0.8, '&:hover': { opacity: 1 } }}
            >
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* 時間情報 */}
        <Fade in={showTimeInfo}>
          <Box sx={{ mb: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)', p: 1, borderRadius: '4px' }}>
            <Typography variant="caption" sx={{ display: 'block' }}>
              開始: {formatDate(startTime)} {formatTime(startTime)}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>
              現在: {formatDate(currentTime)} {formatTime(currentTime)}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>
              終了: {formatDate(endTime)} {formatTime(endTime)}
            </Typography>
          </Box>
        </Fade>

        {/* コントロール部分 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: '4px' }}>
          {/* 開始位置にジャンプ */}
          <Tooltip title="開始位置にジャンプ">
            <IconButton
              onClick={() => handleJump(true)}
              size="small"
              sx={{ color: 'white' }}
            >
              <SkipPreviousIcon />
            </IconButton>
          </Tooltip>

          {/* 30分前にスキップ */}
          <Tooltip title="30分前にスキップ">
            <IconButton
              onClick={() => handleSkip(-30)}
              size="small"
              sx={{ color: 'white' }}
            >
              <FastRewindIcon />
            </IconButton>
          </Tooltip>

          {/* 再生/一時停止 */}
          <IconButton
            onClick={onPlayPause}
            size="medium"
            sx={{
              color: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' }
            }}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>

          {/* 30分後にスキップ */}
          <Tooltip title="30分後にスキップ">
            <IconButton
              onClick={() => handleSkip(30)}
              size="small"
              sx={{ color: 'white' }}
            >
              <FastForwardIcon />
            </IconButton>
          </Tooltip>

          {/* 終了位置にジャンプ */}
          <Tooltip title="終了位置にジャンプ">
            <IconButton
              onClick={() => handleJump(false)}
              size="small"
              sx={{ color: 'white' }}
            >
              <SkipNextIcon />
            </IconButton>
          </Tooltip>

          {/* 再生速度選択 */}
          <FormControl
            size="small"
            sx={{
              ml: 'auto',
              minWidth: '100px',
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&:hover fieldset': {
                  borderColor: 'white',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'white',
                },
              },
              '& .MuiSelect-icon': {
                color: 'white',
              }
            }}
          >
            <Select
              value={playbackSpeed}
              onChange={handleSpeedChange}
              variant="outlined"
              size="small"
              displayEmpty
              renderValue={(value) => `${value}倍速`}
            >
              <MenuItem value={1}>1倍速</MenuItem>
              <MenuItem value={5}>5倍速</MenuItem>
              <MenuItem value={10}>10倍速</MenuItem>
              <MenuItem value={60}>60倍速</MenuItem>
              <MenuItem value={120}>120倍速</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* 進行状況表示 */}
        <Box sx={{ position: 'relative', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: '2px', mb: 1 }}>
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${progress}%`,
              backgroundColor: 'white',
              borderRadius: '2px'
            }}
          />
        </Box>

        {/* タイムスライダー */}
        <Slider
          value={currentTimeValue}
          min={startTimeValue}
          max={endTimeValue}
          onChange={(_, value) => {
            onSeek(new Date(value as number));
          }}
          valueLabelDisplay="auto"
          valueLabelFormat={value => formatTime(new Date(value as number))}
          sx={{
            mt: 1,
            color: 'white',
            '& .MuiSlider-thumb': {
              backgroundColor: 'white',
            },
            '& .MuiSlider-rail': {
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
            },
            '& .MuiSlider-track': {
              backgroundColor: 'white',
            },
            '& .MuiSlider-valueLabel': {
              backgroundColor: 'rgba(25, 118, 210, 0.9)',
            }
          }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {formatTime(startTime)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {formatTime(endTime)}
          </Typography>
        </Box>
      </Paper>

      {/* ヘルプパネル */}
      <Fade in={showHelp}>
        <Paper
          sx={{
            position: 'absolute',
            bottom: isMobile ? '120px' : '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1002,
            padding: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
            maxWidth: '80%',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            アニメーションコントロールの使い方
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PlayArrowIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="caption">再生/一時停止</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FastForwardIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="caption">30分前後にスキップ</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <SkipNextIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="caption">開始/終了位置にジャンプ</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AccessTimeIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="caption">時間情報の表示/非表示</Typography>
            </Box>
          </Box>
          <Button
            size="small"
            variant="text"
            onClick={() => setShowHelp(false)}
            sx={{ color: 'white', mt: 1, textTransform: 'none' }}
          >
            閉じる
          </Button>
        </Paper>
      </Fade>
    </>
  );
};

export default AnimationControlPanel;

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
  useMediaQuery,
  Card,
  CardContent,
  LinearProgress,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Collapse,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TimelineIcon from '@mui/icons-material/Timeline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import type { AnimationState } from './AnimationControlPanel';

interface OrbitControlPanelProps {
  animationState: AnimationState;
  onPlayPause: () => void;
  onSeek: (time: Date) => void;
  onSpeedChange: (speed: number) => void;
  orbitVisibility?: {
    showOrbits: boolean;
    showFootprints: boolean;
  };
  onOrbitVisibilityChange?: (settings: { showOrbits: boolean; showFootprints: boolean }) => void;
}

/**
 * 軌道コントロールパネルコンポーネント
 * 衛星軌道の表示と再生をコントロール
 */
const OrbitControlPanel: React.FC<OrbitControlPanelProps> = ({
  animationState,
  onPlayPause,
  onSeek,
  onSpeedChange,
  orbitVisibility = { showOrbits: true, showFootprints: true },
  onOrbitVisibilityChange = () => {},
}) => {
  const { isPlaying, currentTime, startTime, endTime, playbackSpeed } = animationState;
  const [showHelp, setShowHelp] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 現在時刻のスライダー値（ミリ秒）
  const currentTimeValue = currentTime.getTime();
  const startTimeValue = startTime.getTime();
  const endTimeValue = endTime.getTime();
  const totalDuration = endTimeValue - startTimeValue;
  const progress = ((currentTimeValue - startTimeValue) / totalDuration) * 100;

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

  // 軌道表示設定の変更ハンドラー
  const handleOrbitVisibilityChange = (
    event: React.MouseEvent<HTMLElement>,
    newValue: string[]
  ) => {
    onOrbitVisibilityChange({
      showOrbits: newValue.includes('orbits'),
      showFootprints: newValue.includes('footprints'),
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* 時間コントロールカード */}
      <Card
        elevation={0}
        sx={{
          mb: 2,
          border: '1px solid rgba(0, 0, 0, 0.1)',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.03)',
          px: 2,
          py: 1,
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
        }}>
          <AccessTimeIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
            時間コントロール
          </Typography>
          <Chip
            label={`${playbackSpeed}倍速`}
            size="small"
            color="primary"
            sx={{ ml: 1, height: '20px', '& .MuiChip-label': { px: 1, py: 0 } }}
          />
          {isPlaying ? (
            <Chip
              label="再生中"
              size="small"
              color="success"
              sx={{ ml: 1, height: '20px', '& .MuiChip-label': { px: 1, py: 0 } }}
            />
          ) : (
            <Chip
              label="一時停止"
              size="small"
              color="default"
              sx={{ ml: 1, height: '20px', '& .MuiChip-label': { px: 1, py: 0 } }}
            />
          )}
          <Tooltip title="ヘルプを表示">
            <IconButton
              size="small"
              onClick={() => setShowHelp(!showHelp)}
              sx={{ ml: 'auto' }}
            >
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <CardContent>
          {/* ヘルプテキスト */}
          <Collapse in={showHelp}>
            <Box sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.03)',
              p: 1.5,
              borderRadius: '4px',
              mb: 1.5,
            }}>
              <Typography variant="body2" color="text.secondary">
                再生/一時停止ボタンで衛星の動きを制御できます。スライダーをドラッグして特定の時間に移動したり、
                スキップボタンで30分単位で移動できます。再生速度は1倍速から120倍速まで変更可能です。
              </Typography>
            </Box>
          </Collapse>

          {/* 時間情報 */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                現在時刻: {formatDate(currentTime)} {formatTime(currentTime)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                残り時間: {formatDuration(endTimeValue - currentTimeValue)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 8, borderRadius: 4, mb: 1 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">
                {formatTime(startTime)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTime(endTime)}
              </Typography>
            </Box>
          </Box>

          {/* 再生コントロール */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
            <Tooltip title="開始位置に移動">
              <IconButton
                onClick={() => handleJump(true)}
                size="small"
                sx={{ color: theme.palette.grey[700] }}
              >
                <SkipPreviousIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="30分前に移動">
              <IconButton
                onClick={() => handleSkip(-30)}
                size="small"
                sx={{ color: theme.palette.grey[700] }}
              >
                <FastRewindIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={isPlaying ? "一時停止" : "再生"}>
              <IconButton
                onClick={onPlayPause}
                size="medium"
                sx={{
                  color: 'white',
                  backgroundColor: isPlaying ? theme.palette.warning.main : theme.palette.primary.main,
                  '&:hover': {
                    backgroundColor: isPlaying ? theme.palette.warning.dark : theme.palette.primary.dark,
                  },
                  width: 48,
                  height: 48,
                }}
              >
                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="30分後に移動">
              <IconButton
                onClick={() => handleSkip(30)}
                size="small"
                sx={{ color: theme.palette.grey[700] }}
              >
                <FastForwardIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="終了位置に移動">
              <IconButton
                onClick={() => handleJump(false)}
                size="small"
                sx={{ color: theme.palette.grey[700] }}
              >
                <SkipNextIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* 再生速度選択 */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ mr: 2 }}>
              再生速度:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={playbackSpeed}
                onChange={handleSpeedChange}
                variant="outlined"
                size="small"
                displayEmpty
              >
                <MenuItem value={1}>1倍速</MenuItem>
                <MenuItem value={5}>5倍速</MenuItem>
                <MenuItem value={10}>10倍速</MenuItem>
                <MenuItem value={60}>60倍速</MenuItem>
                <MenuItem value={120}>120倍速</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* 軌道表示設定カード */}
      <Card
        elevation={0}
        sx={{
          mb: 2,
          border: '1px solid rgba(0, 0, 0, 0.1)',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.03)',
          px: 2,
          py: 1,
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
        }}>
          <TimelineIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
            軌道表示設定
          </Typography>
        </Box>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="body2" gutterBottom>
                表示項目:
              </Typography>
              <ToggleButtonGroup
                value={[
                  ...(orbitVisibility.showOrbits ? ['orbits'] : []),
                  ...(orbitVisibility.showFootprints ? ['footprints'] : []),
                ]}
                onChange={handleOrbitVisibilityChange}
                aria-label="軌道表示設定"
                size="small"
                color="primary"
                sx={{ width: '100%' }}
              >
                <ToggleButton value="orbits" aria-label="軌道を表示" sx={{ flex: 1 }}>
                  <TimelineIcon sx={{ mr: 1 }} />
                  軌道
                </ToggleButton>
                <ToggleButton value="footprints" aria-label="可視範囲を表示" sx={{ flex: 1 }}>
                  <VisibilityIcon sx={{ mr: 1 }} />
                  可視範囲
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Divider />

            <Box>
              <Typography variant="body2" gutterBottom>
                表示期間:
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">
                  開始: {formatDate(startTime)} {formatTime(startTime)}
                </Typography>
                <Typography variant="body2">
                  終了: {formatDate(endTime)} {formatTime(endTime)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                総期間: {formatDuration(endTimeValue - startTimeValue)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

// 時間の差をフォーマットする関数（例: 2時間30分）
const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}日${hours % 24}時間`;
  } else if (hours > 0) {
    return `${hours}時間${minutes % 60}分`;
  } else {
    return `${minutes}分`;
  }
};

export default OrbitControlPanel;

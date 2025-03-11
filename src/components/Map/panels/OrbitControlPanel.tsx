import React, { useState, useEffect, useCallback } from 'react';
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
  Badge,
  InputLabel,
  FormHelperText,
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
import KeyboardIcon from '@mui/icons-material/Keyboard';
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
 * アクセシビリティ対応済み
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
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
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
  const handleSkip = useCallback((minutes: number) => {
    const newTime = new Date(currentTime.getTime() + minutes * 60 * 1000);
    // 範囲内に収める
    if (newTime < startTime) {
      onSeek(startTime);
    } else if (newTime > endTime) {
      onSeek(endTime);
    } else {
      onSeek(newTime);
    }
  }, [currentTime, startTime, endTime, onSeek]);

  // 開始/終了時間にジャンプするハンドラー
  const handleJump = useCallback((toStart: boolean) => {
    onSeek(toStart ? startTime : endTime);
  }, [startTime, endTime, onSeek]);

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

  // キーボードショートカット処理
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // スペースキーで再生/一時停止
    if (event.code === 'Space' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      onPlayPause();
      event.preventDefault();
    }
    // 左右矢印キーで30分前後に移動
    else if (event.code === 'ArrowLeft' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      handleSkip(-30);
      event.preventDefault();
    }
    else if (event.code === 'ArrowRight' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      handleSkip(30);
      event.preventDefault();
    }
    // Home/Endキーで開始/終了位置に移動
    else if (event.code === 'Home' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      handleJump(true);
      event.preventDefault();
    }
    else if (event.code === 'End' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      handleJump(false);
      event.preventDefault();
    }
    // 数字キーで再生速度変更
    else if (event.code === 'Digit1' && event.ctrlKey && !event.altKey && !event.metaKey) {
      onSpeedChange(1);
      event.preventDefault();
    }
    else if (event.code === 'Digit2' && event.ctrlKey && !event.altKey && !event.metaKey) {
      onSpeedChange(5);
      event.preventDefault();
    }
    else if (event.code === 'Digit3' && event.ctrlKey && !event.altKey && !event.metaKey) {
      onSpeedChange(10);
      event.preventDefault();
    }
    else if (event.code === 'Digit4' && event.ctrlKey && !event.altKey && !event.metaKey) {
      onSpeedChange(60);
      event.preventDefault();
    }
    else if (event.code === 'Digit5' && event.ctrlKey && !event.altKey && !event.metaKey) {
      onSpeedChange(120);
      event.preventDefault();
    }
  }, [onPlayPause, handleSkip, handleJump, onSpeedChange]);

  // キーボードイベントリスナーの設定
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // キーボードショートカット一覧
  const keyboardShortcuts = [
    { key: 'スペース', action: '再生/一時停止' },
    { key: '←', action: '30分前に移動' },
    { key: '→', action: '30分後に移動' },
    { key: 'Home', action: '開始位置に移動' },
    { key: 'End', action: '終了位置に移動' },
    { key: 'Ctrl+1', action: '1倍速' },
    { key: 'Ctrl+2', action: '5倍速' },
    { key: 'Ctrl+3', action: '10倍速' },
    { key: 'Ctrl+4', action: '60倍速' },
    { key: 'Ctrl+5', action: '120倍速' },
  ];

  return (
    <Box sx={{ p: 2 }} role="region" aria-label="軌道コントロールパネル">
      {/* 時間コントロールカード */}
      <Card
        elevation={0}
        sx={{
          mb: 2,
          border: '1px solid rgba(0, 0, 0, 0.2)', // コントラスト向上
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.05)', // コントラスト向上
          px: 2,
          py: 1,
          borderBottom: '1px solid rgba(0, 0, 0, 0.2)', // コントラスト向上
        }}>
          <AccessTimeIcon sx={{ mr: 1, color: theme.palette.primary.dark }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium', fontSize: '1rem' }}>
            時間コントロール
          </Typography>
          <Chip
            label={`${playbackSpeed}倍速`}
            size="small"
            color="primary"
            sx={{
              ml: 1,
              height: '24px',
              '& .MuiChip-label': { px: 1, py: 0, fontSize: '0.875rem' }
            }}
          />
          {isPlaying ? (
            <Chip
              label="再生中"
              size="small"
              color="success"
              sx={{
                ml: 1,
                height: '24px',
                '& .MuiChip-label': { px: 1, py: 0, fontSize: '0.875rem' }
              }}
            />
          ) : (
            <Chip
              label="一時停止"
              size="small"
              color="default"
              sx={{
                ml: 1,
                height: '24px',
                '& .MuiChip-label': { px: 1, py: 0, fontSize: '0.875rem' }
              }}
            />
          )}
          <Box sx={{ ml: 'auto', display: 'flex' }}>
            <Tooltip title="キーボードショートカット">
              <IconButton
                size="medium"
                onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
                aria-label="キーボードショートカットを表示"
                sx={{
                  color: theme.palette.primary.dark,
                  '&:focus': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: '2px'
                  },
                  minWidth: '44px', // タッチターゲットサイズ
                  minHeight: '44px', // タッチターゲットサイズ
                }}
              >
                <KeyboardIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="ヘルプを表示">
              <IconButton
                size="medium"
                onClick={() => setShowHelp(!showHelp)}
                aria-label="ヘルプを表示"
                sx={{
                  color: theme.palette.primary.dark,
                  '&:focus': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: '2px'
                  },
                  minWidth: '44px', // タッチターゲットサイズ
                  minHeight: '44px', // タッチターゲットサイズ
                }}
              >
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <CardContent>
          {/* キーボードショートカット */}
          <Collapse in={showKeyboardShortcuts}>
            <Box sx={{
              backgroundColor: 'rgba(25, 118, 210, 0.05)',
              p: 1.5,
              borderRadius: '4px',
              mb: 1.5,
              border: '1px solid rgba(25, 118, 210, 0.2)',
            }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontSize: '1rem' }}>
                キーボードショートカット
              </Typography>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: 1,
                '& > div': {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 0.5,
                }
              }}>
                {keyboardShortcuts.map((shortcut, index) => (
                  <Box key={index}>
                    <Chip
                      label={shortcut.key}
                      size="small"
                      variant="outlined"
                      sx={{
                        minWidth: '60px',
                        fontSize: '0.875rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      }}
                    />
                    <Typography variant="body2" sx={{ ml: 1, fontSize: '0.875rem' }}>
                      {shortcut.action}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Collapse>

          {/* ヘルプテキスト */}
          <Collapse in={showHelp}>
            <Box sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.05)', // コントラスト向上
              p: 1.5,
              borderRadius: '4px',
              mb: 1.5,
              border: '1px solid rgba(0, 0, 0, 0.1)',
            }}>
              <Typography variant="body1" color="text.primary" sx={{ fontSize: '1rem', lineHeight: 1.5 }}>
                再生/一時停止ボタンで衛星の動きを制御できます。スライダーをドラッグして特定の時間に移動したり、
                スキップボタンで30分単位で移動できます。再生速度は1倍速から120倍速まで変更可能です。
              </Typography>
              <Typography variant="body2" color="text.primary" sx={{ mt: 1, fontSize: '0.875rem' }}>
                キーボードショートカットを使用すると、より素早く操作できます。スペースキーで再生/一時停止、
                矢印キーで時間移動が可能です。
              </Typography>
            </Box>
          </Collapse>

          {/* 時間情報 */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1" color="text.primary" sx={{ fontSize: '1rem' }}>
                現在時刻: {formatDate(currentTime)} {formatTime(currentTime)}
              </Typography>
              <Typography variant="body1" color="text.primary" sx={{ fontSize: '1rem' }}>
                残り時間: {formatDuration(endTimeValue - currentTimeValue)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 12, // より大きく
                borderRadius: 6,
                mb: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.1)', // コントラスト向上
              }}
              aria-label={`再生進捗 ${progress.toFixed(0)}%`}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.primary" sx={{ fontSize: '0.875rem' }}>
                {formatTime(startTime)}
              </Typography>
              <Typography variant="body2" color="text.primary" sx={{ fontSize: '0.875rem' }}>
                {formatTime(endTime)}
              </Typography>
            </Box>
          </Box>

          {/* 再生コントロール */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
            <Tooltip title="開始位置に移動 (Home)">
              <IconButton
                onClick={() => handleJump(true)}
                size="medium"
                aria-label="開始位置に移動"
                sx={{
                  color: theme.palette.grey[900], // コントラスト向上
                  '&:focus': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: '2px'
                  },
                  minWidth: '44px', // タッチターゲットサイズ
                  minHeight: '44px', // タッチターゲットサイズ
                }}
              >
                <SkipPreviousIcon fontSize="medium" />
              </IconButton>
            </Tooltip>
            <Tooltip title="30分前に移動 (←)">
              <IconButton
                onClick={() => handleSkip(-30)}
                size="medium"
                aria-label="30分前に移動"
                sx={{
                  color: theme.palette.grey[900], // コントラスト向上
                  '&:focus': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: '2px'
                  },
                  minWidth: '44px', // タッチターゲットサイズ
                  minHeight: '44px', // タッチターゲットサイズ
                }}
              >
                <FastRewindIcon fontSize="medium" />
              </IconButton>
            </Tooltip>
            <Tooltip title={isPlaying ? "一時停止 (スペース)" : "再生 (スペース)"}>
              <IconButton
                onClick={onPlayPause}
                size="large"
                aria-label={isPlaying ? "一時停止" : "再生"}
                sx={{
                  color: 'white',
                  backgroundColor: isPlaying ? theme.palette.warning.dark : theme.palette.primary.dark, // コントラスト向上
                  '&:hover': {
                    backgroundColor: isPlaying ? theme.palette.warning.dark : theme.palette.primary.dark,
                    opacity: 0.9,
                  },
                  '&:focus': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: '2px'
                  },
                  width: 56, // より大きく
                  height: 56, // より大きく
                  minWidth: '56px', // タッチターゲットサイズ
                  minHeight: '56px', // タッチターゲットサイズ
                }}
              >
                {isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="30分後に移動 (→)">
              <IconButton
                onClick={() => handleSkip(30)}
                size="medium"
                aria-label="30分後に移動"
                sx={{
                  color: theme.palette.grey[900], // コントラスト向上
                  '&:focus': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: '2px'
                  },
                  minWidth: '44px', // タッチターゲットサイズ
                  minHeight: '44px', // タッチターゲットサイズ
                }}
              >
                <FastForwardIcon fontSize="medium" />
              </IconButton>
            </Tooltip>
            <Tooltip title="終了位置に移動 (End)">
              <IconButton
                onClick={() => handleJump(false)}
                size="medium"
                aria-label="終了位置に移動"
                sx={{
                  color: theme.palette.grey[900], // コントラスト向上
                  '&:focus': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: '2px'
                  },
                  minWidth: '44px', // タッチターゲットサイズ
                  minHeight: '44px', // タッチターゲットサイズ
                }}
              >
                <SkipNextIcon fontSize="medium" />
              </IconButton>
            </Tooltip>
          </Box>

          {/* 再生速度選択 */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body1" sx={{ mr: 2, fontSize: '1rem' }}>
              再生速度:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={playbackSpeed}
                onChange={handleSpeedChange}
                variant="outlined"
                size="medium" // より大きく
                displayEmpty
                inputProps={{
                  'aria-label': '再生速度選択',
                  sx: { fontSize: '1rem' } // フォントサイズ増加
                }}
                sx={{
                  '&:focus': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: '2px'
                  },
                  minHeight: '44px', // タッチターゲットサイズ
                }}
              >
                <MenuItem value={1}>1倍速 (Ctrl+1)</MenuItem>
                <MenuItem value={5}>5倍速 (Ctrl+2)</MenuItem>
                <MenuItem value={10}>10倍速 (Ctrl+3)</MenuItem>
                <MenuItem value={60}>60倍速 (Ctrl+4)</MenuItem>
                <MenuItem value={120}>120倍速 (Ctrl+5)</MenuItem>
              </Select>
              <FormHelperText>Ctrl+数字キーでも変更可能</FormHelperText>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* 軌道表示設定カード */}
      <Card
        elevation={0}
        sx={{
          mb: 2,
          border: '1px solid rgba(0, 0, 0, 0.2)', // コントラスト向上
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.05)', // コントラスト向上
          px: 2,
          py: 1,
          borderBottom: '1px solid rgba(0, 0, 0, 0.2)', // コントラスト向上
        }}>
          <TimelineIcon sx={{ mr: 1, color: theme.palette.primary.dark }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium', fontSize: '1rem' }}>
            軌道表示設定
          </Typography>
        </Box>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="body1" gutterBottom sx={{ fontSize: '1rem' }}>
                表示項目:
              </Typography>
              <ToggleButtonGroup
                value={[
                  ...(orbitVisibility.showOrbits ? ['orbits'] : []),
                  ...(orbitVisibility.showFootprints ? ['footprints'] : []),
                ]}
                onChange={handleOrbitVisibilityChange}
                aria-label="軌道表示設定"
                size="medium" // より大きく
                color="primary"
                sx={{
                  width: '100%',
                  '& .MuiToggleButton-root': {
                    minHeight: '44px', // タッチターゲットサイズ
                    fontSize: '1rem', // フォントサイズ増加
                    '&:focus': {
                      outline: `2px solid ${theme.palette.primary.main}`,
                      outlineOffset: '2px'
                    }
                  }
                }}
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
              <Typography variant="body1" gutterBottom sx={{ fontSize: '1rem' }}>
                表示期間:
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1" sx={{ fontSize: '1rem' }}>
                  開始: {formatDate(startTime)} {formatTime(startTime)}
                </Typography>
                <Typography variant="body1" sx={{ fontSize: '1rem' }}>
                  終了: {formatDate(endTime)} {formatTime(endTime)}
                </Typography>
              </Box>
              <Typography variant="body1" color="text.primary" sx={{ fontSize: '1rem' }}>
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

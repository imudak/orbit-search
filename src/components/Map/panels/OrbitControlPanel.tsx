import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Box,
  Slider,
  Button,
  TextField,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';
import TimelineIcon from '@mui/icons-material/Timeline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import type { AnimationState } from './AnimationControlPanel';

interface OrbitControlPanelProps {
  animationState: AnimationState;
  onPlayPause: () => void;
  onSeek: (time: Date) => void;
  onSpeedChange: (speed: number) => void;
  orbitVisibility?: {
    showOrbits: boolean;
    showFootprints: boolean;
    showSunOrbit: boolean;
  };
  onOrbitVisibilityChange?: (settings: { showOrbits: boolean; showFootprints: boolean; showSunOrbit: boolean }) => void;
}

/**
 * 軌道コントロールパネルコンポーネント
 * デモデザインに近づけたシンプルなUI
 */
const OrbitControlPanel: React.FC<OrbitControlPanelProps> = ({
  animationState,
  onPlayPause,
  onSeek,
  onSpeedChange,
  orbitVisibility = { showOrbits: true, showFootprints: true, showSunOrbit: true },
  onOrbitVisibilityChange = () => {},
}) => {
  const { isPlaying, currentTime, startTime, endTime, playbackSpeed } = animationState;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // シークバードラッグ中の一時的な時間状態
  const [localTime, setLocalTime] = useState<Date>(currentTime);

  // currentTimeが変更されたらlocalTimeも更新
  useEffect(() => {
    setLocalTime(currentTime);
  }, [currentTime]);

  // 現在時刻のスライダー値（ミリ秒）
  const currentTimeValue = currentTime.getTime();
  const localTimeValue = localTime.getTime();
  const startTimeValue = startTime.getTime();
  const endTimeValue = endTime.getTime();

  // 時間をフォーマットする関数
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // 日付をフォーマットする関数
  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  // タイムゾーンオフセットを取得（GMT+9形式）
  const getGMTOffset = () => {
    const tzOffset = new Date().getTimezoneOffset();
    const tzSign = tzOffset <= 0 ? '+' : '-';
    const tzHours = Math.floor(Math.abs(tzOffset) / 60);
    return `GMT${tzSign}${tzHours}`;
  };

  // 日時の完全なフォーマット（タイムゾーン情報付き）
  const formatDateTime = (date: Date) => {
    return `${formatDate(date)} ${formatTime(date)} (${getGMTOffset()})`;
  };

  // リセットハンドラー
  const handleReset = () => {
    onSeek(startTime);
  };

  // 軌道表示設定の変更ハンドラー
  const handleOrbitVisibilityChange = (
    event: React.MouseEvent<HTMLElement>,
    newValue: string[]
  ) => {
    onOrbitVisibilityChange({
      showOrbits: newValue.includes('orbits'),
      showFootprints: newValue.includes('footprints'),
      showSunOrbit: newValue.includes('sunorbit'),
    });
  };

  // キーボードショートカット処理
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // スペースキーで再生/一時停止
    if (event.code === 'Space' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      onPlayPause();
      event.preventDefault();
    }
  }, [onPlayPause]);

  // キーボードイベントリスナーの設定
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <Box sx={{ p: 2 }} role="region" aria-label="軌道コントロールパネル">
      <Card
        elevation={0}
        sx={{
          mb: 2,
          border: '1px solid rgba(0, 0, 0, 0.12)',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
            軌道制御
          </Typography>

          {/* 時間制御 */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>時間制御 ({getGMTOffset()})</Typography>
            <TextField
              fullWidth
              size="small"
              value={formatDate(localTime) + " " + formatTime(localTime)}
              sx={{ mb: 1 }}
              InputProps={{
                readOnly: true,
              }}
            />
            <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
              UTC: {localTime.toISOString().substring(0, 16).replace('T', ' ')}
            </Typography>
            <Slider
              value={localTimeValue}
              min={startTimeValue}
              max={endTimeValue}
              onChange={(_, value) => {
                // スライダードラッグ中は内部状態のみを更新
                setLocalTime(new Date(value as number));
              }}
              onChangeCommitted={(_, value) => {
                // スライダードラッグ終了時に実際の時間を更新
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
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
              onClick={onPlayPause}
              sx={{ flex: 1 }}
            >
              {isPlaying ? '停止' : '再生'}
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
        </CardContent>
      </Card>

      {/* 軌道表示設定カード */}
      <Card
        elevation={0}
        sx={{
          mb: 2,
          border: '1px solid rgba(0, 0, 0, 0.12)',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center' }}>
            <TimelineIcon sx={{ mr: 1 }} />
            軌道表示設定
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              表示項目:
            </Typography>
            <ToggleButtonGroup
              value={[
                ...(orbitVisibility.showOrbits ? ['orbits'] : []),
                ...(orbitVisibility.showFootprints ? ['footprints'] : []),
                ...(orbitVisibility.showSunOrbit ? ['sunorbit'] : []),
              ]}
              onChange={handleOrbitVisibilityChange}
              aria-label="軌道表示設定"
              size="small"
              color="primary"
              sx={{ width: '100%' }}
            >
              <ToggleButton
                value="orbits"
                aria-label="軌道を表示"
                sx={{
                  flex: 1,
                  padding: '6px 8px',
                  minWidth: 0
                }}
              >
                <TimelineIcon fontSize="small" />
                <Box component="span" sx={{ ml: 0.5, fontSize: '0.8rem', display: { xs: 'none', sm: 'inline' } }}>
                  軌道
                </Box>
              </ToggleButton>
              <ToggleButton
                value="footprints"
                aria-label="可視範囲を表示"
                sx={{
                  flex: 1,
                  padding: '6px 8px',
                  minWidth: 0
                }}
              >
                <VisibilityIcon fontSize="small" />
                <Box component="span" sx={{ ml: 0.5, fontSize: '0.8rem', display: { xs: 'none', sm: 'inline' } }}>
                  可視範囲
                </Box>
              </ToggleButton>
              <ToggleButton
                value="sunorbit"
                aria-label="太陽軌道を表示"
                sx={{
                  flex: 1,
                  padding: '6px 8px',
                  minWidth: 0
                }}
              >
                <WbSunnyIcon fontSize="small" />
                <Box component="span" sx={{ ml: 0.5, fontSize: '0.8rem', display: { xs: 'none', sm: 'inline' } }}>
                  太陽
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Divider sx={{ my: 2 }} />

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
        </CardContent>
      </Card>
    </Box>
  );
};

export default OrbitControlPanel;

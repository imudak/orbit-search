import React from 'react';
import { Paper, Typography, Box, Divider, IconButton, Collapse } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { OrbitPath } from '@/types';
import { AnimationState } from '../panels/AnimationControlPanel';

interface AnimationPanelProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright' | 'bottom';
  orbitPaths: OrbitPath[];
  animationState: AnimationState;
  satellitePosition?: AnimationState['currentPosition'];
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * アニメーションモード用のパネルコンポーネント
 * 衛星の現在位置と時間情報を表示
 */
const AnimationPanel: React.FC<AnimationPanelProps> = ({
  position = 'topleft',
  orbitPaths,
  animationState,
  satellitePosition,
  isOpen = true,
  onClose
}) => {
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

  return (
    <Box sx={{
      position: 'absolute',
      ...getPositionStyle(),
      zIndex: 1000,
    }}>
      <Collapse in={isOpen}>
        <Paper
          sx={{
            padding: '10px',
            backgroundColor: 'rgba(25, 118, 210, 0.9)', // 青色の背景（アニメーションモードを強調）
            color: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(0, 0, 100, 0.1)',
            maxWidth: '300px',
            height: 'auto',
            maxHeight: 'none',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, borderBottom: '1px solid rgba(255, 255, 255, 0.2)', pb: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              アニメーション情報
            </Typography>
            {onClose && (
              <IconButton
                size="small"
                onClick={onClose}
                sx={{ padding: '2px', color: 'white' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          {/* 軌道パスがない場合 */}
          {orbitPaths.length === 0 ? (
            <Typography variant="body2">
              アニメーションするための軌道データがありません。衛星を選択してください。
            </Typography>
          ) : (
            <>
              {/* 時間情報 */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  時間情報
                </Typography>
                <Typography variant="body2">
                  現在時刻: {formatDate(animationState.currentTime)} {formatTime(animationState.currentTime)}<br />
                  開始時刻: {formatDate(animationState.startTime)} {formatTime(animationState.startTime)}<br />
                  終了時刻: {formatDate(animationState.endTime)} {formatTime(animationState.endTime)}<br />
                  再生速度: {animationState.playbackSpeed}倍速
                </Typography>
              </Box>

              {/* 衛星位置情報（位置情報がある場合） */}
              {satellitePosition && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      衛星位置情報
                    </Typography>
                    <Typography variant="body2">
                      衛星ID: {orbitPaths[0]?.satelliteId}<br />
                      緯度: {satellitePosition.lat.toFixed(6)}°<br />
                      経度: {satellitePosition.lng.toFixed(6)}°<br />
                      仰角: {satellitePosition.elevation.toFixed(2)}°<br />
                      方位角: {satellitePosition.azimuth.toFixed(2)}°<br />
                      距離: {satellitePosition.range.toFixed(2)} km
                    </Typography>
                  </Box>
                </>
              )}

              {/* 位置情報がない場合 */}
              {!satellitePosition && (
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  衛星の位置情報はまだ利用できません。アニメーションを開始してください。
                </Typography>
              )}
            </>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
};

export default AnimationPanel;

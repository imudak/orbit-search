import React from 'react';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToggleButtonGroup, ToggleButton, Box, Typography, Tooltip, Fade, Paper } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

// マップモードの定義
export enum MapMode {
  NORMAL = 'normal',      // 通常表示
  ANIMATION = 'animation', // アニメーションモード
  ANALYSIS = 'analysis'    // 分析モード
}

// モード説明
const MODE_DESCRIPTIONS = {
  [MapMode.NORMAL]: '基本的な地図表示と衛星情報を確認できます。',
  [MapMode.ANIMATION]: '衛星の軌道をアニメーションで再生できます。アニメーションコントロールが表示されます。',
  [MapMode.ANALYSIS]: '衛星の軌道を詳細に分析できます。軌道分析パネルが表示されます。'
};

// モード機能
const MODE_FEATURES = {
  [MapMode.NORMAL]: ['基本情報表示', '衛星位置表示', '可視円表示'],
  [MapMode.ANIMATION]: ['時間制御', '軌道アニメーション', '速度調整', '位置情報表示'],
  [MapMode.ANALYSIS]: ['軌道統計', '最大/平均仰角', '可視性分析', '軌道距離計算']
};

// モード管理のためのコンテキスト型
interface ModeContextType {
  currentMode: MapMode;
  setMode: (mode: MapMode) => void;
  isMode: (mode: MapMode) => boolean;
  showModeInfo: boolean;
  setShowModeInfo: (show: boolean) => void;
}

// モード管理コンテキストの作成
const ModeContext = createContext<ModeContextType | undefined>(undefined);

// モード管理コンテキストのプロバイダーコンポーネント
interface ModeProviderProps {
  children: ReactNode;
  initialMode?: MapMode;
}

/**
 * モード管理システムのプロバイダーコンポーネント
 * モードの状態管理と操作メソッドを提供
 */
export const ModeProvider: React.FC<ModeProviderProps> = ({
  children,
  initialMode = MapMode.NORMAL
}) => {
  // モードの状態
  const [currentMode, setCurrentMode] = useState<MapMode>(initialMode);
  const [showModeInfo, setShowModeInfo] = useState(false);

  // モードを設定する
  const setMode = useCallback((mode: MapMode) => {
    setCurrentMode(mode);
    // モード変更時に一時的に情報を表示
    setShowModeInfo(true);
    // 5秒後に情報を非表示
    setTimeout(() => {
      setShowModeInfo(false);
    }, 5000);
  }, []);

  // 現在のモードを確認する
  const isMode = useCallback((mode: MapMode) => {
    return currentMode === mode;
  }, [currentMode]);

  // コンテキスト値
  const contextValue: ModeContextType = {
    currentMode,
    setMode,
    isMode,
    showModeInfo,
    setShowModeInfo
  };

  return (
    <ModeContext.Provider value={contextValue}>
      {children}
    </ModeContext.Provider>
  );
};

// モード管理コンテキストを使用するためのフック
export const useMapMode = (): ModeContextType => {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMapMode must be used within a ModeProvider');
  }
  return context;
};

// モードに応じたコンポーネントをレンダリングするコンポーネント
interface ModeRendererProps {
  mode: MapMode;
  children: ReactNode;
}

export const ModeRenderer: React.FC<ModeRendererProps> = ({
  mode,
  children
}) => {
  const { isMode } = useMapMode();

  // 指定されたモードの場合のみ子コンポーネントをレンダリング
  return isMode(mode) ? <>{children}</> : null;
};

// モード情報表示コンポーネント
const ModeInfoPanel: React.FC = () => {
  const { currentMode, showModeInfo } = useMapMode();

  if (!showModeInfo) return null;

  return (
    <Fade in={showModeInfo}>
      <Paper
        sx={{
          position: 'absolute',
          top: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1100,
          padding: '10px 15px',
          backgroundColor: 'rgba(25, 118, 210, 0.9)',
          color: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          maxWidth: '80%',
          textAlign: 'center'
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          {currentMode === MapMode.NORMAL ? '通常モード' :
           currentMode === MapMode.ANIMATION ? 'アニメーションモード' : '分析モード'}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {MODE_DESCRIPTIONS[currentMode]}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px' }}>
          {MODE_FEATURES[currentMode].map((feature, index) => (
            <Typography
              key={index}
              variant="caption"
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '2px 6px',
                borderRadius: '4px'
              }}
            >
              {feature}
            </Typography>
          ))}
        </Box>
      </Paper>
    </Fade>
  );
};

// モード選択コンポーネントのプロパティ
interface MapModeSelectorProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
}

/**
 * モード選択コンポーネント
 * 通常/アニメーション/分析モードを切り替えるUIを提供
 */
const MapModeSelector: React.FC<MapModeSelectorProps> = ({
  position = 'topright'
}) => {
  const { currentMode, setMode, setShowModeInfo } = useMapMode();

  // ポジションに応じたスタイルを設定
  const getPositionStyle = () => {
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
        return { top: '10px', right: '10px' };
    }
  };

  // モード変更ハンドラー
  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: MapMode | null) => {
    if (newMode !== null) {
      setMode(newMode);
    }
  };

  // 情報表示ハンドラー
  const handleInfoClick = () => {
    setShowModeInfo(true);
    // 5秒後に情報を非表示
    setTimeout(() => {
      setShowModeInfo(false);
    }, 5000);
  };

  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          ...getPositionStyle(),
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '4px',
          padding: '8px',
          boxShadow: '0 0 5px rgba(0, 0, 0, 0.3)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
            表示モード
          </Typography>
          <Tooltip title="モード情報を表示">
            <InfoOutlinedIcon
              fontSize="small"
              sx={{ cursor: 'pointer', color: 'primary.main' }}
              onClick={handleInfoClick}
            />
          </Tooltip>
        </Box>
        <ToggleButtonGroup
          value={currentMode}
          exclusive
          onChange={handleModeChange}
          size="small"
          aria-label="map mode"
        >
          <ToggleButton
            value={MapMode.NORMAL}
            aria-label="normal mode"
            sx={{
              backgroundColor: currentMode === MapMode.NORMAL ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
              borderColor: currentMode === MapMode.NORMAL ? 'primary.main' : 'rgba(0, 0, 0, 0.12)'
            }}
          >
            <MapIcon fontSize="small" color={currentMode === MapMode.NORMAL ? 'primary' : 'inherit'} />
            <Typography
              variant="caption"
              sx={{
                ml: 0.5,
                color: currentMode === MapMode.NORMAL ? 'primary.main' : 'inherit',
                fontWeight: currentMode === MapMode.NORMAL ? 'bold' : 'normal'
              }}
            >
              通常
            </Typography>
          </ToggleButton>
          <ToggleButton
            value={MapMode.ANIMATION}
            aria-label="animation mode"
            sx={{
              backgroundColor: currentMode === MapMode.ANIMATION ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
              borderColor: currentMode === MapMode.ANIMATION ? 'primary.main' : 'rgba(0, 0, 0, 0.12)'
            }}
          >
            <PlayCircleOutlineIcon
              fontSize="small"
              color={currentMode === MapMode.ANIMATION ? 'primary' : 'inherit'}
            />
            <Typography
              variant="caption"
              sx={{
                ml: 0.5,
                color: currentMode === MapMode.ANIMATION ? 'primary.main' : 'inherit',
                fontWeight: currentMode === MapMode.ANIMATION ? 'bold' : 'normal'
              }}
            >
              アニメーション
            </Typography>
          </ToggleButton>
          <ToggleButton
            value={MapMode.ANALYSIS}
            aria-label="analysis mode"
            sx={{
              backgroundColor: currentMode === MapMode.ANALYSIS ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
              borderColor: currentMode === MapMode.ANALYSIS ? 'primary.main' : 'rgba(0, 0, 0, 0.12)'
            }}
          >
            <AssessmentIcon
              fontSize="small"
              color={currentMode === MapMode.ANALYSIS ? 'primary' : 'inherit'}
            />
            <Typography
              variant="caption"
              sx={{
                ml: 0.5,
                color: currentMode === MapMode.ANALYSIS ? 'primary.main' : 'inherit',
                fontWeight: currentMode === MapMode.ANALYSIS ? 'bold' : 'normal'
              }}
            >
              分析
            </Typography>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <ModeInfoPanel />
    </>
  );
};

export default {
  MapModeSelector,
  ModeProvider,
  useMapMode,
  ModeRenderer,
  MapMode
};

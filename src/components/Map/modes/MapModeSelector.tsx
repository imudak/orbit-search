import React from 'react';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToggleButtonGroup, ToggleButton, Box, Typography } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import AssessmentIcon from '@mui/icons-material/Assessment';

// マップモードの定義
export enum MapMode {
  NORMAL = 'normal',      // 通常表示
  ANIMATION = 'animation', // アニメーションモード
  ANALYSIS = 'analysis'    // 分析モード
}

// モード管理のためのコンテキスト型
interface ModeContextType {
  currentMode: MapMode;
  setMode: (mode: MapMode) => void;
  isMode: (mode: MapMode) => boolean;
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

  // モードを設定する
  const setMode = useCallback((mode: MapMode) => {
    setCurrentMode(mode);
  }, []);

  // 現在のモードを確認する
  const isMode = useCallback((mode: MapMode) => {
    return currentMode === mode;
  }, [currentMode]);

  // コンテキスト値
  const contextValue: ModeContextType = {
    currentMode,
    setMode,
    isMode
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
  const { currentMode, setMode } = useMapMode();

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

  return (
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
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
        表示モード
      </Typography>
      <ToggleButtonGroup
        value={currentMode}
        exclusive
        onChange={handleModeChange}
        size="small"
        aria-label="map mode"
      >
        <ToggleButton value={MapMode.NORMAL} aria-label="normal mode">
          <MapIcon fontSize="small" />
          <Typography variant="caption" sx={{ ml: 0.5 }}>通常</Typography>
        </ToggleButton>
        <ToggleButton value={MapMode.ANIMATION} aria-label="animation mode">
          <PlayCircleOutlineIcon fontSize="small" />
          <Typography variant="caption" sx={{ ml: 0.5 }}>アニメーション</Typography>
        </ToggleButton>
        <ToggleButton value={MapMode.ANALYSIS} aria-label="analysis mode">
          <AssessmentIcon fontSize="small" />
          <Typography variant="caption" sx={{ ml: 0.5 }}>分析</Typography>
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};

export default {
  MapModeSelector,
  ModeProvider,
  useMapMode,
  ModeRenderer,
  MapMode
};

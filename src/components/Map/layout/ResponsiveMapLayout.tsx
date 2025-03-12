import React, { useState, useRef, useEffect } from 'react';
import { Box, useTheme, useMediaQuery, Drawer, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

// レイアウトコンテナ
const LayoutContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  width: '100%',
  height: '100%',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
  },
}));

// サイドパネルコンテナ - リサイズ可能
const SidePanel = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'width'
})<{ width: number }>(({ theme, width }) => ({
  width: `${width}px`,
  height: '100%',
  borderRight: '1px solid rgba(0, 0, 0, 0.1)',
  backgroundColor: '#f5f5f5',
  position: 'relative',
  minWidth: '200px',
  maxWidth: '500px',
  [theme.breakpoints.down('sm')]: {
    width: '100%',
    height: 'auto',
    borderRight: 'none',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
  },
}));

// リサイズハンドル
const ResizeHandle = styled(Box)(({ theme }) => ({
  position: 'absolute',
  right: '-5px',
  top: 0,
  width: '10px',
  height: '100%',
  cursor: 'ew-resize',
  zIndex: 1000,
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  [theme.breakpoints.down('sm')]: {
    display: 'none',
  },
}));

// 地図コンテナ - フルスクリーン表示
const MapContainer = styled(Box)(({ theme }) => ({
  flex: '1 1 auto',
  height: '100%',
  position: 'relative',
  minWidth: 0, // flexboxのバグを防ぐ
  overflow: 'hidden',
}));

// モバイル用のドロワーコンテンツ
const DrawerContent = styled(Box)(({ theme }) => ({
  width: '280px',
  height: '100%',
  [theme.breakpoints.down('sm')]: {
    width: '100vw',
  },
}));

interface ResponsiveMapLayoutProps {
  children: React.ReactNode;
  sidePanel: React.ReactNode;
  controls?: React.ReactNode;
}

/**
 * 人間工学に基づいた2ペインレイアウトのマップコンポーネント
 * デバイスサイズに応じてレイアウトを調整
 * サイドパネルの幅は可変で、ユーザーがリサイズ可能
 */
const ResponsiveMapLayout: React.FC<ResponsiveMapLayoutProps> = ({
  children,
  sidePanel,
  controls,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // サイドパネルの初期幅を設定
  const initialWidth = isTablet ? 280 : 320;
  const [panelWidth, setPanelWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number, startWidth: number } | null>(null);

  // モバイル表示時はドロワーを使用
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  // リサイズ処理の開始
  const handleResizeStart = (e: React.MouseEvent) => {
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startWidth: panelWidth
    };
  };

  // リサイズ中の処理
  const handleResize = (e: MouseEvent) => {
    if (!isResizing || !resizeRef.current) return;

    const deltaX = e.clientX - resizeRef.current.startX;
    const newWidth = Math.max(200, Math.min(500, resizeRef.current.startWidth + deltaX));

    setPanelWidth(newWidth);
  };

  // リサイズ終了処理
  const handleResizeEnd = () => {
    setIsResizing(false);
    resizeRef.current = null;
  };

  // マウスイベントのリスナー設定
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', handleResizeEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing]);

  return (
    <LayoutContainer>
      {/* デスクトップ・タブレット表示時の左側パネル */}
      {!isMobile && (
        <SidePanel width={panelWidth}>
          {sidePanel}
          <ResizeHandle
            onMouseDown={handleResizeStart}
            aria-label="サイドパネルのサイズを変更"
          />
        </SidePanel>
      )}

      {/* 地図コンテナ */}
      <MapContainer>
        {/* 地図コンテンツ */}
        {children}

        {/* コントロール（MinimalControlsコンポーネントなど） */}
        {controls}

        {/* モバイル表示時のドロワー切替ボタン */}
        {isMobile && (
          <Box
            sx={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              zIndex: 1000,
              backgroundColor: 'white',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              padding: '8px',
              cursor: 'pointer',
            }}
            onClick={toggleDrawer}
            aria-label="メニューを開く"
          >
            ≡ メニュー
          </Box>
        )}
      </MapContainer>

      {/* モバイル表示時のドロワー */}
      {isMobile && (
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={toggleDrawer}
        >
          <Box sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '8px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
          }}>
            <IconButton
              onClick={toggleDrawer}
              aria-label="メニューを閉じる"
              size="large"
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <DrawerContent>
            {sidePanel}
          </DrawerContent>
        </Drawer>
      )}
    </LayoutContainer>
  );
};

export default ResponsiveMapLayout;

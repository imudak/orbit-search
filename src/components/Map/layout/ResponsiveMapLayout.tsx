import React from 'react';
import { Box, useTheme, useMediaQuery, Drawer } from '@mui/material';
import { styled } from '@mui/material/styles';

// レイアウトコンテナ
const LayoutContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  width: '100%',
  height: '100%',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
  },
}));

// サイドパネルコンテナ
const SidePanel = styled(Box)(({ theme }) => ({
  width: '320px',
  height: '100%',
  borderRight: '1px solid rgba(0, 0, 0, 0.1)',
  backgroundColor: '#f5f5f5',
  [theme.breakpoints.down('md')]: {
    width: '280px',
  },
  [theme.breakpoints.down('sm')]: {
    width: '100%',
    height: 'auto',
    borderRight: 'none',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
  },
}));

// 地図コンテナ
const MapContainer = styled(Box)(({ theme }) => ({
  flex: '1 1 auto',
  height: '600px',
  position: 'relative',
  minWidth: 0, // flexboxのバグを防ぐ
  [theme.breakpoints.down('sm')]: {
    height: '500px',
  },
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
 */
const ResponsiveMapLayout: React.FC<ResponsiveMapLayoutProps> = ({
  children,
  sidePanel,
  controls,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // モバイル表示時はドロワーを使用
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <LayoutContainer>
      {/* デスクトップ・タブレット表示時の左側パネル */}
      {!isMobile && (
        <SidePanel>
          {sidePanel}
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
          <DrawerContent>
            {sidePanel}
          </DrawerContent>
        </Drawer>
      )}
    </LayoutContainer>
  );
};

export default ResponsiveMapLayout;

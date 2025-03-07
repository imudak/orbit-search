import React from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { styled } from '@mui/material/styles';

// レイアウトコンテナ
const LayoutContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: '20px',
  width: '100%',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    gap: '10px',
  },
}));

// 地図コンテナ
const MapContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  height: '600px',
  borderRadius: '8px',
  overflow: 'hidden',
  position: 'relative',
  [theme.breakpoints.down('sm')]: {
    height: '500px',
    borderRadius: '4px',
  },
}));

// サイドパネルコンテナ
const SidePanelContainer = styled(Box)(({ theme }) => ({
  width: '300px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  [theme.breakpoints.down('sm')]: {
    width: '100%',
    flexDirection: 'row',
    gap: '10px',
  },
}));

// モバイル用のコントロールコンテナ
const MobileControlContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: '10px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1000,
  width: 'calc(100% - 20px)',
  display: 'flex',
  justifyContent: 'center',
  flexWrap: 'wrap',
  gap: '5px',
}));

// デスクトップ用のコントロールコンテナ
const DesktopControlContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '10px',
  right: '10px',
  zIndex: 1000,
}));

// 情報パネルコンテナ
const InfoPanelContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: '10px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 900,
  width: 'calc(100% - 20px)',
  maxWidth: '800px',
  [theme.breakpoints.down('sm')]: {
    bottom: '80px',
  },
}));

interface ResponsiveMapLayoutProps {
  children: React.ReactNode;
  controls?: React.ReactNode;
  infoPanel?: React.ReactNode;
  legend?: React.ReactNode;
  satelliteInfo?: React.ReactNode;
}

/**
 * レスポンシブ対応のマップレイアウトコンポーネント
 * デバイスサイズに応じてレイアウトを調整
 */
const ResponsiveMapLayout: React.FC<ResponsiveMapLayoutProps> = ({
  children,
  controls,
  infoPanel,
  legend,
  satelliteInfo,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <LayoutContainer>
      <MapContainer>
        {/* 地図コンテンツ */}
        {children}

        {/* コントロール */}
        {controls && (
          isMobile ? (
            <MobileControlContainer>
              {controls}
            </MobileControlContainer>
          ) : (
            <DesktopControlContainer>
              {controls}
            </DesktopControlContainer>
          )
        )}

        {/* 情報パネル */}
        {infoPanel && (
          <InfoPanelContainer>
            {infoPanel}
          </InfoPanelContainer>
        )}
      </MapContainer>

      {/* サイドパネル - 中身がある場合のみ表示 */}
      {(legend || satelliteInfo) && (
        <SidePanelContainer>
          {legend && (
            <Box sx={{
              backgroundColor: 'background.paper',
              borderRadius: '8px',
              padding: 2,
              boxShadow: 1,
              display: 'flex',
              flexDirection: 'column'
            }}>
              {legend}
            </Box>
          )}
          {satelliteInfo && satelliteInfo !== true && (
            <Box sx={{
              backgroundColor: 'background.paper',
              borderRadius: '8px',
              padding: 2,
              boxShadow: 1,
              display: 'flex',
              flexDirection: 'column'
            }}>
              {satelliteInfo}
            </Box>
          )}
        </SidePanelContainer>
      )}
    </LayoutContainer>
  );
};

export default ResponsiveMapLayout;

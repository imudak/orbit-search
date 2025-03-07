import React from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { styled } from '@mui/material/styles';

// レイアウトコンテナ
const LayoutContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  width: '100%',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
  },
}));

// 地図コンテナ
const MapContainer = styled(Box)(({ theme }) => ({
  flex: '1 1 auto',
  height: '600px',
  borderRadius: '8px',
  overflow: 'hidden',
  position: 'relative',
  minWidth: 0, // flexboxのバグを防ぐ
  [theme.breakpoints.down('sm')]: {
    height: '500px',
    borderRadius: '4px',
  },
}));

// サイドパネルコンテナ
const SidePanelContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  width: 'fit-content',
  minWidth: 0,
  backgroundColor: 'background.paper',
  borderRadius: '8px',
  padding: 2,
  boxShadow: theme.shadows[1],
  [theme.breakpoints.down('sm')]: {
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

      {/* サイドパネル - 衛星情報がある場合のみ表示 */}
      {satelliteInfo && satelliteInfo !== true && (
        <SidePanelContainer>
          {satelliteInfo}
        </SidePanelContainer>
      )}
    </LayoutContainer>
  );
};

export default ResponsiveMapLayout;

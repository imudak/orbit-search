import React from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { styled } from '@mui/material/styles';

// スタイル付きコンポーネント
const MapContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '500px',
  borderRadius: '8px',
  overflow: 'hidden',
  position: 'relative',
  marginBottom: '10px',
  [theme.breakpoints.down('sm')]: {
    height: '400px', // モバイルでは高さを小さく
    borderRadius: '4px',
    marginBottom: '5px',
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
    bottom: '60px', // モバイルではコントロールの上に配置
  },
}));

interface ResponsiveMapLayoutProps {
  children: React.ReactNode;
  controls?: React.ReactNode;
  infoPanel?: React.ReactNode;
}

/**
 * レスポンシブ対応のマップレイアウトコンポーネント
 * デバイスサイズに応じてレイアウトを調整
 */
const ResponsiveMapLayout: React.FC<ResponsiveMapLayoutProps> = ({
  children,
  controls,
  infoPanel,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
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
  );
};

export default ResponsiveMapLayout;

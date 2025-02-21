/**
 * メインのアプリケーションコンポーネント
 *
 * このコンポーネントは以下の機能を提供します：
 * - 全体のレイアウト構造（Grid-based）
 * - 地図表示と位置選択機能
 * - 検索フィルター機能
 * - 衛星リスト表示と選択機能
 * - TLEデータのダウンロード機能
 */

import React from 'react';
import { Box, Container, Grid, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import Map from '@/components/Map';
import SearchPanel from '@/components/SearchPanel';
import SatelliteList from '@/components/SatelliteList';
import type { Location, SearchFilters, Satellite } from '@/types';
import { useAppStore } from '@/store';
import { tleService } from '@/services/tleService';

// ルートコンテナ - アプリケーション全体のレイアウトを制御
const Root = styled(Box)({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
});

// メインコンテナ - コンテンツ領域のレイアウトを制御
const Main = styled(Container)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: '24px',
  overflow: 'hidden'
});

// 共通のPaperスタイル - Map/SearchPanelとSatelliteListのコンテナ
const StyledPaper = styled(Paper)({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  padding: '16px',
  gap: '16px'
});

const App = () => {
  const {
    selectedLocation,
    searchFilters,
    satellites,
    selectedSatellite,
    isLoading,
    setSelectedLocation,
    setSearchFilters,
    setSelectedSatellite
  } = useAppStore();

  // 位置選択時のハンドラー
  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
  };

  // フィルター変更時のハンドラー
  const handleFiltersChange = (filters: SearchFilters) => {
    setSearchFilters(filters);
  };

  // 衛星選択時のハンドラー
  const handleSatelliteSelect = (satellite: Satellite) => {
    setSelectedSatellite(satellite);
  };

  // TLEデータのダウンロードハンドラー
  const handleTLEDownload = async (satellite: Satellite) => {
    try {
      const tleData = await tleService.getTLE(satellite.noradId);
      const blob = new Blob(
        [`${satellite.name}\n${tleData.line1}\n${tleData.line2}`],
        { type: 'text/plain' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${satellite.name.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download TLE data:', error);
    }
  };

  return (
    <Root>
      <Main maxWidth="xl">
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* 左側エリア - 地図と検索パネル */}
          <Grid item xs={12} md={8}>
            <StyledPaper elevation={0} variant="outlined">
              <Map
                center={selectedLocation}
                onLocationSelect={handleLocationSelect}
                orbitPaths={selectedSatellite ? [
                  {
                    satelliteId: selectedSatellite.id,
                    points: [],
                    timestamp: new Date().toISOString()
                  }
                ] : []}
              />
              <SearchPanel
                filters={searchFilters}
                onFiltersChange={handleFiltersChange}
              />
            </StyledPaper>
          </Grid>
          {/* 右側エリア - 衛星リスト */}
          <Grid item xs={12} md={4}>
            <StyledPaper elevation={0} variant="outlined">
              <SatelliteList
                satellites={satellites}
                onTLEDownload={handleTLEDownload}
                onSatelliteSelect={handleSatelliteSelect}
                selectedSatellite={selectedSatellite}
                isLoading={isLoading}
              />
            </StyledPaper>
          </Grid>
        </Grid>
      </Main>
    </Root>
  );
};

export default App;

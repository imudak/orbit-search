import React, { useCallback } from 'react';
import { Box, Container, Grid, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import Map from '@/components/Map';
import SearchPanel from '@/components/SearchPanel';
import SatelliteList from '@/components/SatelliteList';
import type { Location, SearchFilters, Satellite } from '@/types';
import { useAppStore } from '@/store';
import { tleService } from '@/services/tleService';
import { searchSatellites } from '@/services/satelliteService';

const Root = styled(Box)({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
});

const Main = styled(Container)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: '24px',
  overflow: 'hidden'
});

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
    setSelectedSatellite,
    setSatellites,
    setIsLoading
  } = useAppStore();

  // 衛星検索の実行
  const searchSatellitesWithFilters = useCallback(async () => {
    if (!selectedLocation) return;

    setIsLoading(true);
    try {
      const results = await searchSatellites({
        ...searchFilters,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng
      });
      setSatellites(results);
    } catch (error) {
      console.error('Failed to search satellites:', error);
      setSatellites([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLocation, searchFilters, setIsLoading, setSatellites]);

  // 位置選択時のハンドラー
  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    // 位置が選択されたら衛星を検索
    searchSatellitesWithFilters();
  };

  // フィルター変更時のハンドラー
  const handleFiltersChange = (filters: SearchFilters) => {
    setSearchFilters(filters);
    // フィルターが変更されたら再検索
    searchSatellitesWithFilters();
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

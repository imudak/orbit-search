import React, { useCallback, useEffect, useState } from 'react';
import { Box, Container, Grid, Paper, Typography, AppBar, Toolbar } from '@mui/material';
import { styled } from '@mui/material/styles';
import Map from '@/components/Map';
import SearchPanel from '@/components/SearchPanel';
import SatelliteList from '@/components/SatelliteList';
import type { Location, SearchFilters, Satellite, OrbitPath, LatLng } from '@/types';
import { useAppStore } from '@/store';
import { tleService } from '@/services/tleService';
import { searchSatellites } from '@/services/satelliteService';
import { orbitService } from '@/services/orbitService';

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
  // 軌道パスの状態
  const [orbitPaths, setOrbitPaths] = useState<OrbitPath[]>([]);

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

  // 選択された位置が変更されたら衛星を検索
  useEffect(() => {
    if (selectedLocation) {
      searchSatellitesWithFilters();
    }
  }, [selectedLocation, searchSatellitesWithFilters]);

  // 位置選択時のハンドラー
  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
  };

  // フィルター変更時のハンドラー
  const handleFiltersChange = (filters: SearchFilters) => {
    setSearchFilters(filters);
    // フィルターが変更されたら再検索
    searchSatellitesWithFilters();
  };

  // 衛星選択時のハンドラー
  const handleSatelliteSelect = async (satellite: Satellite) => {
    setSelectedSatellite(satellite);

    // 既存のパスをクリア
    setOrbitPaths([]);

    // 選択された衛星の軌道データを計算
    if (satellite && selectedLocation && searchFilters) {
      try {
        // 衛星の軌道を計算（観測地点からの可視性を含む）
        const passes = await orbitService.calculatePasses(
          satellite.tle,
          selectedLocation,
          searchFilters
        );

        if (passes.length === 0) {
          console.log(`No orbit path found for satellite ${satellite.name}`);
          return;
        }

        // パスのポイントから軌道を作成
        const orbitPath: OrbitPath = {
          satelliteId: satellite.id,
          points: passes[0].points
            .filter(point => point.lat !== undefined && point.lng !== undefined)
            .map(point => ({
              lat: point.lat!,
              lng: point.lng!
            })),
          elevations: passes[0].points
            .filter(point => point.lat !== undefined && point.lng !== undefined)
            .map(point => point.elevation),
          timestamp: new Date().toISOString(),
          maxElevation: passes[0].maxElevation
        };

        // 軌道パスを設定
        setOrbitPaths([orbitPath]);
        console.log(`Calculated orbit path with ${orbitPath.points.length} points for satellite ${satellite.name}`);

      } catch (error) {
        console.error('Failed to calculate orbit path:', error);
      }
    }
  };

  // TLEデータのダウンロードハンドラー
  const handleTLEDownload = async (satellite: Satellite) => {
    try {
      console.log('Downloading TLE for satellite:', satellite);
      const tleData = satellite.tle; // サテライトデータ内のTLEを使用
      console.log('Using TLE data:', tleData);

      if (!tleData || !tleData.line1 || !tleData.line2) {
        throw new Error('TLE data is incomplete');
      }

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
      alert('TLEデータのダウンロードに失敗しました。');
    }
  };

  return (
    <Root>
      {/* アプリのヘッダー */}
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            Orbit Search - 衛星軌道検索
          </Typography>
          <Typography variant="body2" color="inherit">
            地図上の位置をクリックして、その場所から見える衛星を検索します
          </Typography>
        </Toolbar>
      </AppBar>
      <Main maxWidth="xl">
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* 左側エリア - 地図と検索パネル */}
          <Grid item xs={12} md={8}>
            <StyledPaper elevation={0} variant="outlined">
              <Map
                center={selectedLocation}
                onLocationSelect={handleLocationSelect}
                orbitPaths={orbitPaths}
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

import React, { useState, useCallback } from 'react';
import { Box, Container, Grid, Paper } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { styled } from '@mui/material/styles';
import Map from '@/components/Map';
import SearchPanel from '@/components/SearchPanel';
import SatelliteList from '@/components/SatelliteList';
import type { Location, SearchFilters, Satellite, Pass } from '@/types';
import { tleService } from '@/services/tleService';
import { orbitService } from '@/services/orbitService';

const RootContainer = styled(Box)({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

const MainContent = styled(Container)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: '24px',
  overflow: 'hidden',
});

const App: React.FC = () => {
  // 状態管理
  const [selectedLocation, setSelectedLocation] = useState<Location>({
    lat: 35.6812,
    lng: 139.7671,
  });

  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間後
    location: selectedLocation,
    minElevation: 30,
    considerDaylight: false,
  });

  const [satellites, setSatellites] = useState<Array<Satellite & { passes: Pass[] }>>([]);
  const [selectedSatellite, setSelectedSatellite] = useState<Satellite>();
  const [isLoading, setIsLoading] = useState(false);

  // 観測地点が変更された時の処理
  const handleLocationSelect = useCallback((location: Location) => {
    setSelectedLocation(location);
    setSearchFilters(prev => ({ ...prev, location }));
  }, []);

  // 検索フィルターが変更された時の処理
  const handleFiltersChange = useCallback((filters: SearchFilters) => {
    setSearchFilters(filters);
  }, []);

  // TLEデータをダウンロードする処理
  const handleTLEDownload = useCallback(async (satellite: Satellite) => {
    try {
      const tleData = await tleService.getTLE(satellite.noradId);
      // TLEデータをテキストファイルとしてダウンロード
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
  }, []);

  // 衛星が選択された時の処理
  const handleSatelliteSelect = useCallback((satellite: Satellite) => {
    setSelectedSatellite(satellite);
  }, []);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <RootContainer>
        <MainContent maxWidth="xl">
          <Grid container spacing={2} sx={{ height: '100%' }}>
            {/* 左側: 地図と検索パネル */}
            <Grid item xs={12} md={8}>
              <Paper
                elevation={0}
                variant="outlined"
                sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}
              >
                <Map
                  center={selectedLocation}
                  onLocationSelect={handleLocationSelect}
                  orbitPaths={
                    selectedSatellite
                      ? [
                          {
                            satelliteId: selectedSatellite.id,
                            points: [], // TODO: 軌道データの計算
                            timestamp: new Date().toISOString(),
                          },
                        ]
                      : []
                  }
                />
                <SearchPanel
                  filters={searchFilters}
                  onFiltersChange={handleFiltersChange}
                />
              </Paper>
            </Grid>

            {/* 右側: 衛星リスト */}
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                variant="outlined"
                sx={{ height: '100%', overflow: 'auto' }}
              >
                <SatelliteList
                  satellites={satellites}
                  onTLEDownload={handleTLEDownload}
                  onSatelliteSelect={handleSatelliteSelect}
                  selectedSatellite={selectedSatellite}
                  isLoading={isLoading}
                />
              </Paper>
            </Grid>
          </Grid>
        </MainContent>
      </RootContainer>
    </LocalizationProvider>
  );
};

export default App;

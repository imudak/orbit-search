import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ja from 'date-fns/locale/ja';
import Map from '@/components/Map/index';
import SearchPanel from '@/components/SearchPanel';
import SatelliteList from '@/components/SatelliteList';
import ObservationDataDialog from '@/components/ObservationDataDialog';
import type { Location, SearchFilters, Satellite, OrbitPath, OrbitSegment, LatLng, ObservationPoint } from '@/types';
import { useAppStore } from '@/store';
import { tleService } from '@/services/tleService';
import { searchSatellites } from '@/services/satelliteService';
import { orbitService } from '@/services/orbitService';

const Root = styled(Box)({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
});

const Footer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.grey[100],
  borderTop: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  zIndex: 10
}));

const App = () => {
  // 軌道パスの状態
  const [orbitPaths, setOrbitPaths] = useState<OrbitPath[]>([]);

  // 観測データダイアログの状態
  const [observationDialogOpen, setObservationDialogOpen] = useState<boolean>(false);
  const [observationLoading, setObservationLoading] = useState<boolean>(false);
  const [satelliteForObservation, setSatelliteForObservation] = useState<Satellite | null>(null);

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

        // パスのポイントからセグメントを作成
        const points = passes[0].points
          .filter(point => point.lat !== undefined && point.lng !== undefined);

        // セグメントに分割
        const segments: OrbitSegment[] = [];
        let currentSegment: {
          points: LatLng[];
          effectiveAngles: number[];
        } = {
          points: [],
          effectiveAngles: []
        };

        points.forEach(point => {
          if (point.isNewSegment && currentSegment.points.length > 0) {
            segments.push({ ...currentSegment });
            currentSegment = {
              points: [],
              effectiveAngles: []
            };
          }
          currentSegment.points.push({
            lat: point.lat!,
            lng: point.lng!
          });
          currentSegment.effectiveAngles.push(point.effectiveAngle || 0);
        });

        // 最後のセグメントを追加
        if (currentSegment.points.length > 0) {
          segments.push(currentSegment);
        }

        // 軌道パスを作成
        const orbitPath: OrbitPath = {
          satelliteId: satellite.id,
          segments,
          timestamp: new Date().toISOString(),
          maxElevation: passes[0].maxElevation
        };

        // 軌道パスを設定
        setOrbitPaths([orbitPath]);

        const totalPoints = orbitPath.segments.reduce((total, seg) => total + seg.points.length, 0);
        console.log(`Calculated orbit path with ${totalPoints} points in ${orbitPath.segments.length} segments for satellite ${satellite.name}`);
      } catch (error) {
        console.error('Failed to calculate orbit path:', error);
      }
    }
  };

  // 観測データダイアログを開くハンドラー
  const handleObservationDataRequest = (satellite: Satellite) => {
    setSatelliteForObservation(satellite);
    setObservationDialogOpen(true);
  };

  // 観測データをダウンロードするハンドラー
  const handleObservationDataDownload = async (stepSize: number) => {
    if (!satelliteForObservation || !selectedLocation || !searchFilters) {
      return;
    }

    setObservationLoading(true);
    try {
      // 観測データを計算
      const observationData = await orbitService.calculateObservationData(
        satelliteForObservation.tle,
        selectedLocation,
        searchFilters.startDate,
        searchFilters.endDate,
        stepSize
      );

      if (observationData.length === 0) {
        alert('観測データが見つかりませんでした。');
        return;
      }

      // CSVに変換
      const csvData = orbitService.exportObservationDataToCsv(
        observationData,
        satelliteForObservation.name
      );

      // ダウンロード
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${satelliteForObservation.name.replace(/\s+/g, '_')}_observation_data.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setObservationDialogOpen(false);
    } catch (error) {
      console.error('Failed to download observation data:', error);
      alert('観測データのダウンロードに失敗しました。');
    } finally {
      setObservationLoading(false);
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
    <LocalizationProvider dateAdapter={AdapterDateFns} locale={ja}>
      <Root>
        {/* 地図コンポーネント（フルスクリーン） */}
        <Box sx={{ height: 'calc(100vh - 40px)', width: '100%' }}>
          <Map
            center={selectedLocation}
            onLocationSelect={handleLocationSelect}
            orbitPaths={orbitPaths}
            filters={searchFilters}
            satellites={satellites}
            selectedSatellite={selectedSatellite}
            onFiltersChange={handleFiltersChange}
            onSatelliteSelect={handleSatelliteSelect}
            onTLEDownload={handleTLEDownload}
            onObservationDataRequest={handleObservationDataRequest}
            isLoading={isLoading}
          />
        </Box>

        {/* フッター */}
        <Footer>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Kazumi OKANO
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Version 1.0.0
          </Typography>
        </Footer>

        {/* 観測データダイアログ */}
        <ObservationDataDialog
          open={observationDialogOpen}
          onClose={() => setObservationDialogOpen(false)}
          onDownload={handleObservationDataDownload}
          isLoading={observationLoading}
          satelliteName={satelliteForObservation?.name || ''}
        />
      </Root>
    </LocalizationProvider>
  );
};

export default App;

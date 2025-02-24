import type { SearchFilters, Satellite, Pass, CelesTrakGPData } from '@/types';
import { celestrakApi } from '@/utils/api';
import { orbitService } from './orbitService';
import { tleParserService } from './tleParserService';
import { visibilityService } from './visibilityService';

interface SearchSatellitesParams extends SearchFilters {
  latitude: number;
  longitude: number;
}

interface SatelliteResponse extends Satellite {
  passes: Array<Pass>;
}

const MAX_SATELLITES = 100; // 一度に処理する最大衛星数
const RATE_LIMIT_DELAY = 1000; // APIリクエスト間の遅延（ミリ秒）

// モック衛星データ（開発用）
const mockSatellites: SatelliteResponse[] = [
  {
    id: '1',
    name: 'ISS (ZARYA)',
    noradId: '25544',
    type: 'PAYLOAD',
    operationalStatus: 'OPERATIONAL',
    tle: {
      line1: '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927',
      line2: '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537',
      timestamp: new Date().toISOString()
    },
    passes: [
      {
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        maxElevation: 45,
        isDaylight: true,
        points: []
      }
    ]
  }
];

/**
 * CelesTrakのGPデータを内部の衛星型に変換
 */
const convertGPDataToSatellite = (gpData: CelesTrakGPData): Satellite | null => {
  if (!tleParserService.isValidTLE(gpData.TLE_LINE1, gpData.TLE_LINE2)) {
    console.warn(`Invalid TLE data for satellite ${gpData.NORAD_CAT_ID}`);
    return null;
  }

  return {
    id: gpData.OBJECT_ID,
    name: gpData.OBJECT_NAME,
    noradId: gpData.NORAD_CAT_ID,
    type: gpData.OBJECT_TYPE,
    operationalStatus: gpData.OPERATIONAL_STATUS,
    tle: {
      line1: gpData.TLE_LINE1,
      line2: gpData.TLE_LINE2,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * オフラインモードかどうかを判定
 */
const isOfflineMode = (): boolean => {
  return import.meta.env.VITE_USE_MOCK_DATA === 'true' || import.meta.env.VITE_OFFLINE_MODE === 'true';
};

/**
 * 指定された位置とフィルター条件に基づいて衛星を検索します
 */
export const searchSatellites = async (params: SearchSatellitesParams): Promise<SatelliteResponse[]> => {
  try {
    console.log('Searching satellites with params:', params);

    if (isOfflineMode()) {
      console.log('Using mock data (offline mode or mock data enabled)');
      return mockSatellites;
    }

    const endpoints = [
      { url: '/NORAD/elements/visual.txt', format: 'txt' },
      { url: '/NORAD/elements/gp.php', format: 'json' }
    ];

    const observerLat = params.latitude;
    const observerLng = params.longitude;

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint.url}`);
        const requestConfig = {
          params: endpoint.format === 'txt' ? undefined : {
            GROUP: 'visual',
            FORMAT: endpoint.format
          }
        };

        const response = await celestrakApi.get(endpoint.url, requestConfig);
        let satelliteData: CelesTrakGPData[];

        if (endpoint.format === 'txt') {
          if (typeof response.data !== 'string') {
            console.warn('Expected text response but got:', typeof response.data);
            continue;
          }
          satelliteData = tleParserService.parseTLEText(response.data);
        } else {
          if (!Array.isArray(response.data)) {
            console.warn('Expected array response but got:', typeof response.data);
            continue;
          }
          satelliteData = response.data.map(item => ({
            ...item,
            ...tleParserService.generateTLEFromJSON(item)
          }));
        }

        console.log('Received satellite data:', satelliteData.length, 'satellites');

        // 観測地点からの可視性に基づいてフィルタリング
        const filteredData = satelliteData.filter(data => {
          const orbitalElements = visibilityService.extractOrbitalElements(data.TLE_LINE2);
          return visibilityService.isInVisibilityRange(observerLat, observerLng, orbitalElements);
        });

        console.log('Filtered by visibility:', filteredData.length, 'satellites');

        // 衛星データを変換（一度に処理する数を制限）
        const satellites = filteredData
          .slice(0, MAX_SATELLITES)
          .map(convertGPDataToSatellite)
          .filter((satellite): satellite is Satellite => satellite !== null);

        // 可視パスを計算
        const loc = { lat: observerLat, lng: observerLng };
        const results = await Promise.all(
          satellites.map(async (satellite, index) => {
            if (index > 0) {
              await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
            }

            try {
              const passes = await orbitService.calculatePasses(
                satellite.tle,
                loc,
                params
              );

              return {
                ...satellite,
                passes
              };
            } catch (error) {
              console.error(`Failed to calculate passes for satellite ${satellite.noradId}:`, error);
              return {
                ...satellite,
                passes: []
              };
            }
          })
        );

        // パスフィルタリングと並び替え
        return results
          .filter(satellite =>
            satellite.passes.length > 0 &&
            satellite.passes.some(pass => pass.maxElevation >= params.minElevation)
          )
          .sort((a, b) => {
            const maxElevA = Math.max(...a.passes.map(p => p.maxElevation));
            const maxElevB = Math.max(...b.passes.map(p => p.maxElevation));
            return maxElevB - maxElevA;
          });

      } catch (error) {
        console.warn(`Failed to fetch data from ${endpoint}:`, error);
        continue;
      }
    }

    // すべてのエンドポイントが失敗した場合
    console.warn('All endpoints failed, falling back to mock data');
    return mockSatellites;

  } catch (error) {
    console.error('Satellite search failed:', error);
    throw error;
  }
};

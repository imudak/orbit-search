import type { SearchFilters, Satellite, Pass, CelesTrakGPData } from '@/types';
import { celestrakApi } from '@/utils/api';
import { orbitService } from './orbitService';
import { tleParserService } from './tleParserService';
import { visibilityService } from './visibilityService';
import { cacheService } from './cacheService';

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
 * キャッシュからTLEデータを取得
 */
const getCachedSatellite = async (noradId: string): Promise<Satellite | null> => {
  const cachedTLE = await cacheService.getCachedTLE(noradId);
  if (!cachedTLE) {
    return null;
  }
  return {
    id: noradId,
    name: `NORAD ID: ${noradId}`,
    noradId,
    type: 'UNKNOWN',
    operationalStatus: 'UNKNOWN',
    tle: cachedTLE
  };
};

/**
 * CelesTrakのGPデータを内部の衛星型に変換してキャッシュ
 */
const convertGPDataToSatellite = async (gpData: CelesTrakGPData): Promise<Satellite | null> => {
  if (!tleParserService.isValidTLE(gpData.TLE_LINE1, gpData.TLE_LINE2)) {
    console.warn(`Invalid TLE data for satellite ${gpData.NORAD_CAT_ID}`);
    return null;
  }

  const tle = {
    line1: gpData.TLE_LINE1,
    line2: gpData.TLE_LINE2,
    timestamp: new Date().toISOString()
  };

  // TLEデータをキャッシュ
  await cacheService.cacheTLE(gpData.NORAD_CAT_ID, tle);

  return {
    id: gpData.OBJECT_ID,
    name: gpData.OBJECT_NAME,
    noradId: gpData.NORAD_CAT_ID,
    type: gpData.OBJECT_TYPE,
    operationalStatus: gpData.OPERATIONAL_STATUS,
    tle
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
          params: endpoint.format === 'txt' ? {
            _: Date.now() // キャッシュ回避用のタイムスタンプ
          } : {
            GROUP: 'visual',
            FORMAT: 'json',
            _: Date.now() // キャッシュ回避用のタイムスタンプ
          },
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        };

        console.log(`Requesting data from ${endpoint.url}`, requestConfig);
        const response = await celestrakApi.get(endpoint.url, requestConfig);
        console.log('API Response:', {
          status: response.status,
          contentType: response.headers['content-type'],
          dataType: typeof response.data,
          dataLength: typeof response.data === 'string'
            ? response.data.length
            : Array.isArray(response.data)
              ? response.data.length
              : 0
        });

        let satelliteData: CelesTrakGPData[];

        if (endpoint.format === 'txt') {
          if (typeof response.data !== 'string') {
            console.warn('Expected text response but got:', typeof response.data);
            continue;
          }
          // TLEテキストデータの最初の部分を確認
          console.log('TLE text sample:', response.data.substring(0, 200));
          satelliteData = tleParserService.parseTLEText(response.data);
          console.log('Parsed TLE data:', {
            count: satelliteData.length,
            firstSatellite: satelliteData[0]
          });
        } else {
          if (!Array.isArray(response.data)) {
            console.warn('Expected array response but got:', typeof response.data);
            continue;
          }
          console.log('JSON response sample:', {
            first_item: response.data[0],
            total_items: response.data.length
          });

          // APIレスポンスを型安全に処理
          satelliteData = response.data.map(item => {
            try {
              const tleData = tleParserService.generateTLEFromJSON(item);
              return {
                OBJECT_NAME: item.OBJECT_NAME,
                OBJECT_ID: item.OBJECT_ID,
                NORAD_CAT_ID: item.NORAD_CAT_ID,
                OBJECT_TYPE: 'PAYLOAD',
                OPERATIONAL_STATUS: 'UNKNOWN',
                ...tleData
              };
            } catch (error) {
              console.warn('Failed to process satellite data:', {
                item,
                error: error instanceof Error ? error.message : String(error)
              });
              return null;
            }
          }).filter((item): item is CelesTrakGPData => item !== null);
        }

        console.log('Received satellite data:', satelliteData.length, 'satellites');

        console.log('Processing satellites for visibility check:', {
          total: satelliteData.length,
          location: { lat: observerLat, lng: observerLng }
        });

        // 観測地点からの可視性に基づいてフィルタリング
        const filteredData = satelliteData.filter(data => {
          try {
            const orbitalElements = visibilityService.extractOrbitalElements(data.TLE_LINE2);
            const isVisible = visibilityService.isInVisibilityRange(observerLat, observerLng, orbitalElements);

            if (isVisible) {
              console.log('Satellite visible:', {
                name: data.OBJECT_NAME,
                noradId: data.NORAD_CAT_ID,
                elements: orbitalElements
              });
            }

            return isVisible;
          } catch (error) {
            console.warn('Failed to check visibility for satellite:', {
              name: data.OBJECT_NAME,
              noradId: data.NORAD_CAT_ID,
              error: error instanceof Error ? error.message : String(error)
            });
            return false;
          }
        });

        console.log('Visibility filtering results:', {
          total: satelliteData.length,
          visible: filteredData.length,
          location: { lat: observerLat, lng: observerLng }
        });

        // 衛星データを変換（一度に処理する数を制限）
        const satellitePromises = filteredData
          .slice(0, MAX_SATELLITES)
          .map(async (data) => {
            try {
              // まずキャッシュを確認
              const cached = await getCachedSatellite(data.NORAD_CAT_ID);
              if (cached) return cached;

              // キャッシュになければ変換して保存
              return await convertGPDataToSatellite(data);
            } catch (error) {
              console.warn('Failed to process satellite:', error);
              return null;
            }
          });

        const satellites = (await Promise.all(satellitePromises))
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

        // フィルタリング前の状態をログ
        console.log('Before pass filtering:', {
          satellitesCount: results.length,
          withPasses: results.filter(s => s.passes.length > 0).length,
          location: loc
        });

        // パスフィルタリングと並び替え
        const filteredResults = results
          .filter(satellite => {
            const hasPasses = satellite.passes.length > 0;
            const hasVisiblePasses = satellite.passes.some(pass => pass.maxElevation >= params.minElevation);
            console.log('Satellite passes:', {
              name: satellite.name,
              noradId: satellite.noradId,
              passCount: satellite.passes.length,
              maxElevation: Math.max(...satellite.passes.map(p => p.maxElevation))
            });
            return hasPasses && hasVisiblePasses;
          })
          .sort((a, b) => {
            const maxElevA = Math.max(...a.passes.map(p => p.maxElevation));
            const maxElevB = Math.max(...b.passes.map(p => p.maxElevation));
            return maxElevB - maxElevA;
          });

        console.log('Final filtered results:', {
          count: filteredResults.length,
          satellites: filteredResults.map(s => ({
            name: s.name,
            noradId: s.noradId,
            passCount: s.passes.length
          }))
        });

        return filteredResults;

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

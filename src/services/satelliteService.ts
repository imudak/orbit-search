import type { SearchFilters, Satellite, Pass } from '@/types';
import { celestrakApi } from '@/utils/api';
import { tleService } from './tleService';
import { orbitService } from './orbitService';

interface SearchSatellitesParams extends SearchFilters {
  latitude: number;
  longitude: number;
}

interface SatelliteResponse extends Satellite {
  passes: Array<Pass>;
}

interface CelesTrakGPData {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  NORAD_CAT_ID: string;
  OBJECT_TYPE: string;
  OPERATIONAL_STATUS: string;
  TLE_LINE1: string;
  TLE_LINE2: string;
}

const MAX_SATELLITES = 100; // 一度に処理する最大衛星数
const RATE_LIMIT_DELAY = 1000; // APIリクエスト間の遅延（ミリ秒）

/**
 * TLEデータのバリデーション
 */
const isValidTLE = (line1: string, line2: string): boolean => {
  // TLEの基本フォーマットチェック
  if (!line1 || !line2) {
    console.log('TLE validation failed: missing line1 or line2');
    return false;
  }

  // 最小限の構造チェックのみ実行
  if (line1[0] !== '1' || line2[0] !== '2') {
    console.log('TLE validation failed: invalid line numbers');
    return false;
  }

  // 基本的な構造チェック（行の存在とNORAD IDの存在）
  const noradMatch1 = line1.match(/^\d+\s+(\d+)/);
  const noradMatch2 = line2.match(/^\d+\s+(\d+)/);

  if (!noradMatch1 || !noradMatch2) {
    console.log('TLE validation failed: missing NORAD ID');
    return false;
  }

  return true;
};

/**
 * CelesTrakのGPデータを内部の衛星型に変換
 */
const convertGPDataToSatellite = (gpData: CelesTrakGPData): Satellite | null => {
  // TLEデータのバリデーション
  console.log('Converting GP data for satellite:', {
    name: gpData.OBJECT_NAME,
    noradId: gpData.NORAD_CAT_ID,
    tle1: gpData.TLE_LINE1,
    tle2: gpData.TLE_LINE2
  });

  if (!isValidTLE(gpData.TLE_LINE1, gpData.TLE_LINE2)) {
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
 * TLEテキストデータをパース
 */
const parseTLEText = (text: string): CelesTrakGPData[] => {
  const lines = text.trim().split('\n');
  const satellites: CelesTrakGPData[] = [];

  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 >= lines.length) break;

    const name = lines[i].trim();
    const line1 = lines[i + 1].trim();
    const line2 = lines[i + 2].trim();

    if (!name || !line1 || !line2) continue;

    satellites.push({
      OBJECT_NAME: name,
      OBJECT_ID: line1.substring(2, 7),
      NORAD_CAT_ID: line1.substring(2, 7),
      OBJECT_TYPE: 'PAYLOAD', // デフォルト値
      OPERATIONAL_STATUS: 'UNKNOWN', // デフォルト値
      TLE_LINE1: line1,
      TLE_LINE2: line2
    });
  }

  return satellites;
};

/**
 * 指定された位置とフィルター条件に基づいて衛星を検索します
 */
export const searchSatellites = async (params: SearchSatellitesParams): Promise<SatelliteResponse[]> => {
  try {
    console.log('Searching satellites with params:', params);
    console.log('Environment variables:', {
      VITE_USE_MOCK_DATA: import.meta.env.VITE_USE_MOCK_DATA,
      VITE_OFFLINE_MODE: import.meta.env.VITE_OFFLINE_MODE
    });

    // オフラインモードまたはモックデータの使用が指定されている場合
    if (isOfflineMode()) {
      console.log('Using mock data (offline mode or mock data enabled)');
      return mockSatellites;
    }

    console.log('Proceeding with live API call');

    // APIエンドポイントの配列（フォールバック用）
    const endpoints = [
      '/NORAD/elements/visual.txt', // TXT形式を優先
      '/NORAD/elements/gp.php?GROUP=visual&FORMAT=txt'  // バックアップエンドポイント
    ];

    let lastError: Error | null = null;

    // 各エンドポイントを順番に試す
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const requestConfig = {
          params: endpoint.endsWith('.txt') ? undefined : {
            GROUP: 'visual',
            FORMAT: 'json',
          }
        };
        console.log('API Request configuration:', {
          url: endpoint,
          config: requestConfig
        });

        const response = await celestrakApi.get(endpoint, requestConfig);
        console.log('API Response headers:', response.headers);

        // テキスト形式の場合は変換が必要
        let satelliteData: CelesTrakGPData[];

        if (endpoint.endsWith('.txt')) {
          if (typeof response.data !== 'string') {
            console.warn('Invalid text response:', response.data);
            continue;
          }
          satelliteData = parseTLEText(response.data);
        } else {
          if (!Array.isArray(response.data)) {
            console.warn('Invalid JSON response:', response.data);
            continue;
          }
          const firstItem = response.data[0];
          console.log('Raw API response data (first item):', JSON.stringify(firstItem, null, 2));
          console.log('Available fields:', Object.keys(firstItem));

          // APIレスポンスからTLEを生成
          satelliteData = response.data.map(item => {
            // TLE Line 1のフォーマット
            const line1 = `1 ${item.NORAD_CAT_ID.toString().padStart(5, '0')}U ${item.OBJECT_ID.padEnd(8, ' ')} ${
              item.EPOCH.substring(2, 4) // 年
            }${Math.floor((new Date(item.EPOCH).getTime() - new Date(item.EPOCH.substring(0, 4)).getTime()) / (24 * 60 * 60 * 1000)).toString().padStart(3, '0')}` +
            `.${((new Date(item.EPOCH).getTime() % (24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000)).toFixed(8).substring(2)} ` +
            `${item.MEAN_MOTION_DOT.toExponential(8).replace('e-', '-').replace('e+', '+')} ` +
            `${item.MEAN_MOTION_DDOT.toExponential(8).replace('e-', '-').replace('e+', '+')} ` +
            `${item.BSTAR.toExponential(8).replace('e-', '-').replace('e+', '+')} 0 ${item.ELEMENT_SET_NO.toString().padStart(4, ' ')}`;

            // TLE Line 2のフォーマット
            const line2 = `2 ${item.NORAD_CAT_ID.toString().padStart(5, '0')} ${item.INCLINATION.toFixed(4)} ${
              item.RA_OF_ASC_NODE.toFixed(4)} ${item.ECCENTRICITY.toFixed(7).substring(2)} ${
              item.ARG_OF_PERICENTER.toFixed(4)} ${item.MEAN_ANOMALY.toFixed(4)} ${
              item.MEAN_MOTION.toFixed(8)} ${item.REV_AT_EPOCH.toString().padStart(5, ' ')}`;

            return {
              ...item,
              TLE_LINE1: line1,
              TLE_LINE2: line2
            };
          });
        }

        console.log('Received satellite data:', satelliteData.length, 'satellites');

        // 衛星データを変換（一度に処理する数を制限）
        const satellites = satelliteData
          .slice(0, MAX_SATELLITES)
          .map(convertGPDataToSatellite)
          .filter((satellite): satellite is Satellite => satellite !== null);

        console.log('Filtered satellites:', satellites.length);

        // 可視パスを計算
        const loc = {
          lat: params.latitude,
          lng: params.longitude
        };

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

        // フィルタリング
        const filteredSatellites = results.filter(satellite => {
          return satellite.passes.length > 0 &&
            satellite.passes.some(pass => pass.maxElevation >= params.minElevation);
        });

        console.log('Final filtered satellites:', filteredSatellites.length);

        // 最大仰角の高い順にソート
        return filteredSatellites.sort((a, b) => {
          const maxElevA = Math.max(...a.passes.map(p => p.maxElevation));
          const maxElevB = Math.max(...b.passes.map(p => p.maxElevation));
          return maxElevB - maxElevA;
        });

      } catch (error) {
        console.warn(`Failed to fetch data from ${endpoint}:`, error);
        lastError = error as Error;
        continue;
      }
    }

    // すべてのエンドポイントが失敗した場合
    console.warn('All endpoints failed, falling back to mock data');
    return mockSatellites;

  } catch (error) {
    console.error('Satellite search failed:', {
      error,
      params
    });
    throw error;
  }
};

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
  },
  {
    id: '2',
    name: 'STARLINK-1007',
    noradId: '45197',
    type: 'PAYLOAD',
    operationalStatus: 'OPERATIONAL',
    tle: {
      line1: '1 45197U 20019G   24052.17517593  .00002683  00000+0  17330-3 0  9992',
      line2: '2 45197  53.0533 157.6667 0001419  75.4368 284.6793 15.06395718225856',
      timestamp: new Date().toISOString()
    },
    passes: [
      {
        startTime: new Date(),
        endTime: new Date(Date.now() + 7200000),
        maxElevation: 60,
        isDaylight: false,
        points: []
      }
    ]
  }
];

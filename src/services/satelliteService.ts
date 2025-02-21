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
  if (!line1 || !line2) return false;
  if (line1.length !== 69 || line2.length !== 69) return false;

  // 行番号チェック
  if (line1[0] !== '1' || line2[0] !== '2') return false;

  try {
    // チェックサムの検証
    const validateChecksum = (line: string): boolean => {
      let sum = 0;
      for (let i = 0; i < 68; i++) {
        const char = line[i];
        if (char === '-') {
          sum += 1;
        } else if (char >= '0' && char <= '9') {
          sum += parseInt(char, 10);
        }
      }
      const checksum = parseInt(line[68], 10);
      return (sum % 10) === checksum;
    };

    return validateChecksum(line1) && validateChecksum(line2);
  } catch (error) {
    console.warn('TLE checksum validation error:', error);
    return false;
  }
};

/**
 * CelesTrakのGPデータを内部の衛星型に変換
 */
const convertGPDataToSatellite = (gpData: CelesTrakGPData): Satellite | null => {
  // TLEデータのバリデーション
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

    // オフラインモードまたはモックデータの使用が指定されている場合
    if (isOfflineMode()) {
      console.log('Using mock data (offline mode or mock data enabled)');
      return mockSatellites;
    }

    // APIエンドポイントの配列（フォールバック用）
    const endpoints = [
      '/NORAD/elements/gp.php',  // 新しいエンドポイント
      '/NORAD/elements/visual.txt' // 従来のエンドポイント
    ];

    let lastError: Error | null = null;

    // 各エンドポイントを順番に試す
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);

        const response = await celestrakApi.get(endpoint, {
          params: endpoint.endsWith('.txt') ? undefined : {
            GROUP: 'visual',
            FORMAT: 'json',
          }
        });

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
          satelliteData = response.data;
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

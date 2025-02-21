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
 * CelesTrakのGPデータを内部の衛星型に変換
 */
const convertGPDataToSatellite = (gpData: CelesTrakGPData): Satellite => {
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
 * 指定された位置とフィルター条件に基づいて衛星を検索します
 * @param params 検索パラメータ（位置情報とフィルター条件）
 * @returns 衛星のリスト
 */
export const searchSatellites = async (params: SearchSatellitesParams): Promise<SatelliteResponse[]> => {
  try {
    console.log('Searching satellites with params:', params);

    if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
      return mockSatellites;
    }

    // GPデータをバッチで取得（TLEデータを含む）
    const response = await celestrakApi.get<CelesTrakGPData[]>('/gp/gp.php', {
      params: {
        GROUP: 'active',
        FORMAT: 'json',
        EPOCH: '1', // 最新のTLEデータのみを取得
      }
    });

    // 衛星データを変換（一度に処理する数を制限）
    const satellites = response.data
      .slice(0, MAX_SATELLITES)
      .map(convertGPDataToSatellite);

    // 可視パスを計算
    const location = {
      lat: params.latitude,
      lng: params.longitude
    };

    const results = await Promise.all(
      satellites.map(async (satellite, index) => {
        // API制限を考慮して遅延を入れる
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }

        try {
          const passes = await orbitService.calculatePasses(
            satellite.tle,
            location,
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
      // 有効なパスが存在する衛星のみを返す
      return satellite.passes.length > 0 &&
        // 最大仰角でフィルタリング
        satellite.passes.some(pass => pass.maxElevation >= params.minElevation);
    });

    // 最大仰角の高い順にソート
    return filteredSatellites.sort((a, b) => {
      const maxElevA = Math.max(...a.passes.map(p => p.maxElevation));
      const maxElevB = Math.max(...b.passes.map(p => p.maxElevation));
      return maxElevB - maxElevA;
    });

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
    name: 'Mock Satellite 1',
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
    name: 'Mock Satellite 2',
    noradId: '25545',
    type: 'PAYLOAD',
    operationalStatus: 'OPERATIONAL',
    tle: {
      line1: '1 25545U 98067B   08264.51782528 -.00002182  00000-0 -11606-4 0  2927',
      line2: '2 25545  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537',
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

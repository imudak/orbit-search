import type { SearchFilters, Satellite, Pass } from '@/types';
import { api } from '@/utils/api';

interface SearchSatellitesParams extends SearchFilters {
  latitude: number;
  longitude: number;
}

interface SatelliteResponse extends Satellite {
  passes: Array<Pass>;
}

// モック衛星データ（開発用）
const mockSatellites: SatelliteResponse[] = [
  {
    id: '1',
    name: 'Mock Satellite 1',
    noradId: '25544',
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

/**
 * 指定された位置とフィルター条件に基づいて衛星を検索します
 * @param params 検索パラメータ（位置情報とフィルター条件）
 * @returns 衛星のリスト
 */
export const searchSatellites = async (params: SearchSatellitesParams): Promise<SatelliteResponse[]> => {
  try {
    console.log('Searching satellites with params:', params);
    // 開発用: APIリクエストの代わりにモックデータを返す
    return mockSatellites;
  } catch (error) {
    console.error('Satellite search failed:', {
      error,
      params
    });
    throw error;
  }
};

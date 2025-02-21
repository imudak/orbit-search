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
}

/**
 * CelesTrakのGPデータを内部の衛星型に変換
 */
const convertGPDataToSatellite = async (gpData: CelesTrakGPData): Promise<Satellite> => {
  const tleData = await tleService.getTLE(gpData.NORAD_CAT_ID);

  return {
    id: gpData.OBJECT_ID,
    name: gpData.OBJECT_NAME,
    noradId: gpData.NORAD_CAT_ID,
    type: gpData.OBJECT_TYPE,
    operationalStatus: gpData.OPERATIONAL_STATUS,
    tle: tleData
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

    // CelesTrak GPから衛星データを取得
    const response = await celestrakApi.get<CelesTrakGPData[]>('/gp/gp.php', {
      params: {
        GROUP: 'active',
        FORMAT: 'json'
      }
    });

    // 衛星データを取得・変換
    const satellites = await Promise.all(
      response.data.map(async (gpData) => {
        const satellite = await convertGPDataToSatellite(gpData);

        // 可視パスを計算
        const location = {
          lat: params.latitude,
          lng: params.longitude
        };

        const passes = await orbitService.calculatePasses(
          satellite.tle,
          location,
          params
        );

        return {
          ...satellite,
          passes
        };
      })
    );

    // フィルタリング
    const filteredSatellites = satellites.filter(satellite => {
      // 有効なパスが存在する衛星のみを返す
      return satellite.passes.length > 0 &&
        // 最大仰角でフィルタリング
        satellite.passes.some(pass => pass.maxElevation >= params.minElevation);
    });

    return filteredSatellites;

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

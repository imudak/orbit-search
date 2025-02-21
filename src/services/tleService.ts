import type { TLEData } from '@/types';
import { api } from '@/utils/api';

// モックTLEデータ
const mockTLEData: Record<string, TLEData> = {
  '25544': {
    line1: '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927',
    line2: '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537',
    timestamp: new Date().toISOString()
  },
  '25545': {
    line1: '1 25545U 98067B   08264.51782528 -.00002182  00000-0 -11606-4 0  2927',
    line2: '2 25545  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537',
    timestamp: new Date().toISOString()
  }
};

/**
 * 指定された衛星のTLEデータを取得します
 * @param noradId 衛星のNORAD ID
 * @returns TLEデータ
 */
export const tleService = {
  getTLE: async (noradId: string): Promise<TLEData> => {
    try {
      // 開発用: APIリクエストの代わりにモックデータを返す
      const mockData = mockTLEData[noradId];
      if (!mockData) {
        throw new Error(`TLE data not found for NORAD ID: ${noradId}`);
      }
      return mockData;
    } catch (error) {
      console.error('Failed to get TLE data:', error);
      throw error;
    }
  }
};

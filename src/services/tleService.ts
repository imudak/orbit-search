import type { TLEData } from '@/types';
import { celestrakApi } from '@/utils/api';
import { cacheService } from './cacheService';

interface CelesTrakResponse {
  name: string;
  line1: string;
  line2: string;
}

interface MockTLEData {
  [key: string]: TLEData;
}

/**
 * TLEデータサービス
 */
export const tleService = {
  /**
   * 指定された衛星のTLEデータを取得します
   * 1. キャッシュをチェック
   * 2. キャッシュがない場合はAPIからデータを取得
   * 3. 取得したデータをキャッシュに保存
   *
   * @param noradId 衛星のNORAD ID
   * @returns TLEデータ
   */
  getTLE: async (noradId: string): Promise<TLEData> => {
    try {
      // キャッシュをチェック
      const cachedData = await cacheService.getCachedTLE(noradId);
      if (cachedData) {
        return cachedData;
      }

      // CelesTrak APIからデータを取得
      const response = await celestrakApi.get<CelesTrakResponse>('', {
        params: {
          CATNR: noradId,
          FORMAT: 'json'
        }
      });

      const tleData: TLEData = {
        line1: response.data.line1,
        line2: response.data.line2,
        timestamp: new Date().toISOString()
      };

      // データをキャッシュに保存（24時間）
      await cacheService.cacheTLE(noradId, tleData);

      return tleData;
    } catch (error) {
      console.error('Failed to get TLE data:', error);

      // モックデータをフォールバックとして使用（開発用）
      if (import.meta.env.VITE_DEBUG === 'true') {
        const mockData: MockTLEData = {
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

        const mockResponse = mockData[noradId];
        if (mockResponse) {
          return mockResponse;
        }
      }

      throw error;
    }
  }
};

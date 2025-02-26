import type { TLEData } from '@/types';
import { celestrakApi } from '@/utils/api';
import { cacheService } from './cacheService';
import { mockDebugData } from '../__tests__/mocks/tleService.mock';

interface CelesTrakResponse {
  name: string;
  line1: string;
  line2: string;
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
      if (process.env.VITE_DEBUG === 'true') {
        const mockResponse = mockDebugData[noradId];
        if (mockResponse) {
          return mockResponse;
        }
      }

      throw error;
    }
  }
};

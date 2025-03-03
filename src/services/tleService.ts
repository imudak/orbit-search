import type { TLEData } from '@/types';
import { celestrakApi } from '@/utils/api';
import { cacheService } from './cacheService';
import { mockDebugData } from '../__tests__/mocks/tleService.mock';
import { tleParserService } from './tleParserService';

let lastTleCallTimestamp = 0;
const rateLimitDelay = async (): Promise<void> => {
  const now = Date.now();
  const minInterval = 500; // 500ms for 2 requests per second
  const waitTime = minInterval - (now - lastTleCallTimestamp);
  if (waitTime > 0) {
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastTleCallTimestamp = Date.now();
};

// CelesTrak APIのレスポンス形式
interface CelesTrakResponse {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  NORAD_CAT_ID: string; // 文字列型に変更
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  EPHEMERIS_TYPE: number;
  CLASSIFICATION_TYPE: string;
  ELEMENT_SET_NO: number;
  REV_AT_EPOCH: number;
  BSTAR: number;
  MEAN_MOTION_DOT: number;
  MEAN_MOTION_DDOT: number;
  TLE_LINE1?: string; // TLEデータの行1（オプショナル）
  TLE_LINE2?: string; // TLEデータの行2（オプショナル）
}

/**
 * CelesTrakのレスポンスからTLE形式に変換
 */
function convertToTLE(data: CelesTrakResponse): TLEData {
  try {
    // APIレスポンスにTLE_LINE1とTLE_LINE2が含まれている場合
    if ('TLE_LINE1' in data && 'TLE_LINE2' in data && data.TLE_LINE1 && data.TLE_LINE2) {
      const line1 = data.TLE_LINE1;
      const line2 = data.TLE_LINE2;

      const result: TLEData = {
        line1,
        line2,
        timestamp: new Date().toISOString()
      };

      // バリデーション
      if (!tleParserService.isValidTLE(line1, line2)) {
        console.warn('TLE data from API failed validation');
        throw new Error('TLE data from API failed validation');
      }

      return result;
    }

    // APIレスポンスにTLE_LINE1とTLE_LINE2が含まれていない場合は、
    // 軌道要素からTLEデータを生成する

    // GPDataItem形式に変換してtleParserServiceを利用
    const gpDataItem = {
      NORAD_CAT_ID: data.NORAD_CAT_ID,
      OBJECT_ID: data.OBJECT_ID,
      OBJECT_NAME: data.OBJECT_NAME,
      EPOCH: data.EPOCH,
      MEAN_MOTION: data.MEAN_MOTION,
      ECCENTRICITY: data.ECCENTRICITY,
      INCLINATION: data.INCLINATION,
      RA_OF_ASC_NODE: data.RA_OF_ASC_NODE,
      ARG_OF_PERICENTER: data.ARG_OF_PERICENTER,
      MEAN_ANOMALY: data.MEAN_ANOMALY,
      MEAN_MOTION_DOT: data.MEAN_MOTION_DOT,
      MEAN_MOTION_DDOT: data.MEAN_MOTION_DDOT,
      BSTAR: data.BSTAR,
      ELEMENT_SET_NO: data.ELEMENT_SET_NO
    };

    // tleParserServiceを使用してTLEデータを生成
    const tleLines = tleParserService.generateTLEFromJSON(gpDataItem);

    // バリデーション
    if (!tleParserService.isValidTLE(tleLines.TLE_LINE1, tleLines.TLE_LINE2)) {
      console.warn('Generated TLE data failed validation');
      throw new Error('Generated TLE data failed validation');
    }

    const result = {
      line1: tleLines.TLE_LINE1,
      line2: tleLines.TLE_LINE2,
      timestamp: new Date().toISOString()
    };

    return result;
  } catch (error) {
    console.error('Failed to convert CelesTrak response to TLE');
    throw new Error(`TLE conversion failed: ${error instanceof Error ? error.message : String(error)}`);
  }
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
  getTLE: async (noradId: string, bypassCache: boolean = false): Promise<TLEData> => {
    try {
      // キャッシュをチェック (bypassCacheがfalseの場合のみ)
      if (!bypassCache) {
        const cachedData = await cacheService.getCachedTLE(noradId);
        if (cachedData) {
          return cachedData;
        }
      }

      await rateLimitDelay();
      if (bypassCache) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // CelesTrak APIからデータを取得
      const response = await celestrakApi.get<CelesTrakResponse[]>('', {
        params: {
          CATNR: noradId,
          FORMAT: 'json'
        }
      });

      // レスポンスデータをチェック
      if (!response.data || response.data.length === 0) {
        console.error(`No satellite data received from API for NORAD ID: ${noradId}`);
        throw new Error(`No satellite data received from API for NORAD ID: ${noradId}`);
      }

      const satellite = response.data[0];
      if (!satellite.OBJECT_ID || !satellite.EPOCH) {
        console.error(`Invalid satellite data received from API for NORAD ID: ${noradId}`, satellite);
        throw new Error(`Invalid satellite data received from API for NORAD ID: ${noradId}`);
      }

      // TLEデータに変換
      const tleData = convertToTLE(satellite);

      // データをキャッシュに保存（24時間）
      await cacheService.cacheTLE(noradId, tleData);

      return tleData;
    } catch (error: any) {
      console.error(`Failed to get TLE data for NORAD ID: ${noradId}:`, error);

      // エラーの詳細を出力
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }

      // Axiosエラーの場合は詳細を出力
      if (error && error.response && error.config) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            params: error.config?.params,
            baseURL: error.config?.baseURL
          }
        });
      }

      // モックデータをフォールバックとして使用（開発用）
      if (process.env.VITE_DEBUG === 'true') {
        console.warn(`Using mock data for NORAD ID: ${noradId} due to API error`);
        const mockResponse = mockDebugData[noradId];
        if (mockResponse) {
          return mockResponse;
        }
      }

      throw error;
    }
  }
};

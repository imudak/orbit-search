import type { TLEData } from '@/types';
import { celestrakApi } from '@/utils/api';
import { cacheService } from './cacheService';
import { mockDebugData } from '../__tests__/mocks/tleService.mock';

// CelesTrak APIのレスポンス形式
interface CelesTrakResponse {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  NORAD_CAT_ID: number;
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
}

/**
 * CelesTrakのレスポンスからTLE形式に変換
 */
function convertToTLE(data: CelesTrakResponse): TLEData {
  // TLE形式のチェックサム計算
  const calculateChecksum = (line: string): number => {
    return line
      .slice(0, -1)
      .split('')
      .reduce((sum, char) => {
        if (char === '-') return sum + 1;
        if (char >= '0' && char <= '9') return sum + parseInt(char);
        return sum;
      }, 0) % 10;
  };

  // EPOCHの変換（YYDDD.DDDDDDDD形式）
  const epochDate = new Date(data.EPOCH);
  const year = epochDate.getUTCFullYear().toString().slice(-2);
  const startOfYear = new Date(Date.UTC(epochDate.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((epochDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const fractionalDay = (epochDate.getUTCHours() * 3600 + epochDate.getUTCMinutes() * 60 + epochDate.getUTCSeconds()) / (24 * 3600);
  const epoch = `${year}${dayOfYear.toString().padStart(3, '0')}.${Math.floor(fractionalDay * 100000000).toString().padStart(8, '0')}`;

  // 1行目の生成
  const line1 = `1 ${data.NORAD_CAT_ID.toString().padStart(5, '0')}${data.CLASSIFICATION_TYPE} ${
    data.OBJECT_ID.padEnd(8, ' ')
  }${epoch} ${data.MEAN_MOTION_DOT.toFixed(8)} ${data.MEAN_MOTION_DDOT.toExponential(5)} ${
    data.BSTAR.toExponential(5)
  } 0 ${data.ELEMENT_SET_NO}`;

  // 2行目の生成
  const line2 = `2 ${data.NORAD_CAT_ID.toString().padStart(5, '0')} ${data.INCLINATION.toFixed(4)} ${
    data.RA_OF_ASC_NODE.toFixed(4)
  } ${data.ECCENTRICITY.toString().replace('0.', '')} ${data.ARG_OF_PERICENTER.toFixed(4)} ${
    data.MEAN_ANOMALY.toFixed(4)
  } ${data.MEAN_MOTION.toFixed(8)}${data.REV_AT_EPOCH.toString().padStart(5, '0')}`;

  // チェックサムの追加
  const line1WithChecksum = `${line1}${calculateChecksum(line1)}`;
  const line2WithChecksum = `${line2}${calculateChecksum(line2)}`;

  return {
    line1: line1WithChecksum,
    line2: line2WithChecksum,
    timestamp: new Date().toISOString()
  };
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
      const response = await celestrakApi.get<CelesTrakResponse[]>('', {
        params: {
          CATNR: noradId,
          FORMAT: 'json'
        }
      });

      // レスポンスデータをチェック
      if (!response.data || response.data.length === 0) {
        throw new Error('No satellite data received from API');
      }

      const satellite = response.data[0];
      if (!satellite.OBJECT_ID || !satellite.EPOCH) {
        throw new Error('Invalid satellite data received from API');
      }

      // TLEデータに変換
      const tleData = convertToTLE(satellite);

      // デバッグ情報を出力
      console.debug('Generated TLE data:', {
        OBJECT_NAME: satellite.OBJECT_NAME,
        NORAD_CAT_ID: satellite.NORAD_CAT_ID,
        data: tleData
      });

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

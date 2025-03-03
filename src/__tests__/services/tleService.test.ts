import { tleService } from '../../services/tleService';
import { cacheService } from '../mocks/cacheService.mock';
import { celestrakApi } from '../../utils/api';
import { mockTLEData } from '../mocks/tleService.mock';

// モジュールのモック化
jest.mock('../../services/cacheService', () => require('../mocks/cacheService.mock'));
jest.mock('../../utils/api');

// Viteの環境変数のモック
const mockEnv = {
  VITE_DEBUG: 'false'
};

// import.meta.envのモック
global.process.env = { ...global.process.env, ...mockEnv };

describe('tleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cacheService.clearCache();
  });

  describe('getTLE', () => {
    it('キャッシュからTLEデータを取得できる', async () => {
      // キャッシュサービスのモック設定
      await cacheService.cacheTLE('25544', mockTLEData);

      const result = await tleService.getTLE('25544');

      expect(result).toEqual(mockTLEData);
      expect(cacheService.getCachedTLE).toHaveBeenCalledWith('25544');
      expect(celestrakApi.get).not.toHaveBeenCalled();
    });

    it('APIから新しいTLEデータを取得してキャッシュする', async () => {
      // キャッシュが存在しないケース
      (cacheService.getCachedTLE as jest.Mock).mockResolvedValueOnce(null);

      // API応答のモック
      (celestrakApi.get as jest.Mock).mockResolvedValue({
        data: {
          line1: mockTLEData.line1,
          line2: mockTLEData.line2
        }
      });

      const result = await tleService.getTLE('25544');

      expect(result.line1).toBe(mockTLEData.line1);
      expect(result.line2).toBe(mockTLEData.line2);
      expect(cacheService.cacheTLE).toHaveBeenCalledWith('25544', expect.any(Object));
    });

    it('APIエラー時にモックデータを返す（開発環境のみ）', async () => {
      // 開発環境の設定
      process.env.VITE_DEBUG = 'true';

      // キャッシュとAPIの失敗をシミュレート
      (cacheService.getCachedTLE as jest.Mock).mockResolvedValueOnce(null);
      (celestrakApi.get as jest.Mock).mockRejectedValue(new Error('API Error'));

      const result = await tleService.getTLE('25544');

      expect(result).toBeTruthy();
      expect(result.line1).toContain('25544');

      // 環境変数を元に戻す
      process.env.VITE_DEBUG = mockEnv.VITE_DEBUG;
    });

    it('APIエラー時に例外をスロー（本番環境）', async () => {
      // 本番環境の設定
      process.env.VITE_DEBUG = 'false';

      // キャッシュとAPIの失敗をシミュレート
      (cacheService.getCachedTLE as jest.Mock).mockResolvedValueOnce(null);
      (celestrakApi.get as jest.Mock).mockRejectedValue(new Error('API Error'));

      await expect(tleService.getTLE('25544')).rejects.toThrow('API Error');
    });

    it('レート制限に従ってAPIリクエストを行う', async () => {
      // キャッシュが存在しないケース
      (cacheService.getCachedTLE as jest.Mock).mockResolvedValue(null);

      // API応答のモック
      (celestrakApi.get as jest.Mock).mockResolvedValue({
        data: {
          line1: mockTLEData.line1,
          line2: mockTLEData.line2
        }
      });

      // 複数のリクエストを実行
      const requests = Array(3).fill(null).map(() => tleService.getTLE('25544'));
      const results = await Promise.all(requests);

      results.forEach(result => {
        expect(result.line1).toBe(mockTLEData.line1);
        expect(result.line2).toBe(mockTLEData.line2);
      });

      expect(celestrakApi.get).toHaveBeenCalledTimes(3);
    });
  });
});

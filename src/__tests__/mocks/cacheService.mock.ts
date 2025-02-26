import type { TLEData } from '../../types';

// インメモリキャッシュ
const memoryCache: { [key: string]: { data: TLEData; expires: number } } = {};

export const cacheService = {
  getCachedTLE: jest.fn().mockImplementation(async (noradId: string) => {
    const cached = memoryCache[noradId];
    if (!cached || cached.expires < Date.now()) {
      return null;
    }
    return cached.data;
  }),

  cacheTLE: jest.fn().mockImplementation(async (noradId: string, data: TLEData) => {
    memoryCache[noradId] = {
      data,
      expires: Date.now() + 24 * 60 * 60 * 1000 // 24時間
    };
  }),

  clearCache: jest.fn().mockImplementation(async () => {
    Object.keys(memoryCache).forEach(key => delete memoryCache[key]);
  }),

  initDB: jest.fn().mockResolvedValue(undefined)
};

// モックをエクスポート
export default cacheService;

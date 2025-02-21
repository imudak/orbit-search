import { TLEData, Satellite } from '@/types';

const CELESTRAK_BASE_URL = 'https://celestrak.org/NORAD/elements/gp.php';
const CACHE_KEY = 'tle_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24時間

interface CacheData {
  timestamp: number;
  data: Record<string, TLEData>;
}

export class TLEService {
  private cache: Map<string, TLEData>;

  constructor() {
    this.cache = new Map();
    this.loadCache();
  }

  /**
   * TLEデータを取得
   */
  async getTLE(noradId: string): Promise<TLEData> {
    // キャッシュチェック
    const cachedData = this.cache.get(noradId);
    if (cachedData) {
      return cachedData;
    }

    // CelesTrakからデータ取得
    const response = await fetch(`${CELESTRAK_BASE_URL}?CATNR=${noradId}&FORMAT=json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch TLE data: ${response.statusText}`);
    }

    const data = await response.json();
    const tleData: TLEData = {
      line1: data.line1,
      line2: data.line2,
      timestamp: new Date().toISOString(),
    };

    // キャッシュに保存
    this.cache.set(noradId, tleData);
    this.saveCache();

    return tleData;
  }

  /**
   * 複数の衛星のTLEデータを一括取得
   */
  async getTLEBulk(noradIds: string[]): Promise<Record<string, TLEData>> {
    const results: Record<string, TLEData> = {};
    const uncachedIds = noradIds.filter(id => !this.cache.has(id));

    // キャッシュからデータを取得
    noradIds.forEach(id => {
      const cachedData = this.cache.get(id);
      if (cachedData) {
        results[id] = cachedData;
      }
    });

    if (uncachedIds.length > 0) {
      // 未キャッシュのデータを一括取得
      const query = uncachedIds.join(',');
      const response = await fetch(`${CELESTRAK_BASE_URL}?CATNR=${query}&FORMAT=json`);
      if (!response.ok) {
        throw new Error(`Failed to fetch TLE data: ${response.statusText}`);
      }

      const data = await response.json();
      const timestamp = new Date().toISOString();

      // 配列データを処理
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          const tleData: TLEData = {
            line1: item.line1,
            line2: item.line2,
            timestamp,
          };
          const id = item.NORAD_CAT_ID.toString();
          results[id] = tleData;
          this.cache.set(id, tleData);
        });
      }

      this.saveCache();
    }

    return results;
  }

  /**
   * キャッシュをLocalStorageから読み込み
   */
  private loadCache(): void {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data: CacheData = JSON.parse(cached);
        const now = Date.now();

        // キャッシュの有効期限チェック
        if (now - data.timestamp < CACHE_EXPIRY) {
          Object.entries(data.data).forEach(([id, tleData]) => {
            this.cache.set(id, tleData);
          });
        } else {
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (error) {
      console.error('Failed to load TLE cache:', error);
      localStorage.removeItem(CACHE_KEY);
    }
  }

  /**
   * キャッシュをLocalStorageに保存
   */
  private saveCache(): void {
    try {
      const cacheData: CacheData = {
        timestamp: Date.now(),
        data: Object.fromEntries(this.cache.entries()),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to save TLE cache:', error);
    }
  }
}

// シングルトンインスタンスをエクスポート
export const tleService = new TLEService();

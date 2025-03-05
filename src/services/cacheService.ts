import { openDB, IDBPDatabase } from 'idb';
import type { TLEData } from '@/types';

const DB_NAME = 'orbit-search-db';
const TLE_STORE = 'tle-cache';
const EPHEMERIS_STORE = 'ephemeris-cache';
const DB_VERSION = 2;

// キャッシュの設定
const CACHE_CONFIG = {
  TTL: {
    DEFAULT: 7 * 24 * 60 * 60 * 1000, // 1週間
    MINIMUM: 24 * 60 * 60 * 1000,     // 最小24時間
  },
  CLEANUP: {
    INTERVAL: 12 * 60 * 60 * 1000,    // 12時間ごとにクリーンアップ
  },
  RATE_LIMIT: {
    MAX_REQUESTS: 1000,               // 1時間あたりの最大リクエスト数を1000に増加
    WINDOW: 60 * 60 * 1000,           // 1時間
  }
} as const;

interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface RateLimitInfo {
  count: number;
  windowStart: number;
}

class CacheService {
  private db: Promise<IDBPDatabase>;
  private cleanupInterval: number = 0;
  private rateLimit: RateLimitInfo = {
    count: 0,
    windowStart: Date.now()
  };

  constructor() {
    this.db = this.initDB();
    this.startCleanupSchedule();
  }

  private async initDB() {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        // TLEストアの作成
        if (!db.objectStoreNames.contains(TLE_STORE)) {
          db.createObjectStore(TLE_STORE, { keyPath: 'noradId' });
        }

        // Ephemerisストアの作成
        if (!db.objectStoreNames.contains(EPHEMERIS_STORE)) {
          db.createObjectStore(EPHEMERIS_STORE, { keyPath: 'cacheKey' });
        }
      },
    });
  }

  /**
   * 汎用的なキャッシュ取得メソッド
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await this.db;
      const item = await db.get(EPHEMERIS_STORE, key) as (CacheItem & { cacheKey: string }) | undefined;

      if (!item) {
        return null;
      }

      const now = Date.now();
      if (now > item.expiresAt) {
        await db.delete(EPHEMERIS_STORE, key);
        return null;
      }

      return item.data as T;
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }

  /**
   * 汎用的なキャッシュ保存メソッド
   */
  async set<T>(key: string, data: T, ttl: number = CACHE_CONFIG.TTL.DEFAULT): Promise<void> {
    if (!this.checkRateLimit()) {
      console.warn('Rate limit exceeded for cache operation');
      return;
    }

    const item: CacheItem = {
      data: data as any,
      timestamp: Date.now(),
      expiresAt: Date.now() + Math.max(ttl, CACHE_CONFIG.TTL.MINIMUM),
    };

    try {
      const db = await this.db;
      await db.put(EPHEMERIS_STORE, { ...item, cacheKey: key });
    } catch (error) {
      console.error('Failed to cache data:', error);
      throw error;
    }
  }

  /**
   * レート制限のチェックと更新
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    if (now - this.rateLimit.windowStart > CACHE_CONFIG.RATE_LIMIT.WINDOW) {
      // 新しいウィンドウの開始
      this.rateLimit = {
        count: 1,
        windowStart: now
      };
      return true;
    }

    if (this.rateLimit.count >= CACHE_CONFIG.RATE_LIMIT.MAX_REQUESTS) {
      return false;
    }

    this.rateLimit.count++;
    return true;
  }

  /**
   * クリーンアップスケジュールを開始
   */
  private startCleanupSchedule() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = window.setInterval(
      () => this.cleanupExpiredCache(),
      CACHE_CONFIG.CLEANUP.INTERVAL
    );
  }

  /**
   * 期限切れのキャッシュをクリーンアップ
   */
  private async cleanupExpiredCache() {
    try {
      console.log('Starting cache cleanup...');
      const db = await this.db;
      const now = Date.now();

      // 全てのキャッシュエントリを取得
      const tx = db.transaction(TLE_STORE, 'readwrite');
      const store = tx.objectStore(TLE_STORE);
      const items = await store.getAll();

      // 期限切れのアイテムを削除
      const deletePromises = items
        .filter(item => now > item.expiresAt)
        .map(item => store.delete(item.noradId));

      await Promise.all(deletePromises);
      await tx.done;

      console.log(`Cache cleanup completed. Removed ${deletePromises.length} items.`);
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }

  /**
   * TLEデータをキャッシュに保存
   */
  async cacheTLE(
    noradId: string,
    data: TLEData,
    ttl: number = CACHE_CONFIG.TTL.DEFAULT
  ) {
    if (!this.checkRateLimit()) {
      console.warn('Rate limit exceeded. Using extended cache.');
      return;
    }

    // 最小TTLを確保
    const actualTtl = Math.max(ttl, CACHE_CONFIG.TTL.MINIMUM);

    const item: CacheItem = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + actualTtl,
    };

    try {
      const db = await this.db;
      await db.put(TLE_STORE, { ...item, noradId });
    } catch (error) {
      console.error('Failed to cache TLE:', error);
      throw error;
    }
  }

  /**
   * キャッシュからTLEデータを取得
   */
  async getCachedTLE(noradId: string): Promise<TLEData | null> {
    try {
      const db = await this.db;
      const item = await db.get(TLE_STORE, noradId) as (CacheItem & { noradId: string }) | undefined;

      if (!item) {
        return null;
      }

      const now = Date.now();
      if (now > item.expiresAt) {
        await this.clearCache(noradId);
        return null;
      }

      // レート制限時は期限切れのデータも許容
      if (!this.checkRateLimit() && now - item.timestamp < CACHE_CONFIG.TTL.DEFAULT * 2) {
        console.log('Using extended cache due to rate limiting');
        return item.data;
      }

      return item.data;
    } catch (error) {
      console.error('Failed to get cached TLE:', error);
      return null;
    }
  }

  /**
   * 指定されたNORAD IDのキャッシュを削除
   */
  async clearCache(noradId: string) {
    try {
      const db = await this.db;
      await db.delete(TLE_STORE, noradId);
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * 全てのキャッシュを削除
   */
  async clearAllCache() {
    try {
      const db = await this.db;
      await db.clear(TLE_STORE);
    } catch (error) {
      console.error('Failed to clear all cache:', error);
      throw error;
    }
  }

  /**
   * サービスのクリーンアップ
   */
  dispose() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * キャッシュの統計情報を取得
   */
  async getStats(): Promise<{
    totalItems: number;
    oldestItem: Date | null;
    newestItem: Date | null;
    rateLimitInfo: RateLimitInfo;
  }> {
    const db = await this.db;
    const items = await db.getAll(TLE_STORE);

    let oldest: Date | null = null;
    let newest: Date | null = null;

    items.forEach(item => {
      const timestamp = new Date(item.timestamp);
      if (!oldest || timestamp < oldest) oldest = timestamp;
      if (!newest || timestamp > newest) newest = timestamp;
    });

    return {
      totalItems: items.length,
      oldestItem: oldest,
      newestItem: newest,
      rateLimitInfo: { ...this.rateLimit }
    };
  }
}

export const cacheService = new CacheService();

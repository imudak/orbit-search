import { openDB, IDBPDatabase } from 'idb';
import type { TLEData } from '@/types';

const DB_NAME = 'orbit-search-db';
const TLE_STORE = 'tle-cache';
const DB_VERSION = 1;

interface CacheItem {
  data: TLEData;
  timestamp: number;
  expiresAt: number;
}

class CacheService {
  private db: Promise<IDBPDatabase>;

  constructor() {
    this.db = this.initDB();
  }

  private async initDB() {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(TLE_STORE)) {
          db.createObjectStore(TLE_STORE, { keyPath: 'noradId' });
        }
      },
    });
  }

  async cacheTLE(noradId: string, data: TLEData, ttl: number = 24 * 60 * 60 * 1000) {
    const item: CacheItem = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    const db = await this.db;
    await db.put(TLE_STORE, { ...item, noradId });
  }

  async getCachedTLE(noradId: string): Promise<TLEData | null> {
    try {
      const db = await this.db;
      const item = await db.get(TLE_STORE, noradId) as (CacheItem & { noradId: string }) | undefined;

      if (!item) {
        return null;
      }

      // キャッシュが期限切れの場合
      if (Date.now() > item.expiresAt) {
        await this.clearCache(noradId);
        return null;
      }

      return item.data;
    } catch (error) {
      console.error('Failed to get cached TLE:', error);
      return null;
    }
  }

  async clearCache(noradId: string) {
    const db = await this.db;
    await db.delete(TLE_STORE, noradId);
  }

  async clearAllCache() {
    const db = await this.db;
    await db.clear(TLE_STORE);
  }
}

export const cacheService = new CacheService();

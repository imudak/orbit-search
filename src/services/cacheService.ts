import { openDB, IDBPDatabase } from 'idb';
import type { TLEData } from '@/types';

const DB_NAME = 'orbit-search-db';
const TLE_STORE = 'tle-cache';
const DB_VERSION = 1;

// キャッシュの設定
const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24時間
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1時間ごとにクリーンアップ
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 最大7日間

interface CacheItem {
  data: TLEData;
  timestamp: number;
  expiresAt: number;
}

class CacheService {
  private db: Promise<IDBPDatabase>;
  private cleanupInterval: number = 0;

  constructor() {
    this.db = this.initDB();
    this.startCleanupSchedule();
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

  /**
   * クリーンアップスケジュールを開始
   */
  private startCleanupSchedule() {
    // 前回のインターバルをクリア
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // 新しいクリーンアップスケジュールを設定
    this.cleanupInterval = window.setInterval(
      () => this.cleanupExpiredCache(),
      CLEANUP_INTERVAL
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
        .filter(item => now > item.expiresAt || (now - item.timestamp) > MAX_CACHE_AGE)
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
   * @param noradId 衛星のNORAD ID
   * @param data TLEデータ
   * @param ttl キャッシュの有効期限（ミリ秒）
   */
  async cacheTLE(
    noradId: string,
    data: TLEData,
    ttl: number = DEFAULT_CACHE_TTL
  ) {
    // 最大キャッシュ期間を超えないようにする
    const actualTtl = Math.min(ttl, MAX_CACHE_AGE);

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
   * @param noradId 衛星のNORAD ID
   * @returns TLEデータまたはnull
   */
  async getCachedTLE(noradId: string): Promise<TLEData | null> {
    try {
      const db = await this.db;
      const item = await db.get(TLE_STORE, noradId) as (CacheItem & { noradId: string }) | undefined;

      if (!item) {
        return null;
      }

      const now = Date.now();

      // キャッシュが期限切れまたは最大期間を超えている場合
      if (now > item.expiresAt || (now - item.timestamp) > MAX_CACHE_AGE) {
        await this.clearCache(noradId);
        return null;
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
}

export const cacheService = new CacheService();

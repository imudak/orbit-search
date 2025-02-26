import { openDB } from 'idb';
import { DB_NAME, DB_VERSION, TLE_STORE } from './constants';

/**
 * テスト用のDBクリーンアップ
 */
export async function clearDB() {
  try {
    const db = await openDB(DB_NAME, DB_VERSION);
    const stores = [TLE_STORE];
    const tx = db.transaction(stores, 'readwrite');

    await Promise.all(
      stores.map(store => tx.objectStore(store).clear())
    );

    await tx.done;
    await db.close();
  } catch (error) {
    console.error('Failed to clear test database:', error);
  }
}

/**
 * DBの削除
 */
export async function deleteDB() {
  try {
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(undefined);
    });
  } catch (error) {
    console.error('Failed to delete test database:', error);
  }
}

/**
 * DBの初期化
 */
export async function initDB() {
  try {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(TLE_STORE)) {
          db.createObjectStore(TLE_STORE, { keyPath: 'noradId' });
        }
      },
    });
    await db.close();
  } catch (error) {
    console.error('Failed to initialize test database:', error);
  }
}

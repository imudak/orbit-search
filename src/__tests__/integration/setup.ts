import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { clearDB, deleteDB, initDB } from './helpers';

// structuredCloneのポリフィル
if (typeof global.structuredClone !== 'function') {
  global.structuredClone = function(obj: any) {
    return JSON.parse(JSON.stringify(obj));
  };
}

// IndexedDBのグローバル設定
declare global {
  interface Window {
    indexedDB: IDBFactory;
  }
  function structuredClone<T>(value: T): T;
}

// テスト環境のセットアップ
beforeAll(async () => {
  // fake-indexeddbをグローバルに設定
  globalThis.indexedDB = new IDBFactory();

  // データベースの初期化
  await deleteDB(); // 既存のDBを削除
  await initDB();   // 新しいDBを作成
});

// 各テスト前にDBをクリーンアップ
beforeEach(async () => {
  await clearDB();
});

// テスト終了後のクリーンアップ
afterAll(async () => {
  await deleteDB();

  // 非同期処理の完了を待機
  await new Promise(resolve => setTimeout(resolve, 1000));
});

require('@testing-library/jest-dom');

// IndexedDBのモック
class IDBDatabase {}
class IDBRequest {}
class IDBObjectStore {}
class IDBIndex {}

global.indexedDB = {
  open: jest.fn().mockReturnValue({
    result: new IDBDatabase(),
    onerror: null,
    onsuccess: null,
    onupgradeneeded: null
  })
};

// テスト実行時のコンソールエラーを抑制
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      /Warning: ReactDOM.render is no longer supported in React 18/.test(args[0])
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// グローバルなモックのリセット
beforeEach(() => {
  jest.clearAllMocks();
});

// 環境変数のセットアップ
process.env.CELESTRAK_API_URL = 'https://celestrak.org/NORAD/elements/gp.php';
process.env.CELESTRAK_PROXY_URL = 'https://celestrak-proxy.imudak.workers.dev';
process.env.TEST_BATCH_SIZE = '10';
process.env.TEST_RATE_LIMIT = '30';

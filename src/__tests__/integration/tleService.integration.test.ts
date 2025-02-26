import { tleService } from '../../services/tleService';
import { TEST_NORAD_ID, TEST_RATE_LIMIT } from './constants';

describe('tleService Integration Tests', () => {
  // コンソール出力の一時的な設定
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleDebug = console.debug;

  beforeAll(() => {
    // デバッグ情報を表示
    console.log = (...args) => originalConsoleLog('Test Log:', ...args);
    console.error = (...args) => originalConsoleError('Test Error:', ...args);
    console.debug = (...args) => originalConsoleDebug('Test Debug:', ...args);
  });

  afterAll(() => {
    // コンソール出力を元に戻す
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.debug = originalConsoleDebug;

    // 非同期処理の完了を待機
    return new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('TLEデータの取得と検証', () => {
    it('CelesTrakプロキシから実際のデータを取得できる', async () => {
      // APIリクエストの実行
      console.log('Fetching TLE data for ISS...');
      const result = await tleService.getTLE(TEST_NORAD_ID);
      console.log('Received TLE data:', result);

      // レスポンスの構造を検証
      expect(result).toHaveProperty('line1');
      expect(result).toHaveProperty('line2');
      expect(result).toHaveProperty('timestamp');

      // TLE行1の形式を検証
      expect(result.line1).toMatch(/^1 [\d]{5}[A-Z]/); // NORADカタログ番号
      expect(result.line1).toMatch(/U/); // 分類（U=非機密）
      expect(result.line1).toMatch(/[\d]{8}/); // エポック年と通算日

      // TLE行2の形式を検証
      expect(result.line2).toMatch(/^2 [\d]{5}/); // NORADカタログ番号
      expect(result.line2).toMatch(/[\d]{5}$/); // 軌道周回番号

      // タイムスタンプの検証
      const timestamp = new Date(result.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());

      // 非同期処理の完了を待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }, 35000);

    it('APIレスポンスがTLE形式に正しく変換される', async () => {
      const result = await tleService.getTLE(TEST_NORAD_ID);

      // チェックサムの検証
      const line1Checksum = parseInt(result.line1.slice(-1));
      const line2Checksum = parseInt(result.line2.slice(-1));
      expect(typeof line1Checksum).toBe('number');
      expect(typeof line2Checksum).toBe('number');
      expect(line1Checksum).toBeGreaterThanOrEqual(0);
      expect(line1Checksum).toBeLessThanOrEqual(9);
      expect(line2Checksum).toBeGreaterThanOrEqual(0);
      expect(line2Checksum).toBeLessThanOrEqual(9);
    }, 35000);
  });

  describe('レート制限の機能検証', () => {
    it('複数回のリクエストでレート制限が機能する', async () => {
      // 2リクエスト/秒の制限で4リクエストを実行
      const requestCount = 4;
      const results = [];
      const timings = [];
      const startTimeMsec = Date.now();

      // リクエストを逐次実行し、タイミングを記録
      for (let i = 0; i < requestCount; i++) {
        const requestStartMsec = Date.now();
        const result = await tleService.getTLE(TEST_NORAD_ID);
        const requestEndMsec = Date.now();

        results.push(result);
        timings.push({
          index: i,
          durationMsec: requestEndMsec - requestStartMsec,
          timeSinceStartMsec: requestEndMsec - startTimeMsec
        });

        console.log(`Request ${i + 1}/${requestCount} completed in ${requestEndMsec - requestStartMsec}ms`);
      }

      const endTimeMsec = Date.now();
      const totalTimeMsec = endTimeMsec - startTimeMsec;

      console.log('Request timings:', timings);
      console.log(`All requests completed in ${totalTimeMsec}ms`);

      // すべてのリクエストが成功していることを確認
      results.forEach((result, index) => {
        expect(result).toHaveProperty('line1');
        expect(result).toHaveProperty('line2');
        console.log(`Request ${index + 1} succeeded:`, {
          hasLine1: !!result.line1,
          hasLine2: !!result.line2
        });
      });

      // レート制限による遅延を確認
      // 2リクエスト/秒の制限で4リクエストの場合、最低でも1.5秒（1500ms）かかるはず
      const expectedMinTimeMsec = 1500; // 1.5秒
      expect(totalTimeMsec).toBeGreaterThan(expectedMinTimeMsec);

      // 連続するリクエスト間の間隔を確認
      for (let i = 1; i < timings.length; i++) {
        const intervalMsec = timings[i].timeSinceStartMsec - timings[i-1].timeSinceStartMsec;
        // 2リクエストごとに最低500msの間隔があることを確認
        if (i % 2 === 0) {
          expect(intervalMsec).toBeGreaterThan(500);
        }
      }
    }, 35000);
  });
});

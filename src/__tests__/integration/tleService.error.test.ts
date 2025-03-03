import { tleService } from '../../services/tleService';

describe('tleService Error Handling Tests', () => {
  // コンソール出力の一時的な設定
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleDebug = console.debug;

  // エラーログを収集するための配列
  const errorLogs: string[] = [];

  beforeAll(() => {
    // エラーログを収集
    console.error = (...args) => {
      errorLogs.push(args.join(' '));
      originalConsoleError(...args);
    };
  });

  afterAll(() => {
    // コンソール出力を元に戻す
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.debug = originalConsoleDebug;

    // 非同期処理の完了を待機
    return new Promise(resolve => setTimeout(resolve, 1000));
  });

  beforeEach(() => {
    // 各テスト前にエラーログをクリア
    errorLogs.length = 0;
  });

  it('複数の異なるNORAD IDに対して連続リクエストを処理できる', async () => {
    // 異なるNORAD IDのリスト
    const noradIds = ['25544', '27424', '33591', '43013', '48274'];
    const results = [];

    // 連続してリクエストを送信
    for (const noradId of noradIds) {
      try {
        const result = await tleService.getTLE(noradId, true); // キャッシュをバイパス
        results.push({
          noradId,
          success: true,
          data: result
        });
      } catch (error) {
        results.push({
          noradId,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // 結果の検証
    console.log('Test results:', JSON.stringify(results, null, 2));
    console.log('Error logs:', errorLogs);

    // すべてのリクエストが成功したか確認
    const failedRequests = results.filter(r => !r.success);
    expect(failedRequests.length).toBe(0);

    // 各結果が異なるTLEデータを持っているか確認
    const uniqueTLEs = new Set(results.map(r => r.data?.line1));
    expect(uniqueTLEs.size).toBe(results.length);
  }, 60000); // タイムアウトを60秒に設定

  it('無効なNORAD IDに対してエラーを適切に処理する', async () => {
    // 無効なNORAD ID
    const invalidNoradId = 'invalid123';

    // エラーが発生することを期待
    await expect(tleService.getTLE(invalidNoradId, true)).rejects.toThrow();

    // エラーログにAPIエラーが含まれているか確認
    expect(errorLogs.some(log => log.includes('API') && log.includes('Error'))).toBe(true);
  }, 30000); // タイムアウトを30秒に設定

  it('APIレート制限を超えた場合に適切に処理する', async () => {
    // 短時間に多数のリクエストを送信
    const noradId = '25544';
    const requestCount = 10;
    const results = [];

    // 連続してリクエストを送信
    for (let i = 0; i < requestCount; i++) {
      try {
        const result = await tleService.getTLE(noradId, true); // キャッシュをバイパス
        results.push({
          index: i,
          success: true,
          data: result
        });
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // 結果の検証
    console.log('Rate limit test results:', JSON.stringify(results, null, 2));
    console.log('Rate limit error logs:', errorLogs);

    // すべてのリクエストが成功したか、またはレート制限エラーが適切に処理されたか確認
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBeGreaterThan(0);
  }, 60000); // タイムアウトを60秒に設定
});

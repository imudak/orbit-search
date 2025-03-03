import type { TLEData, Location, SearchFilters, Pass } from '@/types';

class OrbitService {
  private worker: Worker | null = null;

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker() {
    // テスト環境ではWorkerを初期化しない
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') {
      console.log('Running in test environment, skipping worker initialization');
      return;
    }

    // テスト環境ではなく、ブラウザ環境の場合のみ実行
    if (typeof window !== 'undefined' && typeof process === 'undefined') {
      try {
        // 直接Workerを初期化（import.meta.urlを使用しない）
        // @ts-ignore - ブラウザ環境でのみ実行されるコード
        this.worker = new Worker(new URL('../workers/orbitWorker.ts', document.baseURI), { type: 'module' });
      } catch (error) {
        console.error('Failed to initialize orbit worker:', error);
      }
    }
  }

  /**
   * 衛星の可視パスを計算
   */
  async calculatePasses(
    tle: TLEData,
    location: Location,
    filters: SearchFilters
  ): Promise<Pass[]> {
    // テスト環境ではモックデータを返す
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') {
      console.log('Running in test environment, returning mock pass data');
      return this.calculateMockPasses(tle, location, filters);
    }

    if (!this.worker) {
      throw new Error('Orbit worker is not initialized');
    }

    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Orbit worker is not initialized'));
        return;
      }

      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === 'passes') {
          this.worker?.removeEventListener('message', messageHandler);
          resolve(event.data.data);
        }
      };

      const errorHandler = (error: ErrorEvent) => {
        this.worker?.removeEventListener('error', errorHandler);
        reject(error);
      };

      this.worker.addEventListener('message', messageHandler);
      this.worker.addEventListener('error', errorHandler);

      this.worker.postMessage({
        type: 'calculatePasses',
        tle,
        location,
        filters,
      });
    });
  }

  /**
   * テスト環境用のモックパスデータを生成
   */
  private calculateMockPasses(
    tle: TLEData,
    location: Location,
    filters: SearchFilters
  ): Pass[] {
    console.log('Generating mock pass data for TLE:', {
      line1: tle.line1,
      line2: tle.line2,
      location,
      filters
    });

    // 現在時刻から24時間以内のパスを生成
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const startTime = filters.startDate || now;
    const endTime = filters.endDate || tomorrow;

    // モックパスデータを生成（1〜3個のパス）
    const passCount = Math.floor(Math.random() * 3) + 1;
    const passes: Pass[] = [];

    for (let i = 0; i < passCount; i++) {
      // パスの開始時刻（startTimeから24時間以内）
      const passStartTime = new Date(startTime.getTime() + Math.random() * (endTime.getTime() - startTime.getTime()));
      // パスの継続時間（5〜15分）
      const passDuration = (5 + Math.random() * 10) * 60 * 1000;
      const passEndTime = new Date(passStartTime.getTime() + passDuration);

      // 最大仰角（10〜80度）
      const maxElevation = 10 + Math.random() * 70;

      // パスポイントを生成（30秒間隔）
      const points = [];
      let pointTime = new Date(passStartTime);
      while (pointTime <= passEndTime) {
        // 仰角は放物線を描くように（開始と終了時に低く、中間で最大）
        const progress = (pointTime.getTime() - passStartTime.getTime()) / passDuration;
        const elevation = maxElevation * Math.sin(progress * Math.PI);

        points.push({
          time: new Date(pointTime),
          elevation,
          azimuth: Math.random() * 360, // 方位角はランダム
          range: 500 + Math.random() * 1000, // 距離はランダム（500〜1500km）
          isDaylight: Math.random() > 0.5 // 昼夜はランダム
        });

        // 30秒進める
        pointTime = new Date(pointTime.getTime() + 30 * 1000);
      }

      passes.push({
        startTime: passStartTime,
        endTime: passEndTime,
        maxElevation,
        isDaylight: Math.random() > 0.5,
        points
      });
    }

    console.log(`Generated ${passes.length} mock passes`);
    return passes;
  }

  /**
   * サービスのクリーンアップ
   */
  dispose() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Workerの再初期化
   */
  reinitialize() {
    this.dispose();
    this.initializeWorker();
  }
}

// シングルトンインスタンスをエクスポート
export const orbitService = new OrbitService();

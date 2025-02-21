import type { TLEData, Location, SearchFilters, Pass } from '@/types';

class OrbitService {
  private worker: Worker | null = null;

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker() {
    try {
      this.worker = new Worker(
        new URL('../workers/orbitWorker.ts', import.meta.url),
        { type: 'module' }
      );
    } catch (error) {
      console.error('Failed to initialize orbit worker:', error);
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

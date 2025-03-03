import axios from 'axios';

// 環境変数からAPIのURLを取得
// デフォルトのAPIエンドポイント
const DEFAULT_API_URL = 'https://celestrak-proxy.imudak.workers.dev';

// 環境変数の取得を試みる
let CELESTRAK_API_BASE_URL = DEFAULT_API_URL;

// ブラウザ環境（Vite）
try {
  // @ts-ignore - import.meta.envはTypeScriptの型定義に含まれていない場合がある
  if (typeof window !== 'undefined' && window.__VITE_ENV__ && window.__VITE_ENV__.VITE_CELESTRAK_API_BASE_URL) {
    // @ts-ignore
    CELESTRAK_API_BASE_URL = window.__VITE_ENV__.VITE_CELESTRAK_API_BASE_URL;
  }
} catch (e) {
  // ブラウザ環境でない場合は無視
}

// Node.js環境（Jest）
if (typeof process !== 'undefined' && process.env && process.env.VITE_CELESTRAK_API_BASE_URL) {
  CELESTRAK_API_BASE_URL = process.env.VITE_CELESTRAK_API_BASE_URL;
}

// baseURLはAPIのベースURLのみを設定し、エンドポイントは各リクエストで指定する
const CELESTRAK_API_ENDPOINT = CELESTRAK_API_BASE_URL;

// API設定
const API_CONFIG = {
  TIMEOUT: {
    DEFAULT_MSEC: 10000,    // 10秒（ミリ秒単位）
    CELESTRAK_MSEC: 30000   // 30秒（ミリ秒単位）
  },
  RETRY: {
    MAX_RETRIES: 3,
    DELAY_MSEC: 1000, // 1秒（ミリ秒単位）
    METHODS: ['get'] as const
  },
  CELESTRAK: {
    BASE_URL: CELESTRAK_API_ENDPOINT,
    DEFAULT_FORMAT: 'json'
  },
  RATE_LIMIT: {
    REQUESTS_PER_SEC: 2,      // 1秒あたりの最大リクエスト数
    INTERVAL_MSEC: 1000,      // レート制限の間隔（ミリ秒単位、1秒）
    MIN_DELAY_MSEC: 500       // リクエスト間の最小待機時間（ミリ秒単位、0.5秒）
  }
} as const;

console.log('Using CelesTrak API URL:', API_CONFIG.CELESTRAK.BASE_URL);

// レート制限の状態管理
class RateLimiter {
  private lastRequestTimeMsec: number;
  private requestCount: number;
  private waitQueuePromise: Promise<void>;

  constructor() {
    this.lastRequestTimeMsec = 0;
    this.requestCount = 0;
    this.waitQueuePromise = Promise.resolve();
  }

  async waitForNextSlot(): Promise<void> {
    // 既存のキューに追加してシリアル化
    return new Promise<void>((resolve) => {
      this.waitQueuePromise = this.waitQueuePromise.then(async () => {
        const nowMsec = Date.now();
        const elapsedMsec = nowMsec - this.lastRequestTimeMsec;

        // インターバルが経過していれば、カウントをリセット
        if (elapsedMsec >= API_CONFIG.RATE_LIMIT.INTERVAL_MSEC) {
          this.requestCount = 0;
          this.lastRequestTimeMsec = nowMsec;
        }

        // 最小待機時間を確保
        const minDelayMsec = Math.max(0, API_CONFIG.RATE_LIMIT.MIN_DELAY_MSEC - elapsedMsec);
        if (minDelayMsec > 0) {
          await new Promise(wait => setTimeout(wait, minDelayMsec));
        }

        // リクエスト数が制限に達している場合は待機
        if (this.requestCount >= API_CONFIG.RATE_LIMIT.REQUESTS_PER_SEC) {
          const waitMsec = API_CONFIG.RATE_LIMIT.INTERVAL_MSEC - (Date.now() - this.lastRequestTimeMsec);
          if (waitMsec > 0) {
            await new Promise(wait => setTimeout(wait, waitMsec));
          }
          this.requestCount = 0;
          this.lastRequestTimeMsec = Date.now();
        }

        this.requestCount++;
        this.lastRequestTimeMsec = Date.now();
        resolve();
      });
    });
  }
}

const rateLimiter = new RateLimiter();

// CelesTrak APIクライアントの設定
const celestrakApi = axios.create({
  baseURL: API_CONFIG.CELESTRAK.BASE_URL,
  headers: {
    'Accept': 'application/json'
  },
  timeout: API_CONFIG.TIMEOUT.CELESTRAK_MSEC,
  params: {
    FORMAT: API_CONFIG.CELESTRAK.DEFAULT_FORMAT
  }
});

// リクエストインターセプター
celestrakApi.interceptors.request.use(
  async (config: any) => {
    await rateLimiter.waitForNextSlot();
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター
celestrakApi.interceptors.response.use(
  (response: any) => {
    return response;
  },
  async (error: any) => {
    if (error.config) {
      const retryCount = error.config.retryCount || 0;

      if (retryCount < API_CONFIG.RETRY.MAX_RETRIES && (
        !error.response || error.response.status >= 500 || error.response.status === 429
      )) {
        error.config.retryCount = retryCount + 1;
        const delayMsec = API_CONFIG.RETRY.DELAY_MSEC * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delayMsec));

        return celestrakApi(error.config);
      }
    }

    return Promise.reject(error);
  }
);

export { celestrakApi };

import axios from 'axios';

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
    BASE_URL: 'https://celestrak-proxy.imudak.workers.dev/NORAD/elements/gp.php',
    DEFAULT_FORMAT: 'json'
  },
  RATE_LIMIT: {
    REQUESTS_PER_SEC: 2,      // 1秒あたりの最大リクエスト数
    INTERVAL_MSEC: 1000,      // レート制限の間隔（ミリ秒単位、1秒）
    MIN_DELAY_MSEC: 500       // リクエスト間の最小待機時間（ミリ秒単位、0.5秒）
  }
} as const;

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
          console.log(`Rate limit: Resetting count after ${elapsedMsec}ms`);
          this.requestCount = 0;
          this.lastRequestTimeMsec = nowMsec;
        }

        // 最小待機時間を確保
        const minDelayMsec = Math.max(0, API_CONFIG.RATE_LIMIT.MIN_DELAY_MSEC - elapsedMsec);
        if (minDelayMsec > 0) {
          console.log(`Rate limit: Enforcing minimum delay of ${minDelayMsec}ms`);
          await new Promise(wait => setTimeout(wait, minDelayMsec));
        }

        // リクエスト数が制限に達している場合は待機
        if (this.requestCount >= API_CONFIG.RATE_LIMIT.REQUESTS_PER_SEC) {
          const waitMsec = API_CONFIG.RATE_LIMIT.INTERVAL_MSEC - (Date.now() - this.lastRequestTimeMsec);
          if (waitMsec > 0) {
            console.log(`Rate limit: Waiting ${waitMsec}ms for next interval`);
            await new Promise(wait => setTimeout(wait, waitMsec));
          }
          this.requestCount = 0;
          this.lastRequestTimeMsec = Date.now();
        }

        this.requestCount++;
        this.lastRequestTimeMsec = Date.now();
        console.log(`Rate limit: Request ${this.requestCount} at ${this.lastRequestTimeMsec}`);
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
    const startTimeMsec = Date.now();
    await rateLimiter.waitForNextSlot();
    const waitTimeMsec = Date.now() - startTimeMsec;

    console.log(`Rate limiting: waited ${waitTimeMsec}ms before sending request`);
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`,
      config.params ? `with params: ${JSON.stringify(config.params)}` : '');
    return config;
  },
  (error: any) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// レスポンスインターセプター
celestrakApi.interceptors.response.use(
  (response: any) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error: any) => {
    console.error('API Error:', error);

    if (error.config) {
      const retryCount = error.config.retryCount || 0;

      if (retryCount < API_CONFIG.RETRY.MAX_RETRIES && (
        !error.response || error.response.status >= 500 || error.response.status === 429
      )) {
        error.config.retryCount = retryCount + 1;
        const delayMsec = API_CONFIG.RETRY.DELAY_MSEC * Math.pow(2, retryCount);

        console.log(`Retrying request (${error.config.retryCount}/${API_CONFIG.RETRY.MAX_RETRIES}) after ${delayMsec}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMsec));

        return celestrakApi(error.config);
      }
    }

    return Promise.reject(error);
  }
);

export { celestrakApi };

import axios from 'axios';

interface ApiError {
  status?: number;
  data?: unknown;
  message?: string;
  code?: string;
  url?: string;
}

// API設定
const API_CONFIG = {
  TIMEOUT: {
    DEFAULT: 10000,    // 10秒
    CELESTRAK: 30000   // 30秒
  },
  RETRY: {
    MAX_RETRIES: 3,
    DELAY: 1000, // 初期遅延（ミリ秒）
    METHODS: ['get'] as const
  },
  CELESTRAK: {
    BASE_URL: 'https://celestrak.org',  // .comから.orgに変更
    DEFAULT_FORMAT: 'json'
  }
} as const;

/**
 * 指数バックオフ遅延を計算
 */
const calculateDelay = (retryCount: number): number => {
  return Math.min(
    API_CONFIG.RETRY.DELAY * Math.pow(2, retryCount),
    10000 // 最大10秒
  );
};

/**
 * リトライ可能なエラーかどうかを判定
 */
const isRetryableError = (error: any): boolean => {
  if (!error.isAxiosError) return false;

  // ネットワークエラー
  if (error.code === 'ECONNABORTED' || !error.response) return true;

  // 特定のステータスコードの場合
  const status = error.response.status;
  return status >= 500 || status === 429;
};

/**
 * 共通APIクライアントの設定
 */
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: API_CONFIG.TIMEOUT.DEFAULT
});

/**
 * CelesTrak APIクライアントの設定
 */
const celestrakApi = axios.create({
  baseURL: '/celestrak',
  headers: {
    'Accept': 'text/plain, application/json'
  },
  timeout: API_CONFIG.TIMEOUT.CELESTRAK
});

/**
 * エラー情報の抽出
 */
const extractErrorInfo = (error: any): ApiError => {
  if (error.isAxiosError) {
    if (error.response) {
      return {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      };
    }
    if (error.request) {
      return {
        message: error.message,
        code: error.code,
        url: error.config?.url
      };
    }
  }

  return {
    message: String(error)
  };
};

// レスポンスインターセプター
const setupInterceptors = (instance: ReturnType<typeof axios.create>) => {
  // リクエストインターセプター
  instance.interceptors.request.use(
    config => {
      // リクエストログ
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`,
        config.params ? `with params: ${JSON.stringify(config.params)}` : '');
      return config;
    },
    error => {
      const errorInfo = extractErrorInfo(error);
      console.error('API Request Error:', errorInfo);
      return Promise.reject(error);
    }
  );

  // レスポンスインターセプター
  instance.interceptors.response.use(
    response => {
      // レスポンスログ
      console.log(`API Response: ${response.status} ${response.config.url}`, {
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length'],
        dataType: typeof response.data
      });

      // レスポンスデータの詳細ログ
      if (response.data) {
        if (typeof response.data === 'string') {
          console.log('Text response first 200 chars:', response.data.substring(0, 200));
        } else if (Array.isArray(response.data)) {
          console.log('Array response:', {
            length: response.data.length,
            sample: response.data.slice(0, 2)
          });
        } else {
          console.log('Response data:', response.data);
        }
      }
      return response;
    },
    async error => {
      const errorInfo = extractErrorInfo(error);
      console.error('API Error:', errorInfo);

      // リトライ処理
      const config = error.config;
      if (!config) return Promise.reject(error);

      // リトライカウントの初期化
      config.retryCount = config.retryCount || 0;

      if (config.retryCount < API_CONFIG.RETRY.MAX_RETRIES && isRetryableError(error)) {
        config.retryCount += 1;
        const delay = calculateDelay(config.retryCount);

        console.log(`Retrying request (${config.retryCount}/${API_CONFIG.RETRY.MAX_RETRIES}) after ${delay}ms...`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return instance(config);
      }

      return Promise.reject(error);
    }
  );
};

setupInterceptors(api);
setupInterceptors(celestrakApi);

export { api, celestrakApi };

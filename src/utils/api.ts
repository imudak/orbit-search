import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const axiosRetry = require('axios-retry');

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
    METHODS: ['get']
  }
} as const;

/**
 * 共通APIクライアントの設定
 */
const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: API_CONFIG.TIMEOUT.DEFAULT
});

/**
 * CelesTrak APIクライアントの設定
 */
const celestrakApi = axios.create({
  // https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json
  baseURL: 'https://celestrak.org',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: API_CONFIG.TIMEOUT.CELESTRAK
});

// リトライ設定
axiosRetry(celestrakApi, {
  retries: API_CONFIG.RETRY.MAX_RETRIES,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error: unknown) => {
    // ネットワークエラーまたはタイムアウトの場合にリトライ
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error as { code?: string }).code === 'ECONNABORTED'
    );
  },
  retryableHTTPMethods: API_CONFIG.RETRY.METHODS
});

/**
 * エラー情報の抽出
 */
const extractErrorInfo = (error: unknown): ApiError => {
  const axiosError = error as { response?: any; request?: any; config?: any; message?: string; code?: string };

  if (axiosError.response) {
    return {
      status: axiosError.response.status,
      data: axiosError.response.data,
      url: axiosError.config?.url
    };
  }

  if (axiosError.request) {
    return {
      message: axiosError.message,
      code: axiosError.code,
      url: axiosError.config?.url
    };
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
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
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
      console.log(`API Response: ${response.status} ${response.config.url}`);
      return response;
    },
    error => {
      const errorInfo = extractErrorInfo(error);
      console.error('API Error:', errorInfo);
      return Promise.reject(error);
    }
  );
};

setupInterceptors(api);
setupInterceptors(celestrakApi);

export { api, celestrakApi };

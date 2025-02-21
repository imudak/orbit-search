import axios from 'axios';

/**
 * 共通APIクライアントの設定
 */
const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * CelesTrak APIクライアントの設定
 */
const celestrakApi = axios.create({
  baseURL: import.meta.env.VITE_CELESTRAK_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// レスポンスインターセプター
const setupInterceptors = (instance: typeof api) => {
  instance.interceptors.response.use(
    response => response,
    error => {
      if (error.response) {
        console.error('API Error:', {
          status: error.response.status,
          data: error.response.data
        });
      } else if (error.request) {
        console.error('API Request Error:', error.request);
      } else {
        console.error('API Error:', error.message);
      }
      return Promise.reject(error);
    }
  );
};

setupInterceptors(api);
setupInterceptors(celestrakApi);

export { api, celestrakApi };

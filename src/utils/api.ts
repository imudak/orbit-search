import axios from 'axios';

/**
 * APIクライアントの設定
 * ベースURLや共通のヘッダー、インターセプターなどを設定します
 */
const api = axios.create({
  // TODO: 環境変数から取得するように変更
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// レスポンスインターセプター
api.interceptors.response.use(
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

export { api };

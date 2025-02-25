const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// CORSを有効化
app.use(cors());

// プロキシミドルウェアの設定
const proxyOptions = {
  target: 'https://celestrak.org',
  changeOrigin: true,
  pathRewrite: {
    '^/proxy': ''
  },
  onProxyRes: (proxyRes, req, res) => {
    // レスポンスヘッダーの設定
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
  },
  onError: (err, req, res) => {
    console.error('Proxy Error:', err);
    res.status(500).send('Proxy Error');
  }
};

// プロキシルートの設定
app.use('/proxy', createProxyMiddleware(proxyOptions));

// サーバー起動
app.listen(port, () => {
  console.log(`Proxy server is running on port ${port}`);
});

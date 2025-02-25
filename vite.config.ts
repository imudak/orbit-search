import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname);

// GitHub リポジトリ名を取得（環境変数または package.json から）
const getBasePath = () => {
  // GitHub Pagesデプロイ時のベースパス
  if (process.env.GITHUB_REPOSITORY) {
    // owner/repo-name の形式から repo-name を取得
    const repoName = process.env.GITHUB_REPOSITORY.split('/')[1];
    return `/${repoName}/`;
  }
  // ローカル開発時は / を使用
  return '/';
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  root,
  base: getBasePath(),
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/celestrak': {
        // Cloudflare Workersのエンドポイントに置き換えてください
        target: 'https://celestrak-proxy.imudak.workers.dev',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/celestrak/, '/proxy'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxy request:', req.method, req.url);
            // 文字エンコーディングを指定
            proxyReq.setHeader('Accept-Charset', 'utf-8');
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Proxy response:', {
              statusCode: proxyRes.statusCode,
              url: req.url,
              contentType: proxyRes.headers['content-type'],
              contentLength: proxyRes.headers['content-length']
            });

            // テキストレスポンスの場合、エンコーディングを処理
            if (proxyRes.headers['content-type']?.includes('text/plain')) {
              const chunks: Buffer[] = [];
              proxyRes.on('data', chunk => chunks.push(Buffer.from(chunk)));
              proxyRes.on('end', () => {
                const buffer = Buffer.concat(chunks);
                try {
                  // UTF-8でデコード試行
                  const utf8Text = buffer.toString('utf-8');
                  console.log('Response preview (UTF-8):', utf8Text.substring(0, 200));
                } catch (e) {
                  // 失敗した場合はLatin1でデコード
                  const latin1Text = buffer.toString('latin1');
                  console.log('Response preview (Latin1):', latin1Text.substring(0, 200));
                }
              });
            }
          });
        }
      }
    }
  },
  build: {
    sourcemap: true,
    outDir: path.resolve(root, 'dist'),
    // チャンクサイズの最適化
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': [
            'react',
            'react-dom',
            'react-router-dom',
            '@mui/material',
            '@emotion/react',
            '@emotion/styled'
          ],
          'map': ['leaflet'],
          'satellite': ['satellite.js']
        }
      }
    }
  },
  // 環境変数の型定義
  define: {
    // バージョン情報
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version),
  }
});

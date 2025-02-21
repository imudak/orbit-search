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

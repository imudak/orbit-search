import { createTheme } from '@mui/material/styles';

// アクセシビリティを向上させたテーマ
export const theme = createTheme({
  palette: {
    primary: {
      // コントラスト比を向上させるために、より暗い色を使用
      light: '#4791db',
      main: '#1565c0', // より暗い青色（コントラスト比向上）
      dark: '#0d47a1',
      contrastText: '#ffffff',
    },
    secondary: {
      light: '#e33371',
      main: '#c2185b', // より暗い赤色（コントラスト比向上）
      dark: '#8c0032',
      contrastText: '#ffffff',
    },
    error: {
      main: '#c62828', // より暗い赤色（コントラスト比向上）
    },
    warning: {
      main: '#e65100', // より暗いオレンジ色（コントラスト比向上）
    },
    info: {
      main: '#0277bd', // より暗い青色（コントラスト比向上）
    },
    success: {
      main: '#2e7d32', // より暗い緑色（コントラスト比向上）
    },
    text: {
      primary: '#212121', // より暗いテキスト色（コントラスト比向上）
      secondary: '#424242', // より暗い二次テキスト色（コントラスト比向上）
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    // フォントサイズを増加（最小16px）
    fontSize: 16,
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    // 行間を1.5倍に設定
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    h1: {
      fontSize: '2.5rem',
      lineHeight: 1.3,
    },
    h2: {
      fontSize: '2rem',
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      lineHeight: 1.3,
    },
    h5: {
      fontSize: '1.25rem',
      lineHeight: 1.3,
    },
    h6: {
      fontSize: '1rem',
      lineHeight: 1.3,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          height: '100vh',
          margin: 0,
        },
        '#root': {
          height: '100%',
        },
      },
    },
    // フォーカス状態の視覚的表示を強化
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': {
            outline: '2px solid #1976d2',
            outlineOffset: '2px',
          },
        },
      },
    },
    // タッチターゲットサイズを拡大
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: '12px', // パディング増加
        },
        sizeSmall: {
          padding: '8px', // 小サイズでもパディング増加
        },
      },
    },
    // コントラスト比を向上
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: '8px', // 高さ増加
          borderRadius: '4px',
        },
      },
    },
    // タブのアクセシビリティ向上
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: '48px', // 高さ増加
          '&.Mui-focusVisible': {
            outline: '2px solid #1976d2',
            outlineOffset: '2px',
          },
        },
      },
    },
  },
});

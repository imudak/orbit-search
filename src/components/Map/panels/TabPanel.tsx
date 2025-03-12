import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Tabs, Tab, Typography, Paper, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import InfoIcon from '@mui/icons-material/Info';
import TimelineIcon from '@mui/icons-material/Timeline';

// タブパネルのコンテナ
const TabPanelContainer = styled(Paper)(({ theme }) => ({
  backgroundColor: 'white',
  borderRadius: '8px',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  [theme.breakpoints.down('sm')]: {
    borderRadius: '0',
  },
}));

// タブのスタイル - コントラスト比を向上
const StyledTabs = styled(Tabs)(({ theme }) => ({
  borderBottom: '1px solid rgba(0, 0, 0, 0.2)',
  '& .MuiTabs-indicator': {
    backgroundColor: theme.palette.primary.dark, // より暗い色でコントラスト向上
    height: '4px', // より太く視認性向上
  },
}));

// タブのスタイル - アクセシビリティ向上
const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: 'none',
  minWidth: 72,
  fontWeight: theme.typography.fontWeightRegular,
  fontSize: '1rem', // 16pxに増加
  padding: '12px 16px',
  lineHeight: 1.5, // 行間を1.5倍に設定
  '&.Mui-selected': {
    color: theme.palette.primary.dark, // より暗い色でコントラスト向上
    fontWeight: theme.typography.fontWeightMedium,
  },
  '&.Mui-focusVisible': {
    backgroundColor: 'rgba(0, 0, 0, 0.12)', // フォーカス状態を明確に
    outline: '2px solid #1976d2', // フォーカスアウトラインを追加
  },
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)', // ホバー状態を明確に
  },
}));

// タブパネルの内容
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanelContent = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      style={{ height: '100%', overflow: 'auto' }}
      tabIndex={value === index ? 0 : -1} // アクティブな場合のみフォーカス可能
      {...other}
    >
      {value === index && (
        <Box sx={{ height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// タブパネルのプロパティ
interface TabPanelComponentProps {
  searchTab?: React.ReactNode;
  satelliteInfoTab?: React.ReactNode;
  orbitTab?: React.ReactNode;
  initialTab?: number;
}

/**
 * タブ方式のパネルコンポーネント
 * 検索、衛星情報、軌道の3つのタブを持つ
 * アクセシビリティ対応済み
 */
const TabPanel: React.FC<TabPanelComponentProps> = ({
  searchTab,
  satelliteInfoTab,
  orbitTab,
  initialTab = 0,
}) => {
  const [value, setValue] = useState(initialTab);
  const tabsRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  const handleChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  }, []);

  // キーボードショートカット処理
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Alt + 1-3 でタブ切り替え
    if (event.altKey && event.key >= '1' && event.key <= '3') {
      const tabIndex = parseInt(event.key) - 1;
      if (tabIndex >= 0 && tabIndex <= 2) {
        setValue(tabIndex);
        event.preventDefault();
      }
    }
  }, []);

  // キーボードイベントリスナーの設定
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // タブラベルとアイコンの組み合わせ
  const tabLabels = [
    { label: '検索', icon: <SearchIcon />, ariaLabel: '衛星検索タブ' },
    { label: '衛星情報', icon: <InfoIcon />, ariaLabel: '衛星情報タブ' },
    { label: '軌道', icon: <TimelineIcon />, ariaLabel: '軌道制御タブ' },
  ];

  // プレースホルダーコンテンツ
  const placeholderContent = [
    '衛星を検索するためのフォームがここに表示されます。キーワードや軌道パラメータで検索できます。',
    '選択した衛星の詳細情報と分析結果がここに表示されます。軌道要素、運用状況、可視性分析などを確認できます。',
    '衛星軌道の表示設定や再生コントロールがここに表示されます。時間を進めて軌道の変化を確認できます。',
  ];

  return (
    <TabPanelContainer role="region" aria-label="衛星情報パネル">
      <StyledTabs
        value={value}
        onChange={handleChange}
        variant="fullWidth"
        aria-label="衛星情報タブ"
        ref={tabsRef}
      >
        {tabLabels.map((tab, index) => (
          <StyledTab
            key={`tab-${index}`}
            icon={tab.icon}
            label={tab.label}
            id={`tab-${index}`}
            aria-controls={`tabpanel-${index}`}
            aria-label={tab.ariaLabel}
            sx={{
              color: theme.palette.text.primary, // 高コントラスト
            }}
          />
        ))}
      </StyledTabs>

      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {[searchTab, satelliteInfoTab, orbitTab].map((tabContent, index) => (
          <TabPanelContent key={`panel-${index}`} value={value} index={index}>
            {tabContent || (
              <Box sx={{ p: 3, textAlign: 'center', maxWidth: '70ch', mx: 'auto' }}>
                <Typography
                  color="text.primary"
                  sx={{
                    fontSize: '1rem', // 16px
                    lineHeight: 1.5, // 行間1.5倍
                  }}
                >
                  {placeholderContent[index]}
                </Typography>
              </Box>
            )}
          </TabPanelContent>
        ))}
      </Box>
    </TabPanelContainer>
  );
};

export default TabPanel;

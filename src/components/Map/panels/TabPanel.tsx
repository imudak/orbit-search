import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import InfoIcon from '@mui/icons-material/Info';
import TimelineIcon from '@mui/icons-material/Timeline';
import AssessmentIcon from '@mui/icons-material/Assessment';

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

// タブのスタイル
const StyledTabs = styled(Tabs)(({ theme }) => ({
  borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
  '& .MuiTabs-indicator': {
    backgroundColor: theme.palette.primary.main,
    height: '3px',
  },
}));

// タブのスタイル
const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: 'none',
  minWidth: 72,
  fontWeight: theme.typography.fontWeightRegular,
  fontSize: '0.875rem',
  padding: '12px 16px',
  '&.Mui-selected': {
    color: theme.palette.primary.main,
    fontWeight: theme.typography.fontWeightMedium,
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
  infoTab?: React.ReactNode;
  orbitTab?: React.ReactNode;
  analysisTab?: React.ReactNode;
}

/**
 * タブ方式のパネルコンポーネント
 * 検索、情報、軌道、分析の4つのタブを持つ
 */
const TabPanel: React.FC<TabPanelComponentProps> = ({
  searchTab,
  infoTab,
  orbitTab,
  analysisTab,
}) => {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <TabPanelContainer>
      <StyledTabs
        value={value}
        onChange={handleChange}
        variant="fullWidth"
        aria-label="機能タブ"
      >
        <StyledTab
          icon={<SearchIcon />}
          label="検索"
          id="tab-0"
          aria-controls="tabpanel-0"
        />
        <StyledTab
          icon={<InfoIcon />}
          label="情報"
          id="tab-1"
          aria-controls="tabpanel-1"
        />
        <StyledTab
          icon={<TimelineIcon />}
          label="軌道"
          id="tab-2"
          aria-controls="tabpanel-2"
        />
        <StyledTab
          icon={<AssessmentIcon />}
          label="分析"
          id="tab-3"
          aria-controls="tabpanel-3"
        />
      </StyledTabs>

      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <TabPanelContent value={value} index={0}>
          {searchTab || (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">検索タブの内容がここに表示されます</Typography>
            </Box>
          )}
        </TabPanelContent>
        <TabPanelContent value={value} index={1}>
          {infoTab || (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">情報タブの内容がここに表示されます</Typography>
            </Box>
          )}
        </TabPanelContent>
        <TabPanelContent value={value} index={2}>
          {orbitTab || (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">軌道タブの内容がここに表示されます</Typography>
            </Box>
          )}
        </TabPanelContent>
        <TabPanelContent value={value} index={3}>
          {analysisTab || (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">分析タブの内容がここに表示されます</Typography>
            </Box>
          )}
        </TabPanelContent>
      </Box>
    </TabPanelContainer>
  );
};

export default TabPanel;

import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import {
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  Collapse,
  CircularProgress,
  Alert,
  Chip,
  Divider
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BarChartIcon from '@mui/icons-material/BarChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import type { OrbitPath } from '@/types';

// 遅延ロードするコンポーネント
const DetailedAnalysisTab = lazy(() => import('./analysis/DetailedAnalysisTab'));
const VisibilityAnalysisTab = lazy(() => import('./analysis/VisibilityAnalysisTab'));

interface AnalysisPanelProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright' | 'bottom';
  orbitPaths: OrbitPath[];
  isOpen?: boolean;
  onClose?: () => void;
}

// 分析タブの種類
enum AnalysisTab {
  SUMMARY = 'summary',
  DETAILS = 'details',
  VISIBILITY = 'visibility'
}

// 統計情報の型定義
interface PathStatistics {
  totalPoints: number;
  totalSegments: number;
  totalDistance: string;
  minElevation: string;
  maxElevation: string;
  avgElevation: string;
  maxElevationFromPath: string;
  visibleTime: number;
  totalTime: number;
  visibilityRate: string;
  distribution: {
    optimal: number;
    good: number;
    visible: number;
    poor: number;
  };
}

/**
 * 分析モード用のパネルコンポーネント
 * 衛星軌道の詳細な分析情報を表示
 * アクセシビリティとパフォーマンスを最適化
 */
const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  position = 'bottom',
  orbitPaths,
  isOpen = true,
  onClose
}) => {
  const [currentTab, setCurrentTab] = useState<AnalysisTab>(AnalysisTab.SUMMARY);
  const [showHelp, setShowHelp] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 初回表示時にヘルプを表示
  useEffect(() => {
    if (orbitPaths.length > 0) {
      setShowHelp(true);
      const timer = setTimeout(() => {
        setShowHelp(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [orbitPaths.length]);

  // キーボードショートカット処理
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Alt + 1-3 でタブ切り替え
    if (event.altKey && event.key >= '1' && event.key <= '3') {
      const tabIndex = parseInt(event.key) - 1;
      if (tabIndex === 0) setCurrentTab(AnalysisTab.SUMMARY);
      if (tabIndex === 1) setCurrentTab(AnalysisTab.DETAILS);
      if (tabIndex === 2) setCurrentTab(AnalysisTab.VISIBILITY);
      event.preventDefault();
    }
    // H キーでヘルプ表示切り替え
    else if (event.key === 'h' || event.key === 'H') {
      setShowHelp(prev => !prev);
      event.preventDefault();
    }
    // K キーでキーボードショートカット表示切り替え
    else if (event.key === 'k' || event.key === 'K') {
      setShowKeyboardShortcuts(prev => !prev);
      event.preventDefault();
    }
    // Esc キーでパネルを閉じる
    else if (event.key === 'Escape' && onClose) {
      onClose();
      event.preventDefault();
    }
  }, [onClose]);

  // キーボードイベントリスナーの設定
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // ポジションに応じたスタイルを設定
  const getPositionStyle = useCallback(() => {
    if (position === 'bottom') {
      return {
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 40px)',
        maxWidth: '800px'
      };
    }

    switch (position) {
      case 'topleft':
        return { top: '10px', left: '10px' };
      case 'topright':
        return { top: '10px', right: '10px' };
      case 'bottomleft':
        return { bottom: '10px', left: '10px' };
      case 'bottomright':
        return { bottom: '10px', right: '10px' };
      default:
        return { bottom: '10px', left: '10px' };
    }
  }, [position]);

  // 軌道パスがない場合の表示内容
  const renderEmptyContent = useCallback(() => (
    <Box sx={{
      position: 'absolute',
      ...getPositionStyle(),
      zIndex: 1000,
    }}>
      <Collapse in={isOpen}>
        <Paper
          sx={{
            padding: '16px', // パディング増加
            backgroundColor: 'rgba(76, 175, 80, 0.95)', // 背景色の不透明度を上げてコントラスト向上
            color: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(0, 100, 0, 0.2)', // ボーダーを濃くしてコントラスト向上
          }}
          role="region"
          aria-label="軌道分析パネル"
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AssessmentIcon sx={{ mr: 1, fontSize: '1.5rem' }} aria-hidden="true" />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                軌道分析モード
              </Typography>
            </Box>
            {onClose && (
              <IconButton
                size="medium"
                onClick={onClose}
                sx={{
                  color: 'white',
                  '&:focus': {
                    outline: '2px solid white',
                    outlineOffset: '2px'
                  },
                  minWidth: '44px', // タッチターゲットサイズ
                  minHeight: '44px', // タッチターゲットサイズ
                }}
                aria-label="分析パネルを閉じる"
              >
                <CloseIcon fontSize="medium" />
              </IconButton>
            )}
          </Box>
          <Typography variant="body1" sx={{ mt: 2, fontSize: '1rem', lineHeight: 1.5 }}>
            分析するための軌道データがありません。衛星を選択してください。
          </Typography>
          <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: '4px' }}>
            <Typography variant="body2" sx={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
              このモードでは、衛星の軌道を詳細に分析し、可視性や軌道特性を評価できます。
              衛星を選択すると、軌道の詳細な統計情報が表示されます。
            </Typography>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  ), [getPositionStyle, isOpen, onClose]);

  // 軌道パスがない場合
  if (orbitPaths.length === 0) {
    return renderEmptyContent();
  }

  // 軌道パスの統計情報を計算（メモ化して再計算を防止）
  const calculateStatistics = useCallback((path: OrbitPath): PathStatistics => {
    let totalPoints = 0;
    let totalDistance = 0;
    let minElevation = Infinity;
    let maxElevation = -Infinity;
    let elevationSum = 0;
    let elevationCount = 0;
    let visibleTime = 0; // 可視時間（分）
    let totalTime = 0; // 総時間（分）

    // 各セグメントのポイントを処理
    path.segments.forEach(segment => {
      totalPoints += segment.points.length;
      totalTime += segment.points.length; // 1ポイント = 1分と仮定

      // 各ポイントの実効的な角度を処理
      segment.effectiveAngles.forEach(angle => {
        minElevation = Math.min(minElevation, angle);
        maxElevation = Math.max(maxElevation, angle);
        elevationSum += angle;
        elevationCount++;

        // 可視時間を計算（仰角が10度以上）
        if (angle >= 10) {
          visibleTime++;
        }
      });

      // 各ポイント間の距離を計算（最適化：必要な場合のみ計算）
      if (segment.points.length > 1) {
        for (let i = 0; i < segment.points.length - 1; i += 2) { // 計算量削減のため2ポイントごとに計算
          const p1 = segment.points[i];
          const p2 = segment.points[i + 1 < segment.points.length ? i + 1 : i];

          // 球面上の2点間の距離を計算（ハーバーサイン公式）
          const R = 6371; // 地球の半径（km）
          const dLat = (p2.lat - p1.lat) * Math.PI / 180;
          const dLon = (p2.lng - p1.lng) * Math.PI / 180;
          const a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;

          totalDistance += distance;
        }
        // 2ポイントごとに計算したので、実際の距離の近似値として調整
        totalDistance = totalDistance * (segment.points.length / Math.ceil(segment.points.length / 2));
      }
    });

    // 平均仰角を計算
    const avgElevation = elevationCount > 0 ? elevationSum / elevationCount : 0;

    // 可視率を計算
    const visibilityRate = totalTime > 0 ? (visibleTime / totalTime) * 100 : 0;

    // 仰角分布を計算（最適化：一度のループで計算）
    const elevationDistribution = {
      optimal: 0, // 45度以上
      good: 0,    // 20-45度
      visible: 0, // 10-20度
      poor: 0     // 10度未満
    };

    path.segments.forEach(segment => {
      segment.effectiveAngles.forEach(angle => {
        if (angle >= 45) {
          elevationDistribution.optimal++;
        } else if (angle >= 20) {
          elevationDistribution.good++;
        } else if (angle >= 10) {
          elevationDistribution.visible++;
        } else {
          elevationDistribution.poor++;
        }
      });
    });

    // 分布の割合を計算
    const total = elevationCount || 1; // ゼロ除算を防ぐ
    const distribution = {
      optimal: (elevationDistribution.optimal / total) * 100,
      good: (elevationDistribution.good / total) * 100,
      visible: (elevationDistribution.visible / total) * 100,
      poor: (elevationDistribution.poor / total) * 100
    };

    return {
      totalPoints,
      totalSegments: path.segments.length,
      totalDistance: totalDistance.toFixed(2),
      minElevation: minElevation === Infinity ? '0' : minElevation.toFixed(2),
      maxElevation: maxElevation === -Infinity ? '0' : maxElevation.toFixed(2),
      avgElevation: avgElevation.toFixed(2),
      maxElevationFromPath: path.maxElevation.toFixed(2),
      visibleTime,
      totalTime,
      visibilityRate: visibilityRate.toFixed(1),
      distribution
    };
  }, []);

  // 可視性の分類
  const getVisibilityCategory = useCallback((elevation: number) => {
    if (elevation >= 45) {
      return { label: '最適', color: 'success' };
    } else if (elevation >= 20) {
      return { label: '良好', color: 'primary' };
    } else if (elevation >= 10) {
      return { label: '可視', color: 'warning' };
    } else {
      return { label: '不良', color: 'error' };
    }
  }, []);

  // 各軌道パスの統計情報をメモ化
  const pathStats = useMemo(() =>
    orbitPaths.map(calculateStatistics),
    [orbitPaths, calculateStatistics]
  );

  // タブ変更ハンドラー
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: AnalysisTab) => {
    setCurrentTab(newValue);
  }, []);

  // サマリータブの内容
  const renderSummaryTab = useCallback(() => {
    return (
      <Box sx={{ mt: 2 }} role="tabpanel" aria-labelledby="tab-summary">
        <Grid container spacing={2}>
          {orbitPaths.map((path, index) => {
            const stats = pathStats[index];
            const visibilityCategory = getVisibilityCategory(path.maxElevation);

            return (
              <Grid item xs={12} md={orbitPaths.length > 1 ? 6 : 12} key={path.satelliteId}>
                <Card
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', // 不透明度を上げてコントラスト向上
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '1rem', // 16px以上
                        color: theme.palette.text.primary, // コントラスト向上
                      }}
                    >
                      衛星ID: {path.satelliteId}
                      <Chip
                        label={`可視性: ${visibilityCategory.label}`}
                        color={visibilityCategory.color as any}
                        size="medium" // サイズ拡大
                        sx={{
                          ml: 1,
                          fontSize: '0.875rem', // フォントサイズ増加
                          height: '28px', // 高さ増加
                        }}
                      />
                    </Typography>

                    <Box sx={{ mt: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography
                            variant="body2"
                            color="text.primary"
                            sx={{ fontSize: '0.875rem', fontWeight: 'medium' }}
                          >
                            最大仰角
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{ fontSize: '1.25rem', color: theme.palette.text.primary }}
                          >
                            {stats.maxElevationFromPath}°
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography
                            variant="body2"
                            color="text.primary"
                            sx={{ fontSize: '0.875rem', fontWeight: 'medium' }}
                          >
                            平均仰角
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{ fontSize: '1.25rem', color: theme.palette.text.primary }}
                          >
                            {stats.avgElevation}°
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography
                            variant="body2"
                            color="text.primary"
                            sx={{ fontSize: '0.875rem', fontWeight: 'medium' }}
                          >
                            可視時間
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{ fontSize: '1.25rem', color: theme.palette.text.primary }}
                          >
                            {stats.visibleTime}分
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography
                            variant="body2"
                            color="text.primary"
                            sx={{ fontSize: '0.875rem', fontWeight: 'medium' }}
                          >
                            可視率
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{ fontSize: '1.25rem', color: theme.palette.text.primary }}
                          >
                            {stats.visibilityRate}%
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>

                    <Box sx={{ mt: 2 }}>
                      <Typography
                        variant="body2"
                        color="text.primary"
                        sx={{ fontSize: '0.875rem', fontWeight: 'medium' }}
                      >
                        仰角分布
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Tooltip title={`最適 (45°以上): ${stats.distribution.optimal.toFixed(1)}%`}>
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography
                                variant="body2"
                                sx={{ fontSize: '0.875rem', color: theme.palette.text.primary }}
                              >
                                最適
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ fontSize: '0.875rem', color: theme.palette.text.primary }}
                              >
                                {stats.distribution.optimal.toFixed(1)}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={stats.distribution.optimal}
                              sx={{
                                height: 12, // 高さ増加
                                borderRadius: 6,
                                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: 'success.main',
                                }
                              }}
                              aria-label={`最適仰角の割合: ${stats.distribution.optimal.toFixed(1)}%`}
                            />
                          </Box>
                        </Tooltip>
                        <Tooltip title={`良好 (20-45°): ${stats.distribution.good.toFixed(1)}%`}>
                          <Box sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography
                                variant="body2"
                                sx={{ fontSize: '0.875rem', color: theme.palette.text.primary }}
                              >
                                良好
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ fontSize: '0.875rem', color: theme.palette.text.primary }}
                              >
                                {stats.distribution.good.toFixed(1)}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={stats.distribution.good}
                              sx={{
                                height: 12, // 高さ増加
                                borderRadius: 6,
                                backgroundColor: 'rgba(25, 118, 210, 0.2)',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: 'primary.main',
                                }
                              }}
                              aria-label={`良好仰角の割合: ${stats.distribution.good.toFixed(1)}%`}
                            />
                          </Box>
                        </Tooltip>
                        <Tooltip title={`可視 (10-20°): ${stats.distribution.visible.toFixed(1)}%`}>
                          <Box sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography
                                variant="body2"
                                sx={{ fontSize: '0.875rem', color: theme.palette.text.primary }}
                              >
                                可視
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ fontSize: '0.875rem', color: theme.palette.text.primary }}
                              >
                                {stats.distribution.visible.toFixed(1)}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={stats.distribution.visible}
                              sx={{
                                height: 12, // 高さ増加
                                borderRadius: 6,
                                backgroundColor: 'rgba(255, 152, 0, 0.2)',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: 'warning.main',
                                }
                              }}
                              aria-label={`可視仰角の割合: ${stats.distribution.visible.toFixed(1)}%`}
                            />
                          </Box>
                        </Tooltip>
                        <Tooltip title={`不良 (10°未満): ${stats.distribution.poor.toFixed(1)}%`}>
                          <Box sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography
                                variant="body2"
                                sx={{ fontSize: '0.875rem', color: theme.palette.text.primary }}
                              >
                                不良
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ fontSize: '0.875rem', color: theme.palette.text.primary }}
                              >
                                {stats.distribution.poor.toFixed(1)}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={stats.distribution.poor}
                              sx={{
                                height: 12, // 高さ増加
                                borderRadius: 6,
                                backgroundColor: 'rgba(211, 47, 47, 0.2)',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: 'error.main',
                                }
                              }}
                              aria-label={`不良仰角の割合: ${stats.distribution.poor.toFixed(1)}%`}
                            />
                          </Box>
                        </Tooltip>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  }, [orbitPaths, pathStats, getVisibilityCategory, theme.palette.text.primary]);

  // キーボードショートカット一覧
  const keyboardShortcuts = [
    { key: 'Alt+1', action: 'サマリータブに切り替え' },
    { key: 'Alt+2', action: '詳細タブに切り替え' },
    { key: 'Alt+3', action: '可視性タブに切り替え' },
    { key: 'H', action: 'ヘルプ表示/非表示' },
    { key: 'K', action: 'ショートカット表示/非表示' },
    { key: 'Esc', action: 'パネルを閉じる' },
  ];

  // ヘルプパネル
  const renderHelpPanel = useCallback(() => {
    if (!showHelp) return null;

    return (
      <Paper
        sx={{
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1001,
          padding: '16px', // パディング増加
          backgroundColor: 'rgba(0, 0, 0, 0.9)', // 不透明度を上げてコントラスト向上
          color: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
          maxWidth: '80%',
        }}
        role="dialog"
        aria-label="分析モードのヘルプ"
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, fontSize: '1rem' }}>
          分析モードの使い方
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BarChartIcon fontSize="small" sx={{ mr: 1 }} aria-hidden="true" />
            <Typography sx={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
              サマリー: 主要な分析結果を視覚的に表示
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AssessmentIcon fontSize="small" sx={{ mr: 1 }} aria-hidden="true" />
            <Typography sx={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
              詳細: すべての分析データを表形式で表示
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TimelineIcon fontSize="small" sx={{ mr: 1 }} aria-hidden="true" />
            <Typography sx={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
              可視性: 仰角分布と可視性の詳細分析
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <KeyboardIcon fontSize="small" sx={{ mr: 1 }} aria-hidden="true" />
            <Typography sx={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
              K キーでショートカット一覧を表示
            </Typography>
          </Box>
        </Box>
        <Typography sx={{ display: 'block', mt: 2, fontSize: '0.9rem', lineHeight: 1.5 }}>
          タブを切り替えて、異なる視点から軌道データを分析できます。
          キーボードショートカットを使用すると、より素早く操作できます。
        </Typography>
      </Paper>
    );
  }, [showHelp, isMobile]);

  // キーボードショートカットパネル
  const renderKeyboardShortcutsPanel = useCallback(() => {
    if (!showKeyboardShortcuts) return null;

    return (
      <Paper
        sx={{
          position: 'absolute',
          bottom: showHelp ? '200px' : '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1002,
          padding: '16px',
          backgroundColor: 'rgba(25, 118, 210, 0.9)',
          color: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
          maxWidth: '80%',
        }}
        role="dialog"
        aria-label="キーボードショートカット一覧"
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, fontSize: '1rem' }}>
          キーボードショートカット
        </Typography>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '8px',
          '& > div': {
            display: 'flex',
            justifyContent: 'space-between',
            p: 0.5,
          }
        }}>
          {keyboardShortcuts.map((shortcut, index) => (
            <Box key={index}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.9rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  px: 1,
                  py: 0.5,
                  borderRadius: '4px',
                  minWidth: '80px',
                  textAlign: 'center',
                }}
              >
                {shortcut.key}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.9rem',
                  ml: 2,
                  flexGrow: 1,
                }}
              >
                {shortcut.action}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    );
  }, [showKeyboardShortcuts, showHelp, isMobile]);

  // 遅延ロードのローディング表示
  const renderLoadingFallback = useCallback(() => (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: 4,
    }}>
      <CircularProgress size={40} color="inherit" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.7)' }} />
      <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1rem' }}>
        データを読み込み中...
      </Typography>
    </Box>
  ), []);

  return (
    <>
      <Box sx={{
        position: 'absolute',
        ...getPositionStyle(),
        zIndex: 1000,
      }}>
        <Collapse in={isOpen}>
          <Paper
            sx={{
              padding: '16px', // パディング増加
              backgroundColor: 'rgba(76, 175, 80, 0.95)', // 不透明度を上げてコントラスト向上
              color: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(0, 100, 0, 0.2)', // ボーダーを濃くしてコントラスト向上
              height: 'auto',
              maxHeight: 'none',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            role="region"
            aria-label="軌道分析パネル"
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AssessmentIcon sx={{ mr: 1, fontSize: '1.5rem' }} aria-hidden="true" />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', flexGrow: 1, fontSize: '1.1rem' }}>
                軌道分析
              </Typography>
              <Box sx={{ display: 'flex' }}>
                <Tooltip title="キーボードショートカットを表示 (K)">
                  <IconButton
                    size="medium"
                    onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
                    sx={{
                      color: 'white',
                      opacity: 0.8,
                      '&:hover': { opacity: 1 },
                      '&:focus': {
                        outline: '2px solid white',
                        outlineOffset: '2px'
                      },
                      minWidth: '44px', // タッチターゲットサイズ
                      minHeight: '44px', // タッチターゲットサイズ
                    }}
                    aria-label="キーボードショートカットを表示"
                  >
                    <KeyboardIcon fontSize="medium" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="分析ヘルプを表示 (H)">
                  <IconButton
                    size="medium"
                    onClick={() => setShowHelp(!showHelp)}
                    sx={{
                      color: 'white',
                      opacity: 0.8,
                      '&:hover': { opacity: 1 },
                      '&:focus': {
                        outline: '2px solid white',
                        outlineOffset: '2px'
                      },
                      minWidth: '44px', // タッチターゲットサイズ
                      minHeight: '44px', // タッチターゲットサイズ
                    }}
                    aria-label="分析ヘルプを表示"
                  >
                    <HelpOutlineIcon fontSize="medium" />
                  </IconButton>
                </Tooltip>
                {onClose && (
                  <IconButton
                    size="medium"
                    onClick={onClose}
                    sx={{
                      color: 'white',
                      opacity: 0.8,
                      '&:hover': { opacity: 1 },
                      ml: 0.5,
                      '&:focus': {
                        outline: '2px solid white',
                        outlineOffset: '2px'
                      },
                      minWidth: '44px', // タッチターゲットサイズ
                      minHeight: '44px', // タッチターゲットサイズ
                    }}
                    aria-label="分析パネルを閉じる (Esc)"
                  >
                    <CloseIcon fontSize="medium" />
                  </IconButton>
                )}
              </Box>
            </Box>

            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                minHeight: '48px', // 高さ増加
                '& .MuiTab-root': {
                  minHeight: '48px', // 高さ増加
                  color: 'rgba(255, 255, 255, 0.8)', // コントラスト向上
                  fontSize: '1rem', // フォントサイズ増加
                  '&.Mui-selected': {
                    color: 'white',
                  },
                  '&:focus': {
                    outline: '2px solid rgba(255, 255, 255, 0.5)',
                    outlineOffset: '-2px'
                  }
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: 'white',
                  height: '3px', // 太さ増加
                }
              }}
              aria-label="分析タブ"
            >
              <Tab
                icon={<BarChartIcon />}
                label="サマリー"
                value={AnalysisTab.SUMMARY}
                id="tab-summary"
                aria-controls="tabpanel-summary"
                aria-label="サマリータブ (Alt+1)"
              />
              <Tab
                icon={<AssessmentIcon />}
                label="詳細"
                value={AnalysisTab.DETAILS}
                id="tab-details"
                aria-controls="tabpanel-details"
                aria-label="詳細タブ (Alt+2)"
              />
              <Tab
                icon={<TimelineIcon />}
                label="可視性"
                value={AnalysisTab.VISIBILITY}
                id="tab-visibility"
                aria-controls="tabpanel-visibility"
                aria-label="可視性タブ (Alt+3)"
              />
            </Tabs>

            <Box sx={{
              overflowY: 'auto',
              flex: '1 1 auto',
              '&::-webkit-scrollbar': {
                width: '12px', // 幅増加
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0,0,0,0.1)',
                borderRadius: '6px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(255,255,255,0.4)', // コントラスト向上
                borderRadius: '6px',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.5)',
                }
              }
            }}>
              {currentTab === AnalysisTab.SUMMARY && renderSummaryTab()}

              {currentTab === AnalysisTab.DETAILS && (
                <Suspense fallback={renderLoadingFallback()}>
                  <DetailedAnalysisTab orbitPaths={orbitPaths} pathStats={pathStats} />
                </Suspense>
              )}

              {currentTab === AnalysisTab.VISIBILITY && (
                <Suspense fallback={renderLoadingFallback()}>
                  <VisibilityAnalysisTab orbitPaths={orbitPaths} pathStats={pathStats} />
                </Suspense>
              )}
            </Box>
          </Paper>
        </Collapse>
      </Box>
      {renderHelpPanel()}
      {renderKeyboardShortcutsPanel()}
    </>
  );
};

export default AnalysisPanel;

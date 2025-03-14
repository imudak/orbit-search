import React, { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L, { LatLng } from 'leaflet';
import type { OrbitPath, PassPoint, SearchFilters } from '@/types';
import { ELEVATION_COLORS } from './VisibilityCircleLayer';
import { orbitService } from '@/services/orbitService';
import { calculateSolarPosition } from '@/utils/sunCalculations';
import { useMapContext } from '../index';

// 昼夜に基づいた色の定義（夜間も昼間と同じ色を使用）
const DAY_NIGHT_COLORS = {
  day: {
    optimal: '#ffd54f',   // 明るい黄色（最適）- 昼間
    good: '#ffb74d',      // 明るいオレンジ（良好）- 昼間
    visible: '#ff9800',   // オレンジ（可視）- 昼間
    poor: '#f44336',      // 赤（不良）- 昼間
    invisible: '#9e9e9e'  // グレー（不可視）- 昼間
  },
  night: {
    optimal: '#ffd54f',   // 明るい黄色（最適）- 夜間も昼間と同じ
    good: '#ffb74d',      // 明るいオレンジ（良好）- 夜間も昼間と同じ
    visible: '#ff9800',   // オレンジ（可視）- 夜間も昼間と同じ
    poor: '#f44336',      // 赤（不良）- 夜間も昼間と同じ
    invisible: '#9e9e9e'  // グレー（不可視）- 夜間も昼間と同じ
  }
};

// 昼夜に基づいた線のスタイル
const DAY_NIGHT_STYLES = {
  day: {
    weight: {
      optimal: 4,
      good: 3,
      visible: 2.5,
      poor: 2,
      invisible: 1.5
    },
    dashArray: undefined // 実線
  },
  night: {
    weight: {
      optimal: 3,
      good: 2.5,
      visible: 2,
      poor: 1.5,
      invisible: 1
    },
    dashArray: '5,5' // 破線（カンマの間にスペースを入れない）
  }
};

// 昼夜インジケーター用の色は削除

// 元のPassPointデータを保持するためのマップ
// キー: segmentIndex-pointIndex, 値: PassPoint
const passPointMap = new Map<string, PassPoint>();

interface SatelliteOrbitLayerProps {
  paths: OrbitPath[];
  observerLocation?: { lat: number; lng: number }; // 観測地点の座標（オプション）
  currentTime?: Date; // アニメーションの現在時刻
}

/**
 * 衛星軌道を表示するレイヤーコンポーネント
 */
const SatelliteOrbitLayer: React.FC<SatelliteOrbitLayerProps> = ({
  paths,
  observerLocation,
  currentTime = new Date() // デフォルト値として現在時刻を使用
}) => {
  const map = useMap();
  const { selectedTLE, animationState } = useMapContext();
  const [calculatedPaths, setCalculatedPaths] = useState<OrbitPath[]>(paths);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // 選択されたTLEデータから軌道を計算 - メモリ使用量最適化版
  useEffect(() => {
    const calculateOrbit = async () => {
      // TLEデータがない場合は何もしない
      if (!selectedTLE || !observerLocation) {
        setCalculatedPaths([]);
        return;
      }

      setIsCalculating(true);

      try {
        // 検索フィルターを作成
        const filters: SearchFilters = {
          startDate: animationState.startTime,
          endDate: animationState.endTime,
          minElevation: 0, // すべての仰角を含める
          location: observerLocation
        };

        // 軌道計算
        const passes = await orbitService.calculatePasses(selectedTLE, observerLocation, filters);

        // 計算結果からOrbitPathを作成
        if (passes.length > 0) {
          // パスポイントをセグメントに分割 - 間引きを行う
          const tempSegments = [];
          let currentSegment = {
            points: [] as PassPoint[],
            effectiveAngles: [] as number[]
          };

          // 間引き率を設定（メモリ使用量削減のため）- ユーザーフィードバックに基づき調整
          const skipPoints = 1; // 間引きを少なくして表示を細かく

          for (let i = 0; i < passes[0].points.length; i += skipPoints) {
            const point = passes[0].points[i];

            // 新しいセグメントを開始する必要がある場合
            if (point.isNewSegment && currentSegment.points.length > 0) {
              tempSegments.push(currentSegment);
              currentSegment = {
                points: [],
                effectiveAngles: []
              };
            }

            currentSegment.points.push(point);
            currentSegment.effectiveAngles.push(point.effectiveAngle || 0);
          }

          // 最後のセグメントを追加
          if (currentSegment.points.length > 0) {
            tempSegments.push(currentSegment);
          }

          // PassPointからLatLngに変換 - 直接変換して中間配列を削減
          const orbitSegments = tempSegments.map(segment => ({
            points: segment.points.map(point => ({
              lat: point.lat || 0,
              lng: point.lng || 0
            })),
            effectiveAngles: segment.effectiveAngles
          }));

          // OrbitPathを作成
          const orbitPath: OrbitPath = {
            satelliteId: selectedTLE.line1.substring(2, 7).trim() || 'unknown', // TLEの1行目から衛星IDを抽出
            maxElevation: passes[0].maxElevation,
            segments: orbitSegments,
            timestamp: new Date().toISOString() // 現在時刻をタイムスタンプとして使用
          };

          setCalculatedPaths([orbitPath]);
        } else {
          setCalculatedPaths([]);
        }
      } catch (error) {
        console.error('Failed to calculate orbit:', error);
        setCalculatedPaths([]);
      } finally {
        setIsCalculating(false);
      }
    };

    calculateOrbit();
  }, [selectedTLE, observerLocation, animationState.startTime, animationState.endTime]);

  // 共通のユーティリティ関数を使用して昼夜を判定する関数
  const isDaylight = (lat: number, lng: number, date: Date = new Date()): boolean => {
    // 太陽の方位角と高度を計算
    const { altitude } = calculateSolarPosition(lat, lng, date);

    // 大気による屈折を考慮した太陽高度による昼夜判定
    // -0.833は大気による屈折と太陽の視半径を考慮した値
    return altitude > -0.833;
  };

  // 軌道の描画 - メモリ使用量最適化版
  useEffect(() => {
    // 計算された軌道パスがない場合は何もしない
    if (!calculatedPaths.length) return;

    // 軌道ラインを保持するローカル変数（ステートではなく）
    const currentLines: L.Polyline[] = [];

    // 観測地点の位置を取得（地図の中心点）
    const mapCenter = map.getCenter();

    // 軌道パスの描画
    calculatedPaths.forEach((path, pathIndex) => {
      // 各セグメントのパスを作成
      path.segments.forEach((segment, segmentIndex) => {
        // 間引き率を設定（メモリ使用量削減のため）- ユーザーフィードバックに基づき調整
        // ズームレベルに応じて間引き率を動的に調整
        const zoomLevel = map.getZoom();
        // ズームレベルに応じて間引き率を動的に調整（ズームが大きいほど細かく表示）
        const skipPoints = zoomLevel > 8 ? 1 : zoomLevel > 5 ? 2 : 3;

        // 現在の地図の表示範囲を取得
        const bounds = map.getBounds();

        // セグメント内の各ポイント間に線を引く（間引きながら）
        for (let i = 0; i < segment.points.length - 1; i += skipPoints) {
          const point1 = segment.points[i];
          // 配列の範囲外アクセスを防止
          const nextIndex = Math.min(i + skipPoints, segment.points.length - 1);
          const point2 = segment.points[nextIndex];
          const effectiveAngle = segment.effectiveAngles[i];

          // 日付変更線をまたぐ場合の処理
          // 経度の差が極端に大きい場合は日付変更線をまたいでいると判断
          let lngDiff = Math.abs(point1.lng - point2.lng);
          if (lngDiff > 170) { // 170度以上の差がある場合は日付変更線をまたいでいる
            // 日付変更線をまたぐ場合は線を引かない
            continue;
          }

          // 画面外の軌道は描画しない（メモリ使用量削減のため）
          // ただし、線分の一部が画面内にある場合は描画する
          const isPoint1Visible = bounds.contains([point1.lat, point1.lng]);
          const isPoint2Visible = bounds.contains([point2.lat, point2.lng]);

          // 両方のポイントが画面外の場合はスキップ
          // ただし、画面の端をまたぐ線分の場合は描画する必要があるため、
          // 距離が近い場合のみスキップする
          if (!isPoint1Visible && !isPoint2Visible) {
            // 画面の端をまたぐ可能性がある場合は描画する
            // 経度方向の差が大きい場合は描画する
            if (lngDiff < 50) {
              continue;
            }
          }

          // 経度を-180〜180度の範囲に正規化
          let lng1 = point1.lng;
          let lng2 = point2.lng;

          // 経度を-180〜180度の範囲に正規化
          while (lng1 > 180) lng1 -= 360;
          while (lng1 < -180) lng1 += 360;

          while (lng2 > 180) lng2 -= 360;
          while (lng2 < -180) lng2 += 360;

          // 相対座標を計算
          let lng1ForPoint = lng1;
          let lng2ForPoint = lng2;

          if (observerLocation) {
            // 観測地点からの相対経度を計算
            let relLng1 = lng1 - observerLocation.lng;
            let relLng2 = lng2 - observerLocation.lng;

            // -180〜180度の範囲に正規化
            while (relLng1 > 180) relLng1 -= 360;
            while (relLng1 < -180) relLng1 += 360;

            while (relLng2 > 180) relLng2 -= 360;
            while (relLng2 < -180) relLng2 += 360;

            // 相対座標を使用
            lng1ForPoint = observerLocation.lng + relLng1;
            lng2ForPoint = observerLocation.lng + relLng2;

            // 相対座標計算後に再度日付変更線をまたぐかチェック
            let lngDiffAfterRelative = Math.abs(lng1ForPoint - lng2ForPoint);
            if (lngDiffAfterRelative > 170) {
              // 相対座標計算後も日付変更線をまたぐ場合は線を引かない
              continue;
            }
          }

          // 経度を再度-180〜180度の範囲に正規化（表示用）
          while (lng1ForPoint > 180) lng1ForPoint -= 360;
          while (lng1ForPoint < -180) lng1ForPoint += 360;

          while (lng2ForPoint > 180) lng2ForPoint -= 360;
          while (lng2ForPoint < -180) lng2ForPoint += 360;

          const segmentPoints = [
            new LatLng(point1.lat, lng1ForPoint),
            new LatLng(point2.lat, lng2ForPoint)
          ];

          // 各ポイントの時刻に基づいて昼夜を判定
          // 現在の時刻ではなく、軌道上の各ポイントの時刻を使用

          // propsから受け取ったアニメーションの現在時刻を使用
          // 注: 将来的には軌道上の各ポイントの正確な時刻を使用するように改善する必要があります

          // 各ポイントの時刻に基づいて昼夜を判定
          const isDay = isDaylight(point1.lat, lng1ForPoint, currentTime);

          // 昼夜と仰角に基づいてスタイルを設定
          let color: string;
          let weight: number;
          let opacity: number;
          let dashArray: string | undefined = undefined;

          // 昼夜に応じた色とスタイルを選択
          const colorSet = isDay ? DAY_NIGHT_COLORS.day : DAY_NIGHT_COLORS.night;
          const styleSet = isDay ? DAY_NIGHT_STYLES.day : DAY_NIGHT_STYLES.night;

          // 昼夜共通の透明度設定
          const opacitySet = {
            optimal: 1.0,
            good: 0.9,
            visible: 0.8,
            poor: 0.6,
            invisible: 0.4
          };

          // 人間工学に基づいた色分け
          let styleCategory: 'optimal' | 'good' | 'visible' | 'poor' | 'invisible';

          if (effectiveAngle >= 45) {
            // 最適（45°以上）
            styleCategory = 'optimal';
          } else if (effectiveAngle >= 20) {
            // 良好（20-45°）
            styleCategory = 'good';
          } else if (effectiveAngle >= 10) {
            // 可視（10-20°）
            styleCategory = 'visible';
          } else if (effectiveAngle >= 0) {
            // 不良（0-10°）
            styleCategory = 'poor';
          } else {
            // 不可視（0°未満）
            styleCategory = 'invisible';
          }

          // スタイルを設定
          color = colorSet[styleCategory];
          weight = styleSet.weight[styleCategory];
          opacity = opacitySet[styleCategory];
          dashArray = styleSet.dashArray;

          // メインのラインを作成
          const line = L.polyline(segmentPoints, {
            color,
            weight,
            opacity,
            dashArray,
            bubblingMouseEvents: true,
          }).addTo(map);

          // マウスオーバー時に仰角と昼夜情報を表示
          line.bindTooltip(
            `仰角: ${effectiveAngle.toFixed(1)}°, ${isDay ? '昼間' : '夜間'}`
          );

          currentLines.push(line);
        }
      });
    });

    return () => {
      // クリーンアップ時に軌道パスを削除
      currentLines.forEach(line => {
        if (line) line.remove();
      });
    };
  }, [calculatedPaths, map, currentTime?.getTime(), map.getZoom()]); // ズームレベルの変更も監視

  return null;
};

export default SatelliteOrbitLayer;

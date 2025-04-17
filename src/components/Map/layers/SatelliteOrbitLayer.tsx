import React, { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L, { LatLng } from 'leaflet';
import type { OrbitPath, PassPoint, SearchFilters } from '@/types';
import { ELEVATION_COLORS } from './VisibilityCircleLayer';
import { orbitService } from '@/services/orbitService';
import { calculateSolarPosition, isDaylight, calculateSunLongitude } from '@/utils/sunCalculations';
import { useMapContext } from '../index';

// 昼夜に基づいた色の定義（夜間も昼間と同じ色を使用）
const DAY_NIGHT_COLORS = {
  day: {
    optimal: '#ffc107',   // 明るい黄色（最適）- 昼間 - より濃く
    good: '#ff9800',      // 明るいオレンジ（良好）- 昼間 - より濃く
    visible: '#f57c00',   // オレンジ（可視）- 昼間 - より濃く
    poor: '#d32f2f',      // 赤（不良）- 昼間 - より濃く
    invisible: '#757575'  // グレー（不可視）- 昼間 - より濃く
  },
  night: {
    optimal: '#ffc107',   // 明るい黄色（最適）- 夜間も昼間と同じ - より濃く
    good: '#ff9800',      // 明るいオレンジ（良好）- 夜間も昼間と同じ - より濃く
    visible: '#f57c00',   // オレンジ（可視）- 夜間も昼間と同じ - より濃く
    poor: '#d32f2f',      // 赤（不良）- 夜間も昼間と同じ - より濃く
    invisible: '#757575'  // グレー（不可視）- 夜間も昼間と同じ - より濃く
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

          // 間引き率を設定（メモリ使用量削減のため）- より滑らかな表示のために間引きを最小化
          const skipPoints = 1; // 最小の間引き - ほぼすべてのポイントを使用して滑らかに表示

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
        // ズームレベルに応じて間引き率を動的に調整（より滑らかな表示のために間引きを最小化）
        const skipPoints = zoomLevel > 10 ? 0 : zoomLevel > 8 ? 1 : zoomLevel > 5 ? 1 : 2;

        // 現在の地図の表示範囲を取得
        const bounds = map.getBounds();

        // セグメント内の各ポイント間に線を引く（間引きながら）
        for (let i = 0; i < segment.points.length - 1; i += Math.max(1, skipPoints)) {
          const point1 = segment.points[i];
          // 配列の範囲外アクセスを防止
          const nextIndex = Math.min(i + Math.max(1, skipPoints), segment.points.length - 1);
          const point2 = segment.points[nextIndex];
          const effectiveAngle = segment.effectiveAngles[i];

          // 日付変更線をまたぐ場合の処理
          // 経度の差が極端に大きい場合は日付変更線をまたいでいると判断
          let lngDiff = Math.abs(point1.lng - point2.lng);

          // 日付変更線をまたぐ場合の処理を改善
          // 完全に反対側にある場合のみスキップ（より連続的な表示のため）
          if (lngDiff > 180) { // 180度以上の差がある場合のみスキップ
            // 日付変更線をまたぐ場合は線を引かない
            continue;
          }

          // 画面外の軌道は描画しない（メモリ使用量削減のため）
          // ただし、線分の一部が画面内にある場合は描画する
          const isPoint1Visible = bounds.contains([point1.lat, point1.lng]);
          const isPoint2Visible = bounds.contains([point2.lat, point2.lng]);

          // 両方のポイントが画面外の場合の処理
          // 画面の端をまたぐ線分や近接する可能性のある軌道は描画する
          // より連続的な軌道表示のために条件を緩和
          if (!isPoint1Visible && !isPoint2Visible) {
            // 画面の端をまたぐ可能性がある場合は描画する
            // 経度方向の差が大きい場合は描画する
            // 条件を緩和して、より多くの軌道を表示（30度未満→スキップ）
            if (lngDiff < 30) {
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
          // isDaylight関数は正確ですが、太陽の日陰/日向の判定と軌道上の点の判定が一致していない可能性がある
          // 地図上の昼夜表示（黄色い領域）とも一致させるために、太陽経度との比較で判定する

          // 太陽の経度を取得
          const sunLongitude = calculateSunLongitude(currentTime);

          // 点の経度と太陽経度の差を計算して昼夜を判定
          // 経度差が90度以内なら昼間
          let sunLngDiff = Math.abs(lng1ForPoint - sunLongitude);
          if (sunLngDiff > 180) sunLngDiff = 360 - sunLngDiff; // 反対側の差を取得

          // 昼夜の判定（経度差が90度以内なら昼間）
          const isDay = sunLngDiff <= 90;

          // デバッグ用（問題が解決されたら削除）
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.001) {
            console.log('Day/Night check:', {
              pointLng: lng1ForPoint,
              sunLng: sunLongitude,
              sunLngDiff,
              isDay,
              originalCheck: isDaylight(point1.lat, lng1ForPoint, currentTime)
            });
          }

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

          // メインのラインを作成（smoothFactorを追加して曲線的に表示）
          const line = L.polyline(segmentPoints, {
            color,
            weight,
            opacity,
            dashArray,
            smoothFactor: 0.5, // 曲線の滑らかさを設定（値が小さいほど滑らか、デフォルトは1）
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

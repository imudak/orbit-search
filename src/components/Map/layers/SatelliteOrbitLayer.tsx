import React, { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L, { LatLng } from 'leaflet';
import type { OrbitPath, PassPoint } from '@/types';
import { ELEVATION_COLORS } from './VisibilityCircleLayer';
import { orbitService } from '@/services/orbitService';

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
}

/**
 * 衛星軌道を表示するレイヤーコンポーネント
 */
const SatelliteOrbitLayer: React.FC<SatelliteOrbitLayerProps> = ({
  paths,
  observerLocation
}) => {
  const map = useMap();
  const [originalPassPoints, setOriginalPassPoints] = useState<PassPoint[]>([]);

  // 元のPassPointデータを取得する
  useEffect(() => {
    const fetchOriginalData = async () => {
      if (paths.length === 0 || !paths[0].satelliteId) return;

      try {
        // 現在表示中の衛星のIDを取得
        const satelliteId = paths[0].satelliteId;

        // ストアから衛星データを取得する処理を実装
        // 注: 実際の実装では、ストアから選択された衛星とその軌道データを取得する必要があります
        // ここでは簡略化のため、コメントアウトしています

        // passPointMapをクリア
        passPointMap.clear();
      } catch (error) {
        console.error('Failed to fetch original pass points:', error);
      }
    };

    fetchOriginalData();
  }, [paths]);

  // 現在の時刻に基づいて昼夜を判定する関数
  const isDaylight = (lat: number, lng: number, date: Date = new Date()): boolean => {
    const DEG_TO_RAD = Math.PI / 180;
    const RAD_TO_DEG = 180 / Math.PI;

    // 日付から年間通日を計算
    const startOfYear = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / 86400000);

    // 太陽の赤緯を計算
    const L = 280.460 + 0.9856474 * dayOfYear;
    const g = 357.528 + 0.9856003 * dayOfYear;
    const lambda = L + 1.915 * Math.sin(g * DEG_TO_RAD) + 0.020 * Math.sin(2 * g * DEG_TO_RAD);
    const epsilon = 23.439 - 0.0000004 * dayOfYear;
    const declination = Math.asin(Math.sin(epsilon * DEG_TO_RAD) * Math.sin(lambda * DEG_TO_RAD)) * RAD_TO_DEG;

    // 時角を計算
    const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    const hourAngle = (utcHours - 12) * 15 + lng;

    // 太陽高度を計算
    const sinAltitude = Math.sin(lat * DEG_TO_RAD) * Math.sin(declination * DEG_TO_RAD) +
      Math.cos(lat * DEG_TO_RAD) * Math.cos(declination * DEG_TO_RAD) * Math.cos(hourAngle * DEG_TO_RAD);
    const solarAltitude = Math.asin(sinAltitude) * RAD_TO_DEG;

    // 大気による屈折を考慮した太陽高度による昼夜判定
    // -0.833は大気による屈折と太陽の視半径を考慮した値
    return solarAltitude > -0.833;
  };

  useEffect(() => {
    if (!paths.length) return;

    // 観測地点の位置を取得（地図の中心点）
    const mapCenter = map.getCenter();

    // 軌道パスの描画
    const lines = paths.flatMap((path, pathIndex) => {
      // 各セグメントのパスを作成
      return path.segments.flatMap((segment, segmentIndex) => {
        const lines: L.Polyline[] = [];

        // セグメント内の各ポイント間に線を引く
        for (let i = 0; i < segment.points.length - 1; i++) {
          const point1 = segment.points[i];
          const point2 = segment.points[i + 1];
          const effectiveAngle = segment.effectiveAngles[i];

          // 日付変更線をまたぐ場合の処理
          // 経度の差が極端に大きい場合は日付変更線をまたいでいると判断
          let lngDiff = Math.abs(point1.lng - point2.lng);
          if (lngDiff > 170) { // 170度以上の差がある場合は日付変更線をまたいでいる
            // 日付変更線をまたぐ場合は線を引かない
            continue;
          }

          // 観測地点からの距離制限を撤廃
          // すべての軌道点を表示する

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

          // 時刻を計算（現在の時刻から経過時間を加算）
          // 注: これは簡略化した実装です。実際には軌道上の各ポイントの正確な時刻を使用すべきです
          const now = new Date();
          const timeOffset = i * 10 * 60 * 1000; // 10分ごとに時間をずらす（簡略化）
          const pointTime = new Date(now.getTime() + timeOffset);

          // 各ポイントの時刻に基づいて昼夜を判定
          const isDay = isDaylight(point1.lat, lng1ForPoint, pointTime);

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

          lines.push(line);
        }

        return lines;
      });
    });

    // 配列が入れ子になっているので、平坦化して一つの配列にする
    const allLines = lines.flat();

    return () => {
      // クリーンアップ時に軌道パスを削除
      allLines.forEach(line => line.remove());
    };
  }, [paths, map]);

  return null;
};

export default SatelliteOrbitLayer;

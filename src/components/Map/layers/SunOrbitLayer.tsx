import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L, { LatLng } from 'leaflet';
import type { Location } from '@/types';
import { AnimationState } from '../panels/AnimationControlPanel';
import {
  calculateSolarDeclination,
  calculateSunLongitude,
  calculateSunPosition,
  calculateTerminator,
  calculateTerminatorPoints,
  calculateDaylightPolygon,
  isDaylight
} from '@/utils/sunCalculations';

// 太陽軌道の色の定義
const SUN_ORBIT_COLORS = {
  daylight: 'rgba(255, 240, 64, 0.35)', // より濃い黄色（透明度を0.25から0.35に上げて視認性をさらに向上）
  terminator: '#4B0082' // インディゴ（昼夜の境界線）
};

// パフォーマンス設定
const PERFORMANCE_CONFIG = {
  // 点の間隔を細かく設定（度数単位）- ズームレベルに応じて動的に調整
  highZoomResolution: 0.5,  // 高ズームレベル（詳細）
  mediumZoomResolution: 1.0, // 中ズームレベル
  lowZoomResolution: 1.5,    // 低ズームレベル（広域）

  // メモリ使用量を最適化するための設定
  maxPoints: 10000,          // 最大点数
  useWebGL: true,            // WebGLレンダリングを使用するか
  cacheResults: true         // 計算結果をキャッシュするか
};

interface SunOrbitLayerProps {
  date: Date;
  observerLocation?: Location;
  key?: string; // Reactのkeyプロパティ
}

/**
 * 太陽の軌道を表示するレイヤーコンポーネント（改善版）
 */
const SunOrbitLayer: React.FC<SunOrbitLayerProps> = ({
  date,
  observerLocation
}) => {
  const map = useMap();

  // キャッシュ用のrefオブジェクト
  const terminatorCache = useRef<Map<string, L.LatLng[][]>>(new Map());
  const daylightCache = useRef<Map<string, L.LatLng[][]>>(new Map());
  const lastDate = useRef<number>(0); // 最後に描画した日時を保存

  // コンポーネントマウント時にキャッシュをクリア
  useEffect(() => {
    // コンポーネントマウント時に一度キャッシュをクリア
    clearCaches();

    return () => {
      // コンポーネントのアンマウント時にもキャッシュをクリア
      clearCaches();
    };
  }, []);

  // キャッシュをクリアする関数
  const clearCaches = () => {
    terminatorCache.current.clear();
    daylightCache.current.clear();
    lastDate.current = 0;
  };

  // ズームレベルによる解像度（点の間隔）を取得
  const getResolutionByZoom = (zoomLevel: number): number => {
    if (zoomLevel > 8) {
      return PERFORMANCE_CONFIG.highZoomResolution;
    } else if (zoomLevel > 5) {
      return PERFORMANCE_CONFIG.mediumZoomResolution;
    } else {
      return PERFORMANCE_CONFIG.lowZoomResolution;
    }
  };

  // 昼間の領域を計算する関数（ポリゴン）- 完全に修正版
  const calculateDaylightArea = (date: Date, resolution: number): LatLng[][] => {
    // 日付と解像度に基づいたキャッシュキーを生成
    const cacheKey = `${date.getTime()}_${resolution}`;

    // キャッシュに結果があればそれを返す
    if (PERFORMANCE_CONFIG.cacheResults && daylightCache.current.has(cacheKey)) {
      return daylightCache.current.get(cacheKey) || [];
    }

    // sunCalculationsの関数を使用して昼間領域のポリゴンを取得
    // この関数は既に適切に計算されたポリゴンを返す
    try {
      const polygons: LatLng[][] = [];

      // 太陽の位置を計算（デバッグ用）
      const { lat: subsolarLat, lng: subsolarLng } = calculateSunPosition(date);

      // 太陽の赤緯を考慮した昼間領域の計算を行う
      // numPointsを多めに設定して、より滑らかな境界線を描画
      const numPoints = Math.floor(180 / resolution);
      const daylightRegions = calculateDaylightPolygon(date, numPoints);

      // 昼間領域のポリゴンをLeaflet形式に変換
      daylightRegions.forEach(region => {
        const polygonPoints: LatLng[] = [];
        region.forEach(point => {
          polygonPoints.push(new LatLng(point[0], point[1]));
        });

        // 有効なポリゴンのみを追加
        if (polygonPoints.length > 2) {
          polygons.push(polygonPoints);
        }
      });

      // 北極と南極の昼夜判定
      const northPoleIsDaylight = isDaylight(90, 0, date);
      const southPoleIsDaylight = isDaylight(-90, 0, date);

      // ポリゴンが不足している場合（例：極地の白夜など）
      if (polygons.length === 0) {
        if (northPoleIsDaylight || southPoleIsDaylight) {
          // 極地が昼間の場合、適切な領域を作成
          const specialPolygon: LatLng[] = [];

          // 半球全体をカバーする
          for (let lng = -180; lng <= 180; lng += 10) {
            if (northPoleIsDaylight) {
              specialPolygon.push(new LatLng(90, lng));
            } else {
              specialPolygon.push(new LatLng(-90, lng));
            }
          }

          polygons.push(specialPolygon);
        }
      }

      // 計算結果をキャッシュ
      if (PERFORMANCE_CONFIG.cacheResults) {
        daylightCache.current.set(cacheKey, polygons);

        // キャッシュが大きくなりすぎないように古いエントリを削除
        if (daylightCache.current.size > 100) {
          // 最も古いキーを削除
          const keys = Array.from(daylightCache.current.keys());
          if (keys.length > 0) {
            const oldestKey = keys[0];
            daylightCache.current.delete(oldestKey);
          }
        }
      }

      return polygons;
    } catch (error) {
      console.error('昼間領域の計算中にエラーが発生しました:', error);
      return [];
    }
  };

  // 昼夜の境界線（ターミネーター）を計算する関数 - 大幅に改善
  const calculateTerminatorLine = (date: Date, resolution: number): LatLng[][] => {
    // 日付と解像度に基づいたキャッシュキーを生成
    const cacheKey = `${date.getTime()}_${resolution}`;

    // キャッシュに結果があればそれを返す
    if (PERFORMANCE_CONFIG.cacheResults && terminatorCache.current.has(cacheKey)) {
      return terminatorCache.current.get(cacheKey) || [];
    }

    // 新しい計算方法: 高精度なターミネーター計算を使用
    // 日付変更線をまたぐ場合に別々の線として返す
    const terminatorLines = calculateTerminatorPoints(date, resolution);

    // Leafletで使用できる形式に変換
    const leafletLines = terminatorLines.map(line =>
      line.map(point => new LatLng(point[0], point[1]))
    ).filter(line => line.length > 1); // 1点だけの線は除外

    // 計算結果をキャッシュ
    if (PERFORMANCE_CONFIG.cacheResults) {
      terminatorCache.current.set(cacheKey, leafletLines);

      // キャッシュが大きくなりすぎないように古いエントリを削除
      if (terminatorCache.current.size > 100) {
        // 最も古いキーを削除
        const keys = Array.from(terminatorCache.current.keys());
        if (keys.length > 0) {
          const oldestKey = keys[0];
          terminatorCache.current.delete(oldestKey);
        }
      }
    }

    return leafletLines;
  };

  // 太陽軌道を描画 - シンプル最適化版
  useEffect(() => {
    // 以前の図形をクリーンアップ
    const currentShapes: (L.Polygon | L.Polyline)[] = [];

    // 現在のズームレベルを取得
    const zoomLevel = map.getZoom();

    // ズームレベルに応じた解像度（点の間隔）を取得
    const resolution = getResolutionByZoom(zoomLevel);

    // 昼間の領域を計算 - シンプルな計算方法を使用
    const daylightPolygons = calculateDaylightArea(date, resolution);

    // 昼夜の境界線を計算
    const terminatorLines = calculateTerminatorLine(date, resolution);

    // 描画レイヤーのオプション
    const canvasRenderer = L.canvas({ padding: 1.0 });

    // 昼間の領域を単一ポリゴンとして描画
    if (daylightPolygons.length > 0) {
      // 各ポリゴンを個別に描画（通常は1つか2つのみ）
      daylightPolygons.forEach(points => {
        if (points.length < 3) return; // 有効なポリゴンではない場合はスキップ

        // ポイント数が多すぎる場合は間引く
        const maxPoints = 500; // 最大点数を制限してパフォーマンスを向上
        const optimizedPoints = points.length > maxPoints
          ? points.filter((_, i) => i % Math.ceil(points.length / maxPoints) === 0)
          : points;

        // パフォーマンス向上のためにCanvasレンダラーを使用
        const polygon = L.polygon(optimizedPoints, {
          renderer: canvasRenderer, // Canvasレンダラーを使用
          color: SUN_ORBIT_COLORS.daylight,
          fillColor: SUN_ORBIT_COLORS.daylight,
          fillOpacity: 0.5,
          weight: 1,
          opacity: 0.3,
          smoothFactor: 2.0 // 高い値を設定して曲線を滑らかにする
        }).addTo(map);

        polygon.bindTooltip('昼間の領域');
        currentShapes.push(polygon);
      });
    }

    // 昼夜の境界線をシンプルに表示
    if (terminatorLines.length > 0) {
      terminatorLines.forEach(line => {
        if (line.length < 2) return;

        // 点を間引いて滑らかにする
        const maxLinePoints = 200;
        const optimizedLine = line.length > maxLinePoints
          ? line.filter((_, i) => i % Math.ceil(line.length / maxLinePoints) === 0)
          : line;

        const polyline = L.polyline(optimizedLine, {
          renderer: canvasRenderer,
          color: SUN_ORBIT_COLORS.terminator,
          weight: 1.5,
          opacity: 0.6,
          dashArray: '3, 7',
          smoothFactor: 1.5 // 線の表示を滑らかにする
        }).addTo(map);

        polyline.bindTooltip('昼夜の境界線');
        currentShapes.push(polyline);
      });
    }

    return () => {
      // クリーンアップ時に作成したすべての図形を削除
      currentShapes.forEach(shape => {
        if (shape) shape.remove();
      });
    };
  }, [date.getTime(), map, map.getZoom()]); // date.getTimeとズームレベルの変更を監視

  return null;
};

export default SunOrbitLayer;

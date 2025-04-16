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
  isDaylight
} from '@/utils/sunCalculations';

// 太陽軌道の色の定義
const SUN_ORBIT_COLORS = {
  daylight: 'rgba(255, 255, 0, 0.1)', // 透明な黄色（昼間の帯）
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
  const terminatorCache = useRef<Map<string, L.LatLng[]>>(new Map());
  const daylightCache = useRef<Map<string, L.LatLng[][]>>(new Map());

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

  // 昼間の領域を計算する関数（ポリゴン）- 修正版
  const calculateDaylightArea = (date: Date, resolution: number): LatLng[][] => {
    // 日付と解像度に基づいたキャッシュキーを生成
    const cacheKey = `${date.getTime()}_${resolution}`;

    // キャッシュに結果があればそれを返す
    if (PERFORMANCE_CONFIG.cacheResults && daylightCache.current.has(cacheKey)) {
      return daylightCache.current.get(cacheKey) || [];
    }

    // 太陽の位置を計算
    const { lat: subsolarLat, lng: subsolarLng } = calculateSunPosition(date);

    // 新しい計算方法: 修正されたターミネーター計算を使用
    const terminatorPoints = calculateTerminator(date, resolution);

    if (terminatorPoints.length === 0) {
      // ターミネーターがない場合（極地の白夜/極夜など）
      return [];
    }

    // 昼間の領域ポリゴン生成
    const polygons: LatLng[][] = [];

    // 太陽側のポリゴン
    const daylightPolygon: LatLng[] = [];

    // 修正されたターミネーター計算により、点はすでに適切に整列されているはず
    // 日の出側境界と日の入り側境界の点を使用してポリゴンを作成
    for (let i = 0; i < terminatorPoints.length; i++) {
      daylightPolygon.push(new LatLng(
        terminatorPoints[i].lat,
        terminatorPoints[i].lng
      ));
    }

    // 北極と南極の昼夜判定
    const northPoleIsDaylight = isDaylight(90, 0, date);
    const southPoleIsDaylight = isDaylight(-90, 0, date);

    // 極点が昼間の場合、ポリゴンを閉じるために追加の点を入れる
    if (northPoleIsDaylight) {
      // 北極が昼間の場合、北極を通る子午線を追加
      daylightPolygon.push(new LatLng(80, -180));
      daylightPolygon.push(new LatLng(89.9, -180));
      daylightPolygon.push(new LatLng(89.9, -90));
      daylightPolygon.push(new LatLng(89.9, 0));
      daylightPolygon.push(new LatLng(89.9, 90));
      daylightPolygon.push(new LatLng(89.9, 180));
    }

    if (southPoleIsDaylight) {
      // 南極が昼間の場合、南極を通る子午線を追加
      daylightPolygon.push(new LatLng(-80, 180));
      daylightPolygon.push(new LatLng(-89.9, 180));
      daylightPolygon.push(new LatLng(-89.9, 90));
      daylightPolygon.push(new LatLng(-89.9, 0));
      daylightPolygon.push(new LatLng(-89.9, -90));
      daylightPolygon.push(new LatLng(-89.9, -180));
    }

    // ポリゴン配列に追加
    if (daylightPolygon.length > 0) {
      polygons.push(daylightPolygon);
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
  };

  // 昼夜の境界線（ターミネーター）を計算する関数 - 大幅に改善
  const calculateTerminatorLine = (date: Date, resolution: number): LatLng[] => {
    // 日付と解像度に基づいたキャッシュキーを生成
    const cacheKey = `${date.getTime()}_${resolution}`;

    // キャッシュに結果があればそれを返す
    if (PERFORMANCE_CONFIG.cacheResults && terminatorCache.current.has(cacheKey)) {
      return terminatorCache.current.get(cacheKey) || [];
    }

    // 新しい計算方法: 高精度なターミネーター計算を使用
    const terminatorPoints = calculateTerminator(date, resolution);
    const leafletPoints = terminatorPoints.map(point => new LatLng(point.lat, point.lng));

    // 計算結果をキャッシュ
    if (PERFORMANCE_CONFIG.cacheResults) {
      terminatorCache.current.set(cacheKey, leafletPoints);

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

    return leafletPoints;
  };

  // 太陽軌道を描画 - パフォーマンス最適化版
  useEffect(() => {
    // 現在のズームレベルを取得
    const zoomLevel = map.getZoom();

    // ズームレベルに応じた解像度（点の間隔）を取得
    const resolution = getResolutionByZoom(zoomLevel);

    // 昼間の領域を計算 - 高精度な計算方法を使用
    const daylightPolygons = calculateDaylightArea(date, resolution);

    // 昼夜の境界線を計算 - 高精度な計算方法を使用
    const terminatorPoints = calculateTerminatorLine(date, resolution);

    // 現在のレンダリングサイクルで作成されたすべての図形を保持するローカル変数
    const currentShapes: (L.Polygon | L.Polyline)[] = [];

    // 現在の地図の表示範囲を取得
    const bounds = map.getBounds();

    // 描画レイヤーのオプション
    const canvasRenderer = L.canvas({ padding: 0.5 });

    // 昼間の領域をポリゴンとして描画（複数のポリゴンに対応）
    const daylightAreas = daylightPolygons.map(points => {
      // ポイント数が多すぎる場合は間引く
      const optimizedPoints = points.length > PERFORMANCE_CONFIG.maxPoints
        ? points.filter((_, i) => i % Math.ceil(points.length / PERFORMANCE_CONFIG.maxPoints) === 0)
        : points;

      // 画面に表示される部分のみを描画するための最適化
      // ポリゴン全体が画面外の場合はスキップ
      let isVisible = false;
      for (const point of optimizedPoints) {
        if (bounds.contains(point)) {
          isVisible = true;
          break;
        }
      }

      // 画面外のポリゴンはスキップ（メモリ使用量削減のため）
      if (!isVisible && optimizedPoints.length > 10) {
        return null;
      }

      // パフォーマンス向上のためにCanvasレンダラーを使用
      const polygon = L.polygon(optimizedPoints, {
        renderer: canvasRenderer, // Canvasレンダラーを使用
        color: SUN_ORBIT_COLORS.daylight,
        fillColor: SUN_ORBIT_COLORS.daylight,
        fillOpacity: 0.3,
        weight: 0, // 境界線なし
        bubblingMouseEvents: true
      }).addTo(map);

      // ツールチップを設定
      polygon.bindTooltip('昼間の領域');

      // ローカル配列に追加
      currentShapes.push(polygon);

      return polygon;
    }).filter(Boolean); // nullをフィルタリング

    // 昼夜の境界線を作成（パフォーマンス最適化）
    // ポイント数が多すぎる場合は間引く
    const optimizedTerminatorPoints = terminatorPoints.length > PERFORMANCE_CONFIG.maxPoints
      ? terminatorPoints.filter((_, i) => i % Math.ceil(terminatorPoints.length / PERFORMANCE_CONFIG.maxPoints) === 0)
      : terminatorPoints;

    const terminatorLine = L.polyline(optimizedTerminatorPoints, {
      renderer: canvasRenderer, // Canvasレンダラーを使用
      color: SUN_ORBIT_COLORS.terminator,
      weight: 1.5,
      opacity: 0.6,
      dashArray: '3, 7',
      bubblingMouseEvents: true
    }).addTo(map);

    // ツールチップを設定
    terminatorLine.bindTooltip('昼夜の境界線');

    // ローカル配列に追加
    currentShapes.push(terminatorLine);

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

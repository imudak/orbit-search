import React, { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L, { LatLng } from 'leaflet';
import type { Location } from '@/types';
import { AnimationState } from '../panels/AnimationControlPanel';
import { calculateSolarDeclination, calculateSunLongitude, calculateSolarPosition } from '@/utils/sunCalculations';

// 太陽軌道の色の定義
const SUN_ORBIT_COLORS = {
  daylight: 'rgba(255, 255, 0, 0.1)', // 透明な黄色（昼間の帯）
  terminator: '#4B0082' // インディゴ（昼夜の境界線）
};

interface SunOrbitLayerProps {
  date: Date;
  observerLocation?: Location;
  key?: string; // Reactのkeyプロパティ
}

/**
 * 太陽の軌道を表示するレイヤーコンポーネント
 */
const SunOrbitLayer: React.FC<SunOrbitLayerProps> = ({
  date,
  observerLocation
}) => {
  const map = useMap();
  // 共通のユーティリティ関数を使用

  // 昼間の領域を計算する関数（ポリゴン）- 点の間隔を動的に調整
  const calculateDaylightArea = (date: Date, zoomLevel: number): LatLng[][] => {
    // 太陽の経度を計算（共通ユーティリティ関数を使用）
    const sunLng = calculateSunLongitude(date);

    // 昼間の領域は太陽の位置を中心に東西に90度の範囲
    // 北極から南極まで帯状に広がる
    const eastBoundary = sunLng + 90;
    const westBoundary = sunLng - 90;

    // 日付変更線をまたぐかどうかを判定
    const crossesDateLine = Math.abs(eastBoundary - westBoundary) > 180 ||
                           eastBoundary > 180 || eastBoundary < -180 ||
                           westBoundary > 180 || westBoundary < -180;

    // ズームレベルに応じて点の間隔を動的に調整
    // ズームが大きいほど細かく表示
    const latStep = zoomLevel > 8 ? 5 : zoomLevel > 5 ? 10 : 15;

    if (crossesDateLine) {
      // 日付変更線をまたぐ場合は、2つのポリゴンを作成
      const polygon1: LatLng[] = [];
      const polygon2: LatLng[] = [];

      // 正規化された境界を計算
      let normalizedEastBoundary = eastBoundary;
      let normalizedWestBoundary = westBoundary;

      while (normalizedEastBoundary > 180) normalizedEastBoundary -= 360;
      while (normalizedEastBoundary < -180) normalizedEastBoundary += 360;

      while (normalizedWestBoundary > 180) normalizedWestBoundary -= 360;
      while (normalizedWestBoundary < -180) normalizedWestBoundary += 360;

      // 第1ポリゴン: 西の境界から180度まで
      // 北極から南極へ
      for (let lat = 90; lat >= -90; lat -= latStep) {
        polygon1.push(new LatLng(lat, normalizedWestBoundary));
      }

      // 南極から北極へ（180度の線）
      for (let lat = -90; lat <= 90; lat += latStep) {
        polygon1.push(new LatLng(lat, 180));
      }

      // 第2ポリゴン: -180度から東の境界まで
      // 北極から南極へ
      for (let lat = 90; lat >= -90; lat -= latStep) {
        polygon2.push(new LatLng(lat, -180));
      }

      // 南極から北極へ（東の境界）
      for (let lat = -90; lat <= 90; lat += latStep) {
        polygon2.push(new LatLng(lat, normalizedEastBoundary));
      }

      return [polygon1, polygon2];
    } else {
      // 日付変更線をまたがない場合は、1つのポリゴンを作成
      const polygon: LatLng[] = [];

      // 北極から南極へ（西の境界）
      for (let lat = 90; lat >= -90; lat -= latStep) {
        let lng = westBoundary;
        // 経度を-180〜180度の範囲に正規化
        while (lng > 180) lng -= 360;
        while (lng < -180) lng += 360;
        polygon.push(new LatLng(lat, lng));
      }

      // 南極から北極へ（東の境界）
      for (let lat = -90; lat <= 90; lat += latStep) {
        let lng = eastBoundary;
        // 経度を-180〜180度の範囲に正規化
        while (lng > 180) lng -= 360;
        while (lng < -180) lng += 360;
        polygon.push(new LatLng(lat, lng));
      }

      return [polygon];
    }
  };

  // 昼夜の境界線（ターミネーター）を計算する関数 - 点の間隔を動的に調整
  const calculateTerminator = (date: Date, zoomLevel: number): LatLng[] => {
    const points: LatLng[] = [];

    // 太陽の経度を計算（共通ユーティリティ関数を使用）
    const sunLng = calculateSunLongitude(date);

    // 昼夜の境界線は太陽の位置から90度離れた大円
    // 北から南へ一方向に点を生成
    const lngEast = sunLng + 90;
    const lngWest = sunLng - 90;

    // ズームレベルに応じて点の間隔を動的に調整
    // ズームが大きいほど細かく表示
    const latStep = zoomLevel > 8 ? 5 : zoomLevel > 5 ? 10 : 15;

    // 東側の境界線
    for (let lat = -90; lat <= 90; lat += latStep) {
      let lng = lngEast;
      while (lng > 180) lng -= 360;
      while (lng < -180) lng += 360;
      points.push(new LatLng(lat, lng));
    }

    // 西側の境界線（南から北へ）
    for (let lat = 90; lat >= -90; lat -= latStep) {
      let lng = lngWest;
      while (lng > 180) lng -= 360;
      while (lng < -180) lng += 360;
      points.push(new LatLng(lat, lng));
    }

    return points;
  };
  // 太陽軌道を描画 - メモリ使用量最適化版
  useEffect(() => {
    // 現在のズームレベルを取得
    const zoomLevel = map.getZoom();

    // 昼間の領域を計算 - ズームレベルに応じて点の間隔を調整
    const daylightPolygons = calculateDaylightArea(date, zoomLevel);

    // 昼夜の境界線を計算 - ズームレベルに応じて点の間隔を調整
    const terminatorPoints = calculateTerminator(date, zoomLevel);

    // 現在のレンダリングサイクルで作成されたすべての図形を保持するローカル変数
    const currentShapes: (L.Polygon | L.Polyline)[] = [];

    // 現在の地図の表示範囲を取得
    const bounds = map.getBounds();

    // 昼間の領域をポリゴンとして描画（複数のポリゴンに対応）
    const daylightAreas = daylightPolygons.map(points => {
      // 画面に表示される部分のみを描画するための最適化
      // ポリゴン全体が画面外の場合はスキップ
      let isVisible = false;
      for (const point of points) {
        if (bounds.contains(point)) {
          isVisible = true;
          break;
        }
      }

      // 画面外のポリゴンはスキップ（メモリ使用量削減のため）
      if (!isVisible && points.length > 10) {
        return null;
      }

      const polygon = L.polygon(points, {
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

    // 昼夜の境界線を作成
    const terminatorLine = L.polyline(terminatorPoints, {
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

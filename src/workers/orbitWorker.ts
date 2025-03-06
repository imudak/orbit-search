import * as satellite from 'satellite.js';
import type { TLEData, Location, SearchFilters, Pass, PassPoint } from '@/types';

// 定数
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// Web Workerのコンテキスト型定義
const ctx: Worker = self as any;

interface CalculatePassesMessage {
  type: 'calculatePasses';
  requestId: number; // リクエストID
  tle: TLEData;
  location: Location;
  filters: SearchFilters;
}

// メッセージハンドラーの設定
ctx.addEventListener('message', (event: MessageEvent<CalculatePassesMessage>) => {
  if (event.data.type === 'calculatePasses') {
    try {
      const { tle, location, filters, requestId } = event.data;
      console.log(`Processing TLE (requestId: ${requestId}):`, {
        line1: tle.line1,
        line2: tle.line2,
        location,
        filters
      });

      // TLEデータの検証
      if (!validateTLE(tle)) {
        console.error(`TLE validation failed (requestId: ${requestId}):`, { tle });
        throw new Error('Invalid TLE data format');
      }

      const passes = calculatePasses(tle, location, filters);
      console.log(`Calculated passes (requestId: ${requestId}):`, {
        count: passes.length,
        firstPass: passes[0] || null,
        filters
      });

      // リクエストIDを含めてレスポンスを返す
      ctx.postMessage({ type: 'passes', requestId, data: passes });
    } catch (error) {
      console.error('Orbit calculation error:', error);
      // エラー時は空のパス配列を返す（リクエストIDも含める）
      ctx.postMessage({
        type: 'passes',
        requestId: event.data.requestId,
        data: []
      });
    }
  }
});

/**
 * TLEデータの検証
 */
function validateTLE(tle: TLEData): boolean {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    if (!satrec) {
      return false;
    }
    // テスト計算を実行して有効性を確認
    const testDate = new Date();
    const positionAndVelocity = satellite.propagate(satrec, testDate);
    return !!(positionAndVelocity.position && typeof positionAndVelocity.position !== 'boolean');
  } catch (error) {
    console.warn('TLE validation failed:', error);
    return false;
  }
}

/**
 * 衛星の軌道を計算
 */
function calculatePasses(
  tle: TLEData,
  location: Location,
  filters: SearchFilters
): Pass[] {
  console.log('Orbit calculation settings:', {
    location: {
      lat: location.lat.toFixed(4),
      lng: location.lng.toFixed(4)
    },
    startDate: filters.startDate?.toISOString(),
    endDate: filters.endDate?.toISOString(),
  });

  // 入力された日時はローカルタイム（ブラウザのタイムゾーン）
  // JavaScriptのDate objectは内部的にUTCとして処理
  const startTime = (filters.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000)).getTime();
  const endTime = (filters.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).getTime();

  // デバッグ用：時刻変換の確認
  console.log('Time conversion check:', {
    startLocal: filters.startDate?.toLocaleString(),
    startUTC: filters.startDate?.toUTCString(),
    endLocal: filters.endDate?.toLocaleString(),
    endUTC: filters.endDate?.toUTCString()
  });
  const minElevation = filters.minElevation || 0;
  const stepSize = 30 * 1000; // 30秒ごとに計算

  const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
  if (!satrec) {
    throw new Error('Failed to parse TLE data');
  }

  // 観測地点の位置を地心直交座標系（ECI）に変換するためのデータを準備
  const observerGd = {
    latitude: satellite.degreesToRadians(location.lat),
    longitude: satellite.degreesToRadians(location.lng),
    height: 0.0 // 地上高（km）
  };

  // 軌道の全ポイントを計算
  const orbitPoints: PassPoint[] = [];
  let currentTime = startTime;
  let maxElevation = -90;

  while (currentTime <= endTime) {
    try {
      const date = new Date(currentTime);

      // 衛星の位置と速度を計算
      const positionAndVelocity = satellite.propagate(satrec, date);
      if (!positionAndVelocity.position || typeof positionAndVelocity.position === 'boolean') {
        currentTime += stepSize;
        continue;
      }

      // グリニッジ恒星時を計算
      const gmst = satellite.gstime(date);

      // 観測地点からの衛星の見かけの位置を計算
      const positionEci = positionAndVelocity.position;
      const lookAngles = satellite.ecfToLookAngles(observerGd, positionEci);

      // 地平座標系での位置を取得
      const elevation = satellite.degreesLat(lookAngles.elevation);
      const azimuth = (lookAngles.azimuth * 180 / Math.PI + 360) % 360;
      const rangeSat = lookAngles.rangeSat;

      // 衛星の地理座標を計算
      const satelliteGd = satellite.eciToGeodetic(positionEci, gmst);
      const satelliteLat = satellite.degreesLat(satelliteGd.latitude);
      let satelliteLon = satellite.degreesLong(satelliteGd.longitude);

      // 前のポイントとの経度の連続性を確認
      let isDiscontinuous = false;
      if (orbitPoints.length > 0) {
        const prevPoint = orbitPoints[orbitPoints.length - 1];
        const prevLon = prevPoint.lng!;
        const diff = Math.abs(satelliteLon - prevLon);

        // 経度の差が180度を超える場合は不連続点とする
        if (diff > 180) {
          isDiscontinuous = true;
        }
      }

      // 観測地点から衛星までの大圏距離を計算（ラジアン）
      const observerLat = satellite.degreesToRadians(location.lat);
      const observerLng = satellite.degreesToRadians(location.lng);
      const satLat = satellite.degreesToRadians(satelliteLat);
      const satLng = satellite.degreesToRadians(satelliteLon);

      // Haversine formulaによる大圏距離の計算
      const dlat = satLat - observerLat;
      const dlng = satLng - observerLng;
      const a = Math.sin(dlat/2) * Math.sin(dlat/2) +
                Math.cos(observerLat) * Math.cos(satLat) *
                Math.sin(dlng/2) * Math.sin(dlng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      // 大圏距離を度に変換（0-180度の範囲）
      const greatCircleDistance = c * RAD_TO_DEG;

      // 大圏距離に基づく減衰係数を計算（距離が大きいほど小さくなる）
      const distanceFactor = Math.max(0, 1 - greatCircleDistance / 90);

      // 仰角と距離の両方を考慮した実効的な角度を計算
      const effectiveAngle = elevation * distanceFactor;

      // 新しいセグメントの開始点として追加
      orbitPoints.push({
        time: date,
        elevation,
        azimuth,
        range: rangeSat,
        isDaylight: calculateIsDaylight(satelliteLat, satelliteLon, date),
        lat: satelliteLat,
        lng: satelliteLon,
        isNewSegment: isDiscontinuous, // 不連続点かどうかを記録
        effectiveAngle // 観測地点からの実効的な角度
      });

      // 最大仰角を更新
      maxElevation = Math.max(maxElevation, elevation);

    } catch (error) {
      console.warn('Error during orbit calculation:', error);
    }

    currentTime += stepSize;
  }

  // 一つの軌道パスとして返す
  return [{
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    maxElevation,
    isDaylight: orbitPoints.some(p => p.isDaylight),
    points: orbitPoints
  }];
}

/**
 * 衛星位置での昼夜判定を計算
 * SPICEアルゴリズムに基づく改良版
 */
function calculateIsDaylight(lat: number, lon: number, date: Date): boolean {
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
  const hourAngle = (utcHours - 12) * 15 + lon;

  // 太陽高度を計算
  const sinAltitude = Math.sin(lat * DEG_TO_RAD) * Math.sin(declination * DEG_TO_RAD) +
    Math.cos(lat * DEG_TO_RAD) * Math.cos(declination * DEG_TO_RAD) * Math.cos(hourAngle * DEG_TO_RAD);
  const solarAltitude = Math.asin(sinAltitude) * RAD_TO_DEG;

  // 大気による屈折を考慮した太陽高度による昼夜判定
  // -0.833は大気による屈折と太陽の視半径を考慮した値
  return solarAltitude > -0.833;
}

// Web Workerとして認識させるため
export type {};

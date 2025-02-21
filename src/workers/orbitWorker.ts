import * as satellite from 'satellite.js';
import type { TLEData, Location, SearchFilters, Pass, PassPoint } from '@/types';

// Web Workerのコンテキスト型定義
const ctx: Worker = self as any;

interface CalculatePassesMessage {
  type: 'calculatePasses';
  tle: TLEData;
  location: Location;
  filters: SearchFilters;
}

// メッセージハンドラーの設定
ctx.addEventListener('message', (event: MessageEvent<CalculatePassesMessage>) => {
  if (event.data.type === 'calculatePasses') {
    const { tle, location, filters } = event.data;
    const passes = calculatePasses(tle, location, filters);
    ctx.postMessage({ type: 'passes', data: passes });
  }
});

/**
 * 衛星の可視パスを計算
 */
function calculatePasses(
  tle: TLEData,
  location: Location,
  filters: SearchFilters
): Pass[] {
  const passes: Pass[] = [];
  const startTime = filters.startDate.getTime();
  const endTime = filters.endDate.getTime();
  const stepSize = 30 * 1000; // 30秒ごとに計算（精度向上）

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

  let currentTime = startTime;
  let isVisible = false;
  let currentPass: {
    points: PassPoint[];
    maxElevation: number;
    startTime?: Date;
  } | null = null;

  while (currentTime <= endTime) {
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
    const observerEci = satellite.geodeticToEcf(observerGd);
    const lookAngles = satellite.ecfToLookAngles(observerGd, positionEci);

    // 地平座標系での位置を取得
    const elevation = satellite.degreesLat(lookAngles.elevation);
    const azimuth = satellite.degreesLong(lookAngles.azimuth);
    const rangeSat = lookAngles.rangeSat;

    // 衛星の地理座標を計算（昼夜判定用）
    const satelliteGd = satellite.eciToGeodetic(positionEci, gmst);
    const satelliteLat = satellite.degreesLat(satelliteGd.latitude);
    const satelliteLon = satellite.degreesLong(satelliteGd.longitude);

    const pointData: PassPoint = {
      time: date,
      elevation,
      azimuth,
      range: rangeSat,
      isDaylight: calculateIsDaylight(satelliteLat, satelliteLon, date),
    };

    if (elevation >= filters.minElevation) {
      if (!isVisible) {
        isVisible = true;
        currentPass = {
          points: [pointData],
          maxElevation: elevation,
          startTime: date,
        };
      } else {
        if (currentPass) {
          currentPass.points.push(pointData);
          if (elevation > currentPass.maxElevation) {
            currentPass.maxElevation = elevation;
          }
        }
      }
    } else if (isVisible) {
      isVisible = false;
      if (currentPass && currentPass.points.length > 0) {
        passes.push({
          startTime: currentPass.startTime!,
          endTime: date,
          maxElevation: currentPass.maxElevation,
          isDaylight: currentPass.points.some(p => p.isDaylight),
          points: currentPass.points,
        });
      }
      currentPass = null;
    }

    currentTime += stepSize;
  }

  // 最後のパスが終了していない場合の処理
  if (isVisible && currentPass && currentPass.points.length > 0) {
    passes.push({
      startTime: currentPass.startTime!,
      endTime: new Date(currentTime),
      maxElevation: currentPass.maxElevation,
      isDaylight: currentPass.points.some(p => p.isDaylight),
      points: currentPass.points,
    });
  }

  return passes;
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

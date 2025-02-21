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
  const stepSize = 60 * 1000; // 1分ごとに計算

  const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
  if (!satrec) {
    throw new Error('Failed to parse TLE data');
  }

  let currentTime = startTime;
  let isVisible = false;
  let currentPass: {
    points: PassPoint[];
    maxElevation: number;
    startTime?: Date;
  } | null = null;

  while (currentTime <= endTime) {
    const date = new Date(currentTime);
    const positionAndVelocity = satellite.propagate(satrec, date);

    // 型ガードを追加
    if (!positionAndVelocity.position || typeof positionAndVelocity.position === 'boolean') {
      currentTime += stepSize;
      continue;
    }

    const gmst = satellite.gstime(date);
    const geodetic = satellite.eciToGeodetic(positionAndVelocity.position, gmst);

    const satelliteLat = satellite.degreesLat(geodetic.latitude);
    const satelliteLon = satellite.degreesLong(geodetic.longitude);
    const satelliteHeight = geodetic.height * 1000; // km to m

    const { elevation, azimuth, range } = calculateLookAngles(
      location,
      { lat: satelliteLat, lng: satelliteLon },
      satelliteHeight
    );

    const pointData: PassPoint = {
      time: date,
      elevation,
      azimuth,
      range,
      isDaylight: calculateIsDaylight(satelliteLat, satelliteLon, date),
    };

    if (elevation >= filters.minElevation) {
      if (!isVisible) {
        isVisible = true;
        currentPass = {
          points: [pointData],
          maxElevation: elevation,
        };
        currentPass.startTime = date;
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
 * 衛星の仰角、方位角、距離を計算
 */
function calculateLookAngles(
  observer: Location,
  satellite: Location,
  height: number
): { elevation: number; azimuth: number; range: number } {
  // 簡略化した計算式を使用
  // 実際のアプリケーションではより精密な計算が必要
  const R = 6371000; // 地球の半径（メートル）

  const dLat = (satellite.lat - observer.lat) * Math.PI / 180;
  const dLon = (satellite.lng - observer.lng) * Math.PI / 180;

  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(observer.lat * Math.PI / 180) * Math.cos(satellite.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  const elevation = Math.atan2(height - distance * Math.sin(c), distance * Math.cos(c));
  const azimuth = Math.atan2(
    Math.sin(dLon) * Math.cos(satellite.lat * Math.PI / 180),
    Math.cos(observer.lat * Math.PI / 180) * Math.sin(satellite.lat * Math.PI / 180) -
    Math.sin(observer.lat * Math.PI / 180) * Math.cos(satellite.lat * Math.PI / 180) * Math.cos(dLon)
  );

  return {
    elevation: elevation * 180 / Math.PI,
    azimuth: (azimuth * 180 / Math.PI + 360) % 360,
    range: Math.sqrt(distance * distance + height * height),
  };
}

/**
 * 衛星位置での昼夜判定
 */
function calculateIsDaylight(lat: number, lon: number, date: Date): boolean {
  const time = date.getUTCHours() + date.getUTCMinutes() / 60;
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);

  // 簡略化した昼夜判定
  // 実際のアプリケーションではより精密な計算が必要
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180);
  const hourAngle = (time - 12) * 15;

  const elevation = Math.asin(
    Math.sin(lat * Math.PI / 180) * Math.sin(declination * Math.PI / 180) +
    Math.cos(lat * Math.PI / 180) * Math.cos(declination * Math.PI / 180) *
    Math.cos(hourAngle * Math.PI / 180)
  ) * 180 / Math.PI;

  return elevation > -0.833; // 太陽の中心が地平線より上にある場合は昼
}

// Web Workerとして認識させるため
export type {};

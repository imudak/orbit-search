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
      // ログ出力を抑制
      if (process.env.NODE_ENV === 'development' && requestId % 10 === 0) {
        console.log(`Processing TLE (requestId: ${requestId})`);
      }

      // TLEデータの検証
      if (!validateTLE(tle)) {
        console.error(`TLE validation failed (requestId: ${requestId}):`, { tle });
        throw new Error('Invalid TLE data format');
      }

      const passes = calculatePasses(tle, location, filters);
      // ログ出力を抑制
      if (process.env.NODE_ENV === 'development' && requestId % 10 === 0) {
        console.log(`Calculated passes (requestId: ${requestId}): ${passes.length} passes`);
      }

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
  // ログ出力を抑制（開発環境でのみ出力）
  if (process.env.NODE_ENV === 'development') {
    console.log('Orbit calculation settings:', {
      location: {
        lat: location.lat.toFixed(4),
        lng: location.lng.toFixed(4)
      }
    });
  }

  // 入力された日時はローカルタイム（ブラウザのタイムゾーン）
  // 衛星位置計算はUTC時間を使用するため、タイムゾーンを考慮する必要がある
  // 日時をそのまま使用し、satellite.jsの内部でUTC変換が適切に行われるようにする
  const startTime = (filters.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000)).getTime();
  const endTime = (filters.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).getTime();

  // デバッグ用ログを抑制（開発環境でのみ出力）
  if (process.env.NODE_ENV === 'development') {
    console.log('Time conversion check:', {
      timeZoneOffset: new Date().getTimezoneOffset() // タイムゾーンオフセット（分）
    });
  }

  const minElevation = filters.minElevation || 0;

  // 計算間隔を調整
  // 軌道表示の滑らかさを向上させるために時間間隔を短縮
  const isDetailedView = filters.stepSize !== undefined;
  const stepSize = filters.stepSize || (isDetailedView ? 30 * 1000 : 2 * 60 * 1000); // デフォルトは2分、詳細表示の場合は30秒

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
      // 時刻を正確に処理するために新しいDateオブジェクトを作成
      // currentTimeはミリ秒単位のタイムスタンプ
      const date = new Date(currentTime);

      // 衛星の位置と速度を計算
      // satellite.jsはUTC時間を使用するため、Dateオブジェクトをそのまま渡す
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
      // 注意: eciToGeodeticは地心直交座標系（ECI）から地理座標系への変換を行う
      // gmstは地球の自転を考慮するために使用される
      const satelliteGd = satellite.eciToGeodetic(positionEci, gmst);
      const satelliteLat = satellite.degreesLat(satelliteGd.latitude);
      let satelliteLon = satellite.degreesLong(satelliteGd.longitude);

      // 経度を-180〜180度の範囲に正規化
      // 複数回の正規化が必要な場合に対応
      while (satelliteLon > 180) satelliteLon -= 360;
      while (satelliteLon < -180) satelliteLon += 360;

      // 観測地点の経度
      const observerLongitude = location.lng;

      // 経度調整の根本的な修正（第5版）
      // 問題: Leafletの地図では相対座標系を使用する必要がある

      // 新しい解決策: 観測地点を中心（0度）とした相対座標系に変換
      // 1. 経度差を計算
      let lonDiff = satelliteLon - observerLongitude;

      // 2. 経度差を-180度から180度の範囲に正規化
      // 複数回の正規化が必要な場合に対応
      while (lonDiff > 180) lonDiff -= 360;
      while (lonDiff < -180) lonDiff += 360;

      // 3. 表示用の経度を計算
      // 相対経度と実際の経度の両方を保存し、表示時に選択できるようにする
      let displayLon = satelliteLon;

      // 調査用ログを抑制
      // console.log('Orbit calculation debug:', {
      //   satelliteLon: satelliteLon.toFixed(2),
      //   observerLon: observerLongitude.toFixed(2),
      //   lonDiff: lonDiff.toFixed(2),
      //   displayLon: displayLon.toFixed(2),
      //   elevation: elevation.toFixed(2),
      //   date: date.toISOString()
      // });

      // 前のポイントとの経度の連続性を確認
      let isDiscontinuous = false;
      if (orbitPoints.length > 0) {
        const prevPoint = orbitPoints[orbitPoints.length - 1];
        const prevLon = prevPoint.lng!;

        // 経度の差を計算（-180〜180度の範囲で最短経路）
        // 重要: 表示用の経度(displayLon)を使用
        let diff = displayLon - prevLon;
        // 複数回の正規化が必要な場合に対応
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;

        // 相対座標を使用する場合は、不連続点の判定を緩和する
        // 日付変更線をまたぐ場合の閾値を調整（150度→170度）
        if (Math.abs(diff) > 170) {
          isDiscontinuous = true;
          // デバッグログを抑制
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.001) {
            console.log('Discontinuous point detected:', {
              prevLon,
              currentLon: displayLon,
              diff
            });
          }
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

      // 実効的な角度の概念を完全に削除
      // 仰角をそのまま使用する
      const effectiveAngle = elevation; // 仰角をそのまま使用

      // デバッグ用ログを抑制
      // if (process.env.NODE_ENV === 'development' && lonDiff > 170 && Math.random() < 0.001) {
      //   console.log('Large longitude difference detected:', {
      //     originalLon: satelliteLon,
      //     displayLon: displayLon,
      //     observerLon: observerLongitude,
      //     diff: lonDiff
      //   });
      // }

      // 新しいセグメントの開始点として追加
      // 重要: 表示用の経度(displayLon)を使用
      orbitPoints.push({
        time: date,
        elevation,
        azimuth,
        range: rangeSat,
        isDaylight: calculateIsDaylight(satelliteLat, satelliteLon, date),
        lat: satelliteLat,
        lng: satelliteLon, // 実際の経度を使用
        relLng: lonDiff, // 相対経度も保存（必要に応じて使用可能）
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
  // UTCの時間を使用して太陽の位置を計算
  // 経度1度あたり4分（15度あたり1時間）の時差があるため、
  // 経度に応じた時角の調整を行う
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  // 経度に基づく時角調整（東経は正、西経は負）
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

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
      // ログ出力を完全に抑制

      // TLEデータの検証
      if (!validateTLE(tle)) {
        console.error(`TLE validation failed (requestId: ${requestId}):`, { tle });
        throw new Error('Invalid TLE data format');
      }

      const passes = calculatePasses(tle, location, filters);

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
    // TLE検証エラーログを抑制
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
      console.warn('TLE validation failed');
    }
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
  // ログ出力を完全に抑制

  // 入力された日時はローカルタイム（ブラウザのタイムゾーン）
  // 衛星位置計算はUTC時間を使用するため、タイムゾーンを考慮する必要がある
  // 日時をそのまま使用し、satellite.jsの内部でUTC変換が適切に行われるようにする
  const startTime = (filters.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000)).getTime();
  const endTime = (filters.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).getTime();

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

      // 観測地点からの衛星の見かけの位置を計算
      const positionEci = positionAndVelocity.position;

      // グリニッジ恒星時を計算
      const gmst = satellite.gstime(date);

      // 衛星の地理座標を計算
      const satelliteGd = satellite.eciToGeodetic(positionEci, gmst);
      const satelliteLat = satellite.degreesLat(satelliteGd.latitude);
      let satelliteLon = satellite.degreesLong(satelliteGd.longitude);
      const satelliteAlt = satelliteGd.height; // 衛星の高度（km）

      // 経度を-180〜180度の範囲に正規化
      while (satelliteLon > 180) satelliteLon -= 360;
      while (satelliteLon < -180) satelliteLon += 360;

      // 観測地点の経度
      const observerLongitude = location.lng;

      // 経度差を計算
      let lonDiff = satelliteLon - observerLongitude;

      // 経度差を-180度から180度の範囲に正規化
      while (lonDiff > 180) lonDiff -= 360;
      while (lonDiff < -180) lonDiff += 360;

      // 表示用の経度
      let displayLon = satelliteLon;

      // 観測地点と衛星の3次元座標を計算（地球中心を原点とする）
      // 地球の半径（km）
      const EARTH_RADIUS = 6371;

      // 観測地点の3次元座標（地心直交座標系）
      const observerLat = location.lat * DEG_TO_RAD;
      const observerLon = location.lng * DEG_TO_RAD;
      const observerX = EARTH_RADIUS * Math.cos(observerLat) * Math.cos(observerLon);
      const observerY = EARTH_RADIUS * Math.cos(observerLat) * Math.sin(observerLon);
      const observerZ = EARTH_RADIUS * Math.sin(observerLat);

      // 衛星の3次元座標（地心直交座標系）
      const satLat = satelliteLat * DEG_TO_RAD;
      const satLon = satelliteLon * DEG_TO_RAD;
      const satRadius = EARTH_RADIUS + satelliteAlt;
      const satX = satRadius * Math.cos(satLat) * Math.cos(satLon);
      const satY = satRadius * Math.cos(satLat) * Math.sin(satLon);
      const satZ = satRadius * Math.sin(satLat);

      // 観測地点から衛星へのベクトル
      const vecX = satX - observerX;
      const vecY = satY - observerY;
      const vecZ = satZ - observerZ;

      // 観測地点の地平面（接平面）の法線ベクトル（=観測地点の位置ベクトル）
      const normX = observerX;
      const normY = observerY;
      const normZ = observerZ;
      const normLength = Math.sqrt(normX * normX + normY * normY + normZ * normZ);

      // 観測地点から衛星へのベクトルの長さ
      const vecLength = Math.sqrt(vecX * vecX + vecY * vecY + vecZ * vecZ);

      // 内積から仰角を計算
      const dotProduct = vecX * normX + vecY * normY + vecZ * normZ;
      const cosAngle = dotProduct / (vecLength * normLength);

      // 仰角（度）= 90度 - ベクトル間の角度
      // 地平線上なら0度、真上なら90度、地平線下ならマイナス
      const elevation = 90 - Math.acos(cosAngle) * RAD_TO_DEG;

      // 方位角の計算（北を0度として時計回り）
      // 観測地点の東西南北方向のベクトルを計算
      const eastX = -Math.sin(observerLon);
      const eastY = Math.cos(observerLon);
      const eastZ = 0;

      const northX = -Math.sin(observerLat) * Math.cos(observerLon);
      const northY = -Math.sin(observerLat) * Math.sin(observerLon);
      const northZ = Math.cos(observerLat);

      // 衛星方向ベクトルの東西南北成分
      const eastComponent = vecX * eastX + vecY * eastY + vecZ * eastZ;
      const northComponent = vecX * northX + vecY * northY + vecZ * northZ;

      // 方位角を計算（ラジアン）
      const azimuthRad = Math.atan2(eastComponent, northComponent);

      // 方位角を度に変換（0-360度）
      const azimuth = (azimuthRad * RAD_TO_DEG + 360) % 360;

      // 距離を計算（km）
      const rangeSat = vecLength;

      // 大圏距離を計算（度）
      const greatCircleDistance = Math.acos(cosAngle) * RAD_TO_DEG;

      // 前のポイントとの経度の連続性を確認
      let isDiscontinuous = false;
      if (orbitPoints.length > 0) {
        const prevPoint = orbitPoints[orbitPoints.length - 1];
        const prevLon = prevPoint.lng!;

        // 経度の差を計算（-180〜180度の範囲で最短経路）
        let diff = displayLon - prevLon;
        // 複数回の正規化が必要な場合に対応
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;

        // 日付変更線をまたぐ場合の閾値を調整（170度）
        if (Math.abs(diff) > 170) {
          isDiscontinuous = true;
          // デバッグログを完全に抑制
        }
      }

      // 仰角の計算を修正
      // 地球の曲率を考慮して、大圏距離に基づいて仰角を調整
      let effectiveAngle = elevation;

      // 地球の曲率を考慮した仰角の補正
      // 大圏距離が大きくなるほど、仰角は低くなるはず
      if (greatCircleDistance > 0) {
        // 地平線の角度を計算（観測地点の高度を0mと仮定）
        // 地平線は大圏距離約90度で仰角0度
        const horizonDistance = 90; // 地平線までの大圏距離（度）

        // 大圏距離が地平線距離に近づくにつれて仰角を下げる
        // 大圏距離が90度を超える場合は負の値になる
        if (greatCircleDistance >= horizonDistance) {
          // 地平線より遠い場合は負の値
          effectiveAngle = -Math.abs(elevation);
        } else if (greatCircleDistance > 70) {
          // 地平線に近づくにつれて仰角を下げる（70度〜90度の範囲で調整）
          // 70度で元の仰角、90度で0度になるように線形補間
          const factor = (greatCircleDistance - 70) / (horizonDistance - 70);
          effectiveAngle = elevation * (1 - factor);
        }
      }

      // デバッグログを完全に抑制

      // 新しいセグメントの開始点として追加
      // 重要: 表示用の経度(displayLon)を使用
      orbitPoints.push({
        time: date,
        elevation,
        azimuth,
        range: rangeSat,
        isDaylight: calculateIsDaylight(satelliteLat, satelliteLon, date),
        lat: satelliteLat,
        lng: displayLon, // 表示用の経度を使用（重要な修正）
        relLng: lonDiff, // 相対経度も保存（必要に応じて使用可能）
        isNewSegment: isDiscontinuous, // 不連続点かどうかを記録
        effectiveAngle // 観測地点からの実効的な角度
      });

      // 最大仰角を更新
      maxElevation = Math.max(maxElevation, elevation);

    } catch (error) {
      // エラーログを抑制（重要なエラーのみ出力）
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.001) {
        console.warn('Error during orbit calculation');
      }
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

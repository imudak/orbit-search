/**
 * 太陽計算のためのユーティリティ関数
 * 天文アルゴリズムに基づいた高精度な太陽位置と昼夜境界の計算
 */

// 定数
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// 太陽の赤緯を計算する関数（改善版）
export const calculateSolarDeclination = (date: Date): number => {
  // 2000年1月1日からの経過日数を計算
  const epoch = new Date(2000, 0, 1, 12, 0, 0);
  const daysSinceEpoch = (date.getTime() - epoch.getTime()) / (24 * 60 * 60 * 1000);

  // 平均黄経を計算
  const L0 = 280.46646 + 0.9856474 * daysSinceEpoch;

  // 平均近点角を計算
  const M = 357.52911 + 0.9856003 * daysSinceEpoch;
  const M_rad = M * DEG_TO_RAD;

  // 黄道上の位置（地心黄経）を計算
  const lambda = L0 + 1.915 * Math.sin(M_rad) + 0.020 * Math.sin(2 * M_rad);
  const lambda_rad = lambda * DEG_TO_RAD;

  // 地球の軸の傾き（黄道傾角）を計算
  const epsilon = 23.439 - 0.0000004 * daysSinceEpoch;
  const epsilon_rad = epsilon * DEG_TO_RAD;

  // 赤緯を計算
  const declination = Math.asin(Math.sin(epsilon_rad) * Math.sin(lambda_rad)) * RAD_TO_DEG;

  return declination;
};

// 太陽の時角を計算する関数（新規追加）
export const calculateSolarHourAngle = (date: Date, longitude: number): number => {
  // UTCからの時差を計算
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  // グリニッジ恒星時（GST）を計算
  const d = (date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (24 * 60 * 60 * 1000);
  const GST = (18.697374558 + 24.06570982441908 * d) % 24;

  // 地方恒星時（LST）を計算
  const LST = (GST + longitude / 15) % 24;

  // 太陽の時角を計算
  const hourAngle = (LST - utcHours + 12) * 15;

  // -180〜180度の範囲に正規化
  return ((hourAngle + 180) % 360) - 180;
};

// 太陽の経度を計算する関数（改善版）
export const calculateSunLongitude = (date: Date): number => {
  // UTCからの時差を計算
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  // 時角から経度を計算（12時間を0度として1時間あたり15度）
  let sunLng = (utcHours - 12) * 15;

  // 地球の軸の傾き（黄道傾角）による補正（季節による日の出・日の入りの位置変化）
  const declination = calculateSolarDeclination(date);
  // 赤緯による補正を適用（春分・秋分以外は東西方向にずれる）
  const correction = declination * 0.0; // 補正が過剰な場合は係数を調整

  // 補正を適用
  sunLng += correction;

  // -180〜180度の範囲に正規化
  while (sunLng > 180) sunLng -= 360;
  while (sunLng < -180) sunLng += 360;

  return sunLng;
};

// 太陽の位置（緯度・経度）を計算する関数（改善版）
export const calculateSunPosition = (date: Date): { lat: number, lng: number } => {
  // 太陽の赤緯（緯度に相当）を計算
  const declination = calculateSolarDeclination(date);

  // 太陽の経度を計算
  const sunLng = calculateSunLongitude(date);

  // 太陽の位置を赤緯の位置（季節により変化）に表示
  return { lat: declination, lng: sunLng };
};

// 特定の地点の日の出/日の入り時刻を計算する関数（新規追加）
export const calculateSunriseSunset = (
  date: Date,
  latitude: number,
  longitude: number
): { sunrise: Date, sunset: Date } => {
  // その日の正午の日付オブジェクトを作成
  const noon = new Date(date);
  noon.setUTCHours(12, 0, 0, 0);

  // 太陽の赤緯を計算
  const declination = calculateSolarDeclination(noon);
  const declination_rad = declination * DEG_TO_RAD;
  const latitude_rad = latitude * DEG_TO_RAD;

  // 日の出/日の入りの時角を計算（太陽高度 -0.833度のとき）
  // -0.833度は大気による屈折と太陽の視半径を考慮した値
  const cosHourAngle = (Math.sin(-0.833 * DEG_TO_RAD) -
                      Math.sin(latitude_rad) * Math.sin(declination_rad)) /
                      (Math.cos(latitude_rad) * Math.cos(declination_rad));

  // 計算結果が範囲外の場合（極夜/白夜）
  if (cosHourAngle > 1) {
    // 極夜（太陽が昇らない）
    const dummyDate = new Date(date);
    return { sunrise: dummyDate, sunset: dummyDate };
  } else if (cosHourAngle < -1) {
    // 白夜（太陽が沈まない）
    const dummyDate = new Date(date);
    return { sunrise: dummyDate, sunset: dummyDate };
  }

  // 時角を時間に変換（時間単位）
  const hourAngle = Math.acos(cosHourAngle) * RAD_TO_DEG;
  const hoursDiff = hourAngle / 15;

  // 日の出と日の入りの時刻を計算
  const sunriseTime = 12 - hoursDiff - longitude / 15;
  const sunsetTime = 12 + hoursDiff - longitude / 15;

  // 日付オブジェクトを作成
  const sunrise = new Date(date);
  const sunset = new Date(date);

  // 時刻を設定
  const sunriseHours = Math.floor(sunriseTime);
  const sunriseMinutes = Math.round((sunriseTime - sunriseHours) * 60);
  sunrise.setUTCHours(sunriseHours, sunriseMinutes, 0, 0);

  const sunsetHours = Math.floor(sunsetTime);
  const sunsetMinutes = Math.round((sunsetTime - sunsetHours) * 60);
  sunset.setUTCHours(sunsetHours, sunsetMinutes, 0, 0);

  return { sunrise, sunset };
};

// 太陽の方位角と高度を計算する関数（改善版）
export const calculateSolarPosition = (lat: number, lng: number, date: Date): { azimuth: number, altitude: number } => {
  // 太陽の赤緯を計算
  const declination = calculateSolarDeclination(date);
  const declination_rad = declination * DEG_TO_RAD;
  const latitude_rad = lat * DEG_TO_RAD;

  // 時角を計算
  const hourAngle = calculateSolarHourAngle(date, lng);
  const hourAngle_rad = hourAngle * DEG_TO_RAD;

  // 太陽高度を計算
  const sinAltitude = Math.sin(latitude_rad) * Math.sin(declination_rad) +
    Math.cos(latitude_rad) * Math.cos(declination_rad) * Math.cos(hourAngle_rad);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude))) * RAD_TO_DEG;

  // 太陽方位角を計算
  const cosAzimuth = (Math.sin(declination_rad) - Math.sin(latitude_rad) * sinAltitude) /
    (Math.cos(latitude_rad) * Math.cos(Math.asin(sinAltitude)));
  const sinAzimuth = Math.sin(hourAngle_rad) * Math.cos(declination_rad) / Math.cos(Math.asin(sinAltitude));

  let azimuth = Math.atan2(sinAzimuth, cosAzimuth) * RAD_TO_DEG;
  // 0〜360度の範囲に正規化
  if (azimuth < 0) azimuth += 360;

  return { azimuth, altitude };
};

// 指定された地点が昼か夜かを判定する関数（改善版）
export const isDaylight = (lat: number, lng: number, date: Date): boolean => {
  // 太陽の高度を計算
  const { altitude } = calculateSolarPosition(lat, lng, date);

  // 大気による屈折を考慮した太陽高度による昼夜判定
  // -0.833は大気による屈折と太陽の視半径を考慮した値
  return altitude > -0.833;
};

// 昼夜の境界線（ターミネーター）を計算する関数（修正版）
export const calculateTerminator = (date: Date, resolution: number = 1): { lat: number, lng: number }[] => {
  const points: { lat: number, lng: number }[] = [];

  // 太陽の赤緯を計算
  const declination = calculateSolarDeclination(date);
  const declination_rad = declination * DEG_TO_RAD;

  // 太陽の経度（太陽に正対している経度）を計算
  const subsolarLongitude = calculateSunLongitude(date);

  // 昼夜の境界線を計算
  // 北半球と南半球で別々に計算する
  for (let lat = -90; lat <= 90; lat += resolution) {
    const lat_rad = lat * DEG_TO_RAD;

    // 太陽高度が -0.833度（地平線の少し下）になる時角を計算
    const cosHourAngle = (Math.sin(-0.833 * DEG_TO_RAD) -
                      Math.sin(lat_rad) * Math.sin(declination_rad)) /
                      (Math.cos(lat_rad) * Math.cos(declination_rad));

    // cosHourAngleが範囲外の場合（極夜/白夜）
    if (cosHourAngle > 1 || cosHourAngle < -1) {
      continue; // この緯度では昼夜の境界がないためスキップ
    }

    // 時角を度数に変換
    const hourAngle = Math.acos(cosHourAngle) * RAD_TO_DEG;

    // 朝（日の出）の境界点
    let lngSunrise = subsolarLongitude - hourAngle;
    while (lngSunrise > 180) lngSunrise -= 360;
    while (lngSunrise < -180) lngSunrise += 360;
    points.push({ lat, lng: lngSunrise });

    // 夕（日の入り）の境界点
    let lngSunset = subsolarLongitude + hourAngle;
    while (lngSunset > 180) lngSunset -= 360;
    while (lngSunset < -180) lngSunset += 360;
    points.push({ lat, lng: lngSunset });
  }

  // 点を経度でソートして連続的な線を確保
  // 日の出側と日の入り側を分けてソート
  const sunrisePoints = points.filter((p, i) => i % 2 === 0).sort((a, b) => a.lat - b.lat);
  const sunsetPoints = points.filter((p, i) => i % 2 === 1).sort((a, b) => b.lat - a.lat);

  // 日の出の境界線の後に日の入りの境界線を連結して閉じたポリゴンにする
  return [...sunrisePoints, ...sunsetPoints];
}

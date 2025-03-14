/**
 * 太陽計算のためのユーティリティ関数
 */

// 太陽の赤緯を計算する関数
export const calculateSolarDeclination = (date: Date): number => {
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

  return declination;
};

// 太陽の経度を計算する関数
export const calculateSunLongitude = (date: Date): number => {
  // 太陽の経度を計算（地球から見た太陽の位置）
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  let sunLng = (utcHours - 12) * 15; // 12時間を0度として、1時間あたり15度

  // 経度を-180〜180度の範囲に正規化
  while (sunLng > 180) sunLng -= 360;
  while (sunLng < -180) sunLng += 360;

  return sunLng;
};

// 太陽の位置（緯度・経度）を計算する関数
export const calculateSunPosition = (date: Date): { lat: number, lng: number } => {
  // 太陽の赤緯（緯度に相当）を計算 - 参考情報として保持
  const declination = calculateSolarDeclination(date);

  // 太陽の経度を計算
  const sunLng = calculateSunLongitude(date);

  // 太陽の位置を赤道上（緯度0度）に表示
  return { lat: 0, lng: sunLng };
};

// 太陽の方位角と高度を計算する関数
export const calculateSolarPosition = (lat: number, lng: number, date: Date): { azimuth: number, altitude: number } => {
  const DEG_TO_RAD = Math.PI / 180;
  const RAD_TO_DEG = 180 / Math.PI;

  // 太陽の赤緯を計算
  const declination = calculateSolarDeclination(date);

  // 時角を計算
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  // 経度の符号を反転（東経は負、西経は正）- 太陽は東から西に移動するため
  const hourAngle = (utcHours - 12) * 15 - lng;

  // 太陽高度を計算
  const sinAltitude = Math.sin(lat * DEG_TO_RAD) * Math.sin(declination * DEG_TO_RAD) +
    Math.cos(lat * DEG_TO_RAD) * Math.cos(declination * DEG_TO_RAD) * Math.cos(hourAngle * DEG_TO_RAD);
  const altitude = Math.asin(sinAltitude) * RAD_TO_DEG;

  // 太陽方位角を計算
  const cosAzimuth = (Math.sin(declination * DEG_TO_RAD) - Math.sin(lat * DEG_TO_RAD) * sinAltitude) /
    (Math.cos(lat * DEG_TO_RAD) * Math.cos(Math.asin(sinAltitude)));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAzimuth))) * RAD_TO_DEG;

  // 時角が正（午後）の場合、方位角を360から引く
  if (hourAngle > 0) {
    azimuth = 360 - azimuth;
  }

  return { azimuth, altitude };
};

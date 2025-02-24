/**
 * 衛星の可視性判定に関するサービス
 */

/**
 * 衛星の軌道高度から概算の可視範囲（度）を計算
 */
const calculateVisibilityRadius = (inclination: number, heightKm: number): number => {
  // 地球の半径（km）
  const EARTH_RADIUS = 6371;

  // 最小仰角（10度）でかつ大気減衰を考慮した可視範囲を計算
  const MIN_ELEVATION = 10;
  const ATMOSPHERIC_REFRACTION = 0.25; // 大気による屈折の補正値（度）

  // 衛星の地平線からの見かけの角度を計算
  const horizonAngle = Math.acos(EARTH_RADIUS / (EARTH_RADIUS + heightKm));
  // 最小仰角での中心角を計算（大気の屈折を考慮）
  const centralAngle = Math.acos(EARTH_RADIUS / (EARTH_RADIUS + heightKm) *
    Math.cos((MIN_ELEVATION - ATMOSPHERIC_REFRACTION) * Math.PI / 180)) -
    ((MIN_ELEVATION - ATMOSPHERIC_REFRACTION) * Math.PI / 180);

  // 可視範囲を度に変換
  return centralAngle * 180 / Math.PI;
};

/**
 * TLEデータから軌道傾斜角と高度を抽出
 */
const extractOrbitalElements = (line2: string): { inclination: number; heightKm: number } => {
  const inclination = parseFloat(line2.substring(8, 16));
  const meanMotion = parseFloat(line2.substring(52, 63));
  // ケプラーの第三法則から概算高度を計算
  const heightKm = Math.pow(331.25 / meanMotion, 2/3) * 42241 - 6371;
  return { inclination, heightKm };
};

/**
 * 観測地点から衛星が可視圏内かどうかを判定
 */
const isInVisibilityRange = (
  observerLat: number,
  observerLng: number,
  orbitalElements: { inclination: number; heightKm: number }
): boolean => {
  const visibilityRadius = calculateVisibilityRadius(orbitalElements.inclination, orbitalElements.heightKm);
  const absLat = Math.abs(observerLat);

  // 最大可視緯度を計算（軌道傾斜角 + 可視範囲）
  const maxVisibleLat = orbitalElements.inclination + visibilityRadius;

  // 1. 観測地点の緯度が最大可視緯度を超えている場合は不可視
  if (absLat > maxVisibleLat) {
    console.log(`Satellite not visible: observer latitude ${absLat}° exceeds maximum visible latitude ${maxVisibleLat}°`);
    return false;
  }

  // 2. 極軌道に近い衛星（高傾斜角）は全経度で可視と判定
  if (orbitalElements.inclination > 80) {
    console.log('Satellite is in near-polar orbit, visible from all longitudes');
    return true;
  }

  // 3. それ以外の場合は可視と判定（経度による詳細な判定は軌道計算時に行う）
  console.log('Satellite potentially visible, final visibility will be determined by orbit calculation');
  return true;
};

export const visibilityService = {
  calculateVisibilityRadius,
  extractOrbitalElements,
  isInVisibilityRange
};

import type { CelesTrakGPData } from '@/types';

interface GPDataItem {
  NORAD_CAT_ID: string;
  OBJECT_ID: string;
  OBJECT_NAME: string;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  MEAN_MOTION_DOT: number;
  MEAN_MOTION_DDOT: number;
  BSTAR: number;
  ELEMENT_SET_NO: number;
}

/**
 * TLEデータのバリデーション
 */
const isValidTLE = (line1: string, line2: string): boolean => {
  if (!line1 || !line2) {
    return false;
  }

  if (line1[0] !== '1' || line2[0] !== '2') {
    return false;
  }

  const noradMatch1 = line1.match(/^\d+\s+(\d+)/);
  const noradMatch2 = line2.match(/^\d+\s+(\d+)/);

  if (!noradMatch1 || !noradMatch2) {
    return false;
  }

  return true;
};

/**
 * テキスト形式のTLEデータをパース
 */
const parseTLEText = (text: string): CelesTrakGPData[] => {
  const lines = text.trim().split('\n');
  const satellites: CelesTrakGPData[] = [];

  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 >= lines.length) {
      break;
    }

    const name = lines[i].trim();
    const line1 = lines[i + 1].trim();
    const line2 = lines[i + 2].trim();

    if (!name || !line1 || !line2) {
      continue;
    }

    if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) {
      continue;
    }

    satellites.push({
      OBJECT_NAME: name,
      OBJECT_ID: line1.substring(2, 7),
      NORAD_CAT_ID: line1.substring(2, 7),
      OBJECT_TYPE: 'PAYLOAD',
      OPERATIONAL_STATUS: 'UNKNOWN',
      TLE_LINE1: line1,
      TLE_LINE2: line2
    });
  }

  return satellites;
};

/**
 * JSONレスポンスからTLEデータを生成
 */
const generateTLEFromJSON = (data: GPDataItem): Pick<CelesTrakGPData, 'TLE_LINE1' | 'TLE_LINE2'> => {
  try {
    // TLE形式のチェックサム計算
    const calculateChecksum = (line: string): number => {
      return line
        .split('')
        .reduce((sum, char) => {
          if (char === '-') return sum + 1;
          if (char >= '0' && char <= '9') return sum + parseInt(char);
          return sum;
        }, 0) % 10;
    };

    // 年間通日を計算
    const epochDate = new Date(data.EPOCH);
    const yearStart = new Date(data.EPOCH.substring(0, 4));
    const dayOfYear = Math.floor((epochDate.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const fractionalDay = (epochDate.getTime() % (24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000);

    // NORAD_CAT_IDを文字列に変換
    const noradId = String(data.NORAD_CAT_ID);

    // TLE Line 1の生成（スペースで区切る）
    let line1 = `1 ${noradId.padStart(5, '0')}U ${data.OBJECT_ID.padEnd(8, ' ')} ${data.EPOCH.substring(2, 4)}${dayOfYear.toString().padStart(3, '0')}.${fractionalDay.toFixed(8).substring(1)} ${data.MEAN_MOTION_DOT.toExponential(8).replace('e-', '-').replace('e+', '+')} ${data.MEAN_MOTION_DDOT.toExponential(5).replace('e-', '-').replace('e+', '+')} ${data.BSTAR.toExponential(5).replace('e-', '-').replace('e+', '+')} 0 ${data.ELEMENT_SET_NO.toString().padStart(4, ' ')}`;

    // TLE Line 2の生成（スペースで区切る）
    let line2 = `2 ${noradId.padStart(5, '0')} ${data.INCLINATION.toFixed(4)} ${data.RA_OF_ASC_NODE.toFixed(4)} ${data.ECCENTRICITY.toFixed(7).substring(2)} ${data.ARG_OF_PERICENTER.toFixed(4)} ${data.MEAN_ANOMALY.toFixed(4)} ${data.MEAN_MOTION.toFixed(8)} ${data.ELEMENT_SET_NO.toString().padStart(5, '0')}`;

    // チェックサムの計算と追加
    const checksum1 = calculateChecksum(line1);
    const checksum2 = calculateChecksum(line2);
    line1 = `${line1}${checksum1}`;
    line2 = `${line2}${checksum2}`;

    // バリデーション
    if (!isValidTLE(line1, line2)) {
      throw new Error('Generated TLE data failed validation');
    }

    return { TLE_LINE1: line1, TLE_LINE2: line2 };

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw new Error(`Failed to generate TLE for satellite ${data.NORAD_CAT_ID}: ${error.message}`);
  }
};

/**
 * TLEデータから衛星の軌道高度を計算
 * @param tle TLEデータ
 * @returns 軌道高度（km）、計算できない場合は-1
 */
const calculateOrbitHeight = (tle: { line1: string, line2: string }): number => {
  try {
    // TLEの2行目から必要なパラメータを抽出
    const line2 = tle.line2;

    // 平均運動（1日あたりの周回数）を取得（53-63文字目）
    const meanMotion = parseFloat(line2.substring(52, 63).trim());
    if (isNaN(meanMotion) || meanMotion <= 0) {
      console.warn('Invalid mean motion value:', meanMotion);
      return -1;
    }

    // 離心率を取得（26-33文字目）- 先頭に小数点を追加
    const eccentricity = parseFloat(`0.${line2.substring(26, 33).trim()}`);
    if (isNaN(eccentricity) || eccentricity < 0 || eccentricity >= 1) {
      console.warn('Invalid eccentricity value:', eccentricity);
      return -1;
    }

    // 地球の重力定数（km^3/s^2）
    const GM = 398600.4418;

    // 地球の半径（km）
    const EARTH_RADIUS = 6371.0;

    // 平均運動から軌道周期を計算（秒）
    const period = (24 * 60 * 60) / meanMotion;

    // ケプラーの第三法則から半長軸を計算（km）
    const semiMajorAxis = Math.cbrt((GM * Math.pow(period, 2)) / (4 * Math.pow(Math.PI, 2)));

    // 近地点距離（km）
    const perigee = semiMajorAxis * (1 - eccentricity) - EARTH_RADIUS;

    // 遠地点距離（km）
    const apogee = semiMajorAxis * (1 + eccentricity) - EARTH_RADIUS;

    // 平均軌道高度を計算（km）
    const meanHeight = (perigee + apogee) / 2;

    // 高度が負の値になる場合は計算エラー
    if (meanHeight < 0) {
      console.warn('Calculated negative orbit height:', meanHeight);
      return -1;
    }

    return meanHeight;
  } catch (error) {
    console.error('Error calculating orbit height:', error);
    return -1;
  }
};

/**
 * 軌道高度から軌道種類を判定
 * @param height 軌道高度（km）
 * @returns 軌道種類（LEO, MEO, GEO, HEO）
 */
const getOrbitTypeFromHeight = (height: number): string => {
  if (height < 0) return 'UNKNOWN';
  if (height < 2000) return 'LEO';  // 低軌道
  if (height < 35000) return 'MEO'; // 中軌道
  if (height >= 35000 && height <= 36000) return 'GEO'; // 静止軌道
  return 'HEO'; // 高楕円軌道など
};

export const tleParserService = {
  isValidTLE,
  parseTLEText,
  generateTLEFromJSON,
  calculateOrbitHeight,
  getOrbitTypeFromHeight
};

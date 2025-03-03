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

export const tleParserService = {
  isValidTLE,
  parseTLEText,
  generateTLEFromJSON
};

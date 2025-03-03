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
    console.log('TLE validation failed: missing line1 or line2');
    return false;
  }

  if (line1[0] !== '1' || line2[0] !== '2') {
    console.log('TLE validation failed: invalid line numbers');
    return false;
  }

  const noradMatch1 = line1.match(/^\d+\s+(\d+)/);
  const noradMatch2 = line2.match(/^\d+\s+(\d+)/);

  if (!noradMatch1 || !noradMatch2) {
    console.log('TLE validation failed: missing NORAD ID');
    return false;
  }

  return true;
};

/**
 * テキスト形式のTLEデータをパース
 */
const parseTLEText = (text: string): CelesTrakGPData[] => {
  console.log('Parsing TLE text:', {
    length: text.length,
    sample: text.substring(0, 100)
  });

  const lines = text.trim().split('\n');
  console.log('Number of lines:', lines.length);

  const satellites: CelesTrakGPData[] = [];

  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 >= lines.length) {
      console.log('Reached end of lines at index:', i);
      break;
    }

    const name = lines[i].trim();
    const line1 = lines[i + 1].trim();
    const line2 = lines[i + 2].trim();

    if (!name || !line1 || !line2) {
      console.warn('Invalid TLE format at index:', i, { name, line1, line2 });
      continue;
    }

    if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) {
      console.warn('Invalid TLE line format at index:', i, { line1, line2 });
      continue;
    }

    console.log('Parsing satellite:', name);
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

  console.log('Parsed satellites count:', satellites.length);
  return satellites;
};

/**
 * JSONレスポンスからTLEデータを生成
 */
const generateTLEFromJSON = (data: GPDataItem): Pick<CelesTrakGPData, 'TLE_LINE1' | 'TLE_LINE2'> => {
  console.log('Generating TLE from JSON data:', {
    name: data.OBJECT_NAME,
    noradId: data.NORAD_CAT_ID,
    epoch: data.EPOCH
  });

  try {
    // 年間通日を計算
    const epochDate = new Date(data.EPOCH);
    const yearStart = new Date(data.EPOCH.substring(0, 4));
    const dayOfYear = Math.floor((epochDate.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000));
    const fractionalDay = (epochDate.getTime() % (24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000);

    // TLE Line 1
    const line1 = [
      '1',
      data.NORAD_CAT_ID.padStart(5, '0'),
      'U',
      data.OBJECT_ID.padEnd(8, ' '),
      data.EPOCH.substring(2, 4),
      dayOfYear.toString().padStart(3, '0'),
      fractionalDay.toFixed(8).substring(1),
      data.MEAN_MOTION_DOT.toExponential(8).replace('e-', '-').replace('e+', '+'),
      data.MEAN_MOTION_DDOT.toExponential(8).replace('e-', '-').replace('e+', '+'),
      data.BSTAR.toExponential(8).replace('e-', '-').replace('e+', '+'),
      '0',
      data.ELEMENT_SET_NO.toString().padStart(4, ' ')
    ].join('');

    // TLE Line 2
    const line2 = [
      '2',
      data.NORAD_CAT_ID.padStart(5, '0'),
      data.INCLINATION.toFixed(4),
      data.RA_OF_ASC_NODE.toFixed(4),
      data.ECCENTRICITY.toFixed(7).substring(2),
      data.ARG_OF_PERICENTER.toFixed(4),
      data.MEAN_ANOMALY.toFixed(4),
      data.MEAN_MOTION.toFixed(8),
      data.ELEMENT_SET_NO.toString().padStart(5, ' ')
    ].join(' ');

    console.log('Generated TLE:', { line1, line2 });
    return { TLE_LINE1: line1, TLE_LINE2: line2 };

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Failed to generate TLE:', error);
    throw new Error(`Failed to generate TLE for satellite ${data.NORAD_CAT_ID}: ${error.message}`);
  }
};

export const tleParserService = {
  isValidTLE,
  parseTLEText,
  generateTLEFromJSON
};

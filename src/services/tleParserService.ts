import type { CelesTrakGPData } from '@/types';

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
  console.log('Parsing TLE text, length:', text.length);
  console.log('First 100 characters:', text.substring(0, 100));

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

  return satellites;
};

/**
 * JSONレスポンスからTLEデータを生成
 */
const generateTLEFromJSON = (item: any): Pick<CelesTrakGPData, 'TLE_LINE1' | 'TLE_LINE2'> => {
  // TLE Line 1のフォーマット
  const line1 = `1 ${item.NORAD_CAT_ID.toString().padStart(5, '0')}U ${item.OBJECT_ID.padEnd(8, ' ')} ${
    item.EPOCH.substring(2, 4) // 年
  }${Math.floor((new Date(item.EPOCH).getTime() - new Date(item.EPOCH.substring(0, 4)).getTime()) / (24 * 60 * 60 * 1000)).toString().padStart(3, '0')}` +
  `.${((new Date(item.EPOCH).getTime() % (24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000)).toFixed(8).substring(2)} ` +
  `${item.MEAN_MOTION_DOT.toExponential(8).replace('e-', '-').replace('e+', '+')} ` +
  `${item.MEAN_MOTION_DDOT.toExponential(8).replace('e-', '-').replace('e+', '+')} ` +
  `${item.BSTAR.toExponential(8).replace('e-', '-').replace('e+', '+')} 0 ${item.ELEMENT_SET_NO.toString().padStart(4, ' ')}`;

  // TLE Line 2のフォーマット
  const line2 = `2 ${item.NORAD_CAT_ID.toString().padStart(5, '0')} ${item.INCLINATION.toFixed(4)} ${
    item.RA_OF_ASC_NODE.toFixed(4)} ${item.ECCENTRICITY.toFixed(7).substring(2)} ${
    item.ARG_OF_PERICENTER.toFixed(4)} ${item.MEAN_ANOMALY.toFixed(4)} ${
    item.MEAN_MOTION.toFixed(8)} ${item.REV_AT_EPOCH.toString().padStart(5, ' ')}`;

  return { TLE_LINE1: line1, TLE_LINE2: line2 };
};

export const tleParserService = {
  isValidTLE,
  parseTLEText,
  generateTLEFromJSON
};

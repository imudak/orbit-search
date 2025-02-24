import type { SearchFilters, Satellite, Pass } from '@/types';
import { celestrakApi } from '@/utils/api';
import { tleService } from './tleService';
import { orbitService } from './orbitService';

interface SearchSatellitesParams extends SearchFilters {
  latitude: number;
  longitude: number;
}

interface SatelliteResponse extends Satellite {
  passes: Array<Pass>;
}

interface CelesTrakGPData {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  NORAD_CAT_ID: string;
  OBJECT_TYPE: string;
  OPERATIONAL_STATUS: string;
  TLE_LINE1: string;
  TLE_LINE2: string;
}

const MAX_SATELLITES = 100; // 一度に処理する最大衛星数
const RATE_LIMIT_DELAY = 1000; // APIリクエスト間の遅延（ミリ秒）

// モック衛星データ（開発用）
const mockSatellites: SatelliteResponse[] = [
  {
    id: '1',
    name: 'ISS (ZARYA)',
    noradId: '25544',
    type: 'PAYLOAD',
    operationalStatus: 'OPERATIONAL',
    tle: {
      line1: '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927',
      line2: '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537',
      timestamp: new Date().toISOString()
    },
    passes: [
      {
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        maxElevation: 45,
        isDaylight: true,
        points: []
      }
    ]
  },
  {
    id: '2',
    name: 'STARLINK-1007',
    noradId: '45197',
    type: 'PAYLOAD',
    operationalStatus: 'OPERATIONAL',
    tle: {
      line1: '1 45197U 20019G   24052.17517593  .00002683  00000+0  17330-3 0  9992',
      line2: '2 45197  53.0533 157.6667 0001419  75.4368 284.6793 15.06395718225856',
      timestamp: new Date().toISOString()
    },
    passes: [
      {
        startTime: new Date(),
        endTime: new Date(Date.now() + 7200000),
        maxElevation: 60,
        isDaylight: false,
        points: []
      }
    ]
  }
];

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

/**
 * CelesTrakのGPデータを内部の衛星型に変換
 */
const convertGPDataToSatellite = (gpData: CelesTrakGPData): Satellite | null => {
  if (!isValidTLE(gpData.TLE_LINE1, gpData.TLE_LINE2)) {
    console.warn(`Invalid TLE data for satellite ${gpData.NORAD_CAT_ID}`);
    return null;
  }

  return {
    id: gpData.OBJECT_ID,
    name: gpData.OBJECT_NAME,
    noradId: gpData.NORAD_CAT_ID,
    type: gpData.OBJECT_TYPE,
    operationalStatus: gpData.OPERATIONAL_STATUS,
    tle: {
      line1: gpData.TLE_LINE1,
      line2: gpData.TLE_LINE2,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * オフラインモードかどうかを判定
 */
const isOfflineMode = (): boolean => {
  return import.meta.env.VITE_USE_MOCK_DATA === 'true' || import.meta.env.VITE_OFFLINE_MODE === 'true';
};

/**
 * TLEテキストデータをパース
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
 * 指定された位置とフィルター条件に基づいて衛星を検索します
 */
export const searchSatellites = async (params: SearchSatellitesParams): Promise<SatelliteResponse[]> => {
  try {
    console.log('Searching satellites with params:', params);

    if (isOfflineMode()) {
      console.log('Using mock data (offline mode or mock data enabled)');
      return mockSatellites;
    }

    const endpoints = [
      { url: '/NORAD/elements/visual.txt', format: 'txt' },
      { url: '/NORAD/elements/gp.php', format: 'json' }
    ];

    const observerLat = params.latitude;
    const observerLng = params.longitude;

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint.url}`);
        const requestConfig = {
          params: endpoint.format === 'txt' ? undefined : {
            GROUP: 'visual',
            FORMAT: endpoint.format
          }
        };

        const response = await celestrakApi.get(endpoint.url, requestConfig);
        console.log(`Response from ${endpoint.url}:`, {
          status: response.status,
          contentType: response.headers['content-type'],
          dataType: typeof response.data,
          dataLength: typeof response.data === 'string' ? response.data.length : Array.isArray(response.data) ? response.data.length : 0
        });

        let satelliteData: CelesTrakGPData[];

        if (endpoint.format === 'txt') {
          if (typeof response.data !== 'string') {
            console.warn('Expected text response but got:', typeof response.data);
            continue;
          }
          satelliteData = parseTLEText(response.data);
          console.log('Parsed TLE data:', {
            count: satelliteData.length,
            sample: satelliteData[0]
          });
        } else {
          if (!Array.isArray(response.data)) {
            console.warn('Expected array response but got:', typeof response.data);
            continue;
          }
          satelliteData = response.data.map(item => {
            const line1 = `1 ${item.NORAD_CAT_ID.toString().padStart(5, '0')}U ${item.OBJECT_ID.padEnd(8, ' ')} ${
              item.EPOCH.substring(2, 4)
            }${Math.floor((new Date(item.EPOCH).getTime() - new Date(item.EPOCH.substring(0, 4)).getTime()) / (24 * 60 * 60 * 1000)).toString().padStart(3, '0')}` +
            `.${((new Date(item.EPOCH).getTime() % (24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000)).toFixed(8).substring(2)} ` +
            `${item.MEAN_MOTION_DOT.toExponential(8).replace('e-', '-').replace('e+', '+')} ` +
            `${item.MEAN_MOTION_DDOT.toExponential(8).replace('e-', '-').replace('e+', '+')} ` +
            `${item.BSTAR.toExponential(8).replace('e-', '-').replace('e+', '+')} 0 ${item.ELEMENT_SET_NO.toString().padStart(4, ' ')}`;

            const line2 = `2 ${item.NORAD_CAT_ID.toString().padStart(5, '0')} ${item.INCLINATION.toFixed(4)} ${
              item.RA_OF_ASC_NODE.toFixed(4)} ${item.ECCENTRICITY.toFixed(7).substring(2)} ${
              item.ARG_OF_PERICENTER.toFixed(4)} ${item.MEAN_ANOMALY.toFixed(4)} ${
              item.MEAN_MOTION.toFixed(8)} ${item.REV_AT_EPOCH.toString().padStart(5, ' ')}`;

            return {
              ...item,
              TLE_LINE1: line1,
              TLE_LINE2: line2
            };
          });
        }

        console.log('Received satellite data:', satelliteData.length, 'satellites');

        // 観測地点からの可視性に基づいてフィルタリング
        console.log('Calculating visibility for location:', { lat: observerLat, lng: observerLng });

        const filteredData = satelliteData.filter(data => {
          const orbitalElements = extractOrbitalElements(data.TLE_LINE2);
          console.log('Orbital elements for satellite', data.OBJECT_NAME, ':', {
            ...orbitalElements,
            visibilityRadius: calculateVisibilityRadius(orbitalElements.inclination, orbitalElements.heightKm)
          });

          const isVisible = isInVisibilityRange(observerLat, observerLng, orbitalElements);
          if (isVisible) {
            console.log('Satellite is visible:', data.OBJECT_NAME);
          }
          return isVisible;
        });

        console.log('Visibility filtering results:', {
          total: satelliteData.length,
          visible: filteredData.length,
          location: { lat: observerLat, lng: observerLng }
        });

        // 衛星データを変換（一度に処理する数を制限）
        const satellites = filteredData
          .slice(0, MAX_SATELLITES)
          .map(convertGPDataToSatellite)
          .filter((satellite): satellite is Satellite => satellite !== null);

        // 可視パスを計算
        const loc = { lat: observerLat, lng: observerLng };
        const results = await Promise.all(
          satellites.map(async (satellite, index) => {
            if (index > 0) {
              await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
            }

            try {
              const passes = await orbitService.calculatePasses(
                satellite.tle,
                loc,
                params
              );

              return {
                ...satellite,
                passes
              };
            } catch (error) {
              console.error(`Failed to calculate passes for satellite ${satellite.noradId}:`, error);
              return {
                ...satellite,
                passes: []
              };
            }
          })
        );

        // パスフィルタリングと並び替え
        return results
          .filter(satellite =>
            satellite.passes.length > 0 &&
            satellite.passes.some(pass => pass.maxElevation >= params.minElevation)
          )
          .sort((a, b) => {
            const maxElevA = Math.max(...a.passes.map(p => p.maxElevation));
            const maxElevB = Math.max(...b.passes.map(p => p.maxElevation));
            return maxElevB - maxElevA;
          });

      } catch (error) {
        console.warn(`Failed to fetch data from ${endpoint}:`, error);
        continue;
      }
    }

    // すべてのエンドポイントが失敗した場合
    console.warn('All endpoints failed, falling back to mock data');
    return mockSatellites;

  } catch (error) {
    console.error('Satellite search failed:', error);
    throw error;
  }
};

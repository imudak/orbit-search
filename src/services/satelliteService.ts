import type { SearchFilters, Satellite, Pass, CelesTrakGPData, EphemerisData } from '@/types';
import { celestrakApi } from '@/utils/api';
import { orbitService } from './orbitService';
import { tleParserService } from './tleParserService';
import { visibilityService } from './visibilityService';
import { cacheService } from './cacheService';

interface SearchSatellitesParams extends SearchFilters {
  latitude: number;
  longitude: number;
}

interface SatelliteResponse extends Satellite {
  passes: Array<Pass>;
}

class SatelliteService {
  private readonly MAX_SATELLITES = 200; // 一度に処理する最大衛星数
  private readonly RATE_LIMIT_DELAY = 100; // APIリクエスト間の遅延（ミリ秒）

  // モック衛星データ（開発用）
  private readonly mockSatellites: SatelliteResponse[] = [
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
      orbitHeight: 420, // 国際宇宙ステーションの平均軌道高度
      orbitType: 'LEO', // 低軌道
      passes: [
        {
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          maxElevation: 45,
          isDaylight: true,
          points: []
        }
      ]
    }
  ];

  /**
   * 衛星のEphemerisデータを取得
   */
  async getEphemerisData(noradId: string, startTime: Date, duration: number = 86400): Promise<EphemerisData> {
    try {
      console.log(`Fetching ephemeris data for satellite ${noradId}`);

      // キャッシュキーの生成（衛星ID + 開始時刻 + 期間）
      const cacheKey = `ephemeris_${noradId}_${startTime.toISOString()}_${duration}`;

      // キャッシュをチェック
      const cached = await cacheService.get<EphemerisData>(cacheKey);
      if (cached) {
        console.log(`Using cached ephemeris data for satellite ${noradId}`);
        return cached;
      }

      // CelesTrakのEphemerisエンドポイントにリクエスト（Ascii text形式）
      // Ephemerisデータ取得用のパラメータ設定
      const stopTime = new Date(startTime.getTime() + duration * 1000);
      const params = new URLSearchParams({
        CATNR: noradId,
        FORMAT: 'STATE',    // 状態ベクトル形式
        EPHEM: '1',
        REF_FRAME_TOD: '1', // True of Date座標系
        START_TIME: startTime.toISOString().split('.')[0] + 'Z', // マイクロ秒を除去
        STOP_TIME: stopTime.toISOString().split('.')[0] + 'Z',
        STEP_SIZE: '60',    // 60秒間隔
      });

      console.log('Request params:', Object.fromEntries(params.entries()));
      console.log('Time range:', {
        start: startTime.toISOString(),
        stop: stopTime.toISOString(),
        duration: duration
      });

      // URLを構築してフェッチ
      const { data } = await celestrakApi.get<string>(`/NORAD/elements/gp.php?${params}`, {
        responseType: 'text',
        headers: {
          'Accept': 'text/plain',
          'Content-Type': 'text/plain'
        }
      });

      // デバッグログ（最初の1000文字のみ表示）
      console.log('Received Ephemeris data (first 1000 chars):', data.substring(0, 1000));

      if (!data) {
        throw new Error('Empty response from CelesTrak API');
      }

      // テキストデータをそのまま保持
      const ephemerisData: EphemerisData = {
        epoch: startTime.toISOString(),
        data,
        duration,
        frame: 'TOD'
      };

      // データをキャッシュ（1時間有効）
      await cacheService.set(cacheKey, ephemerisData, 3600);

      console.log(`Successfully fetched ephemeris data for satellite ${noradId}`);
      return ephemerisData;

    } catch (error) {
      console.error(`Failed to fetch ephemeris data for satellite ${noradId}:`, error);
      throw new Error(`Failed to fetch ephemeris data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * キャッシュからTLEデータを取得
   */
  private async getCachedSatellite(noradId: string): Promise<Satellite | null> {
    const cachedTLE = await cacheService.getCachedTLE(noradId);
    if (!cachedTLE) {
      return null;
    }

    // TLEデータから軌道高度を計算
    const orbitHeight = tleParserService.calculateOrbitHeight(cachedTLE);

    // 軌道高度から軌道種類を判定
    const orbitType = tleParserService.getOrbitTypeFromHeight(orbitHeight);

    return {
      id: noradId,
      name: `NORAD ID: ${noradId}`,
      noradId,
      type: 'UNKNOWN',
      operationalStatus: 'UNKNOWN',
      tle: cachedTLE,
      orbitHeight,
      orbitType
    };
  }

  /**
   * CelesTrakのGPデータを内部の衛星型に変換してキャッシュ
   */
  private async convertGPDataToSatellite(gpData: CelesTrakGPData): Promise<Satellite | null> {
    try {
      console.log(`Converting GP data to satellite for NORAD ID: ${gpData.NORAD_CAT_ID}`);

      if (!tleParserService.isValidTLE(gpData.TLE_LINE1, gpData.TLE_LINE2)) {
        console.warn(`Invalid TLE data for satellite ${gpData.NORAD_CAT_ID}:`, {
          line1: gpData.TLE_LINE1,
          line2: gpData.TLE_LINE2
        });
        return null;
      }

      const tle = {
        line1: gpData.TLE_LINE1,
        line2: gpData.TLE_LINE2,
        timestamp: new Date().toISOString()
      };

      // TLEデータをキャッシュ
      console.log(`Caching TLE data for NORAD ID: ${gpData.NORAD_CAT_ID}`);
      await cacheService.cacheTLE(gpData.NORAD_CAT_ID, tle);

      // TLEデータから軌道高度を計算
      const orbitHeight = tleParserService.calculateOrbitHeight({
        line1: gpData.TLE_LINE1,
        line2: gpData.TLE_LINE2
      });

      // 軌道高度から軌道種類を判定
      const orbitType = tleParserService.getOrbitTypeFromHeight(orbitHeight);

      const satellite = {
        id: gpData.OBJECT_ID,
        name: gpData.OBJECT_NAME,
        noradId: gpData.NORAD_CAT_ID,
        type: gpData.OBJECT_TYPE,
        operationalStatus: gpData.OPERATIONAL_STATUS,
        tle,
        orbitHeight,
        orbitType
      };

      return satellite;
    } catch (error) {
      console.error(`Failed to convert GP data to satellite for NORAD ID: ${gpData.NORAD_CAT_ID}:`, error);
      return null;
    }
  }

  /**
   * オフラインモードかどうかを判定
   */
  private isOfflineMode(): boolean {
    // テスト環境ではNode.jsのprocess.envを使用し、ブラウザ環境ではimport.meta.envを使用
    if (typeof process !== 'undefined' && process.env) {
      return process.env.VITE_USE_MOCK_DATA === 'true' || process.env.VITE_OFFLINE_MODE === 'true';
    }

    // ブラウザ環境
    try {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.__VITE_ENV__) {
        // @ts-ignore
        return window.__VITE_ENV__.VITE_USE_MOCK_DATA === 'true' || window.__VITE_ENV__.VITE_OFFLINE_MODE === 'true';
      }
    } catch (e) {
      // エラーが発生した場合はオフラインモードではない
    }

    return false;
  }

  /**
   * 指定された位置とフィルター条件に基づいて衛星を検索
   */
  async searchSatellites(params: SearchSatellitesParams): Promise<SatelliteResponse[]> {
    try {
      console.log('Searching satellites with params:', params);

      if (this.isOfflineMode()) {
        console.log('Using mock data (offline mode or mock data enabled)');
        return this.mockSatellites;
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
            params: endpoint.format === 'txt' ? {
              _: Date.now() // キャッシュ回避用のタイムスタンプ
            } : {
              GROUP: 'visual',
              FORMAT: 'json',
              _: Date.now() // キャッシュ回避用のタイムスタンプ
            },
            headers: {}
          };

          const response = await celestrakApi.get(endpoint.url, requestConfig);
          let satelliteData: CelesTrakGPData[];

          if (endpoint.format === 'txt') {
            if (typeof response.data !== 'string') {
              console.warn('Expected text response but got:', typeof response.data);
              continue;
            }
            satelliteData = tleParserService.parseTLEText(response.data);
          } else {
            if (!Array.isArray(response.data)) {
              console.warn('Expected array response but got:', typeof response.data);
              continue;
            }
            satelliteData = response.data.map(item => {
              try {
                const tleData = tleParserService.generateTLEFromJSON(item);
                return {
                  OBJECT_NAME: item.OBJECT_NAME,
                  OBJECT_ID: item.OBJECT_ID,
                  NORAD_CAT_ID: item.NORAD_CAT_ID,
                  OBJECT_TYPE: 'PAYLOAD',
                  OPERATIONAL_STATUS: 'UNKNOWN',
                  ...tleData
                };
              } catch (error) {
                console.warn('Failed to process satellite data:', error);
                return null;
              }
            }).filter((item): item is CelesTrakGPData => item !== null);
          }

          // 観測地点からの可視性に基づいてフィルタリング
          const filteredData = satelliteData.filter(data => {
            try {
              const orbitalElements = visibilityService.extractOrbitalElements(data.TLE_LINE2);
              return visibilityService.isInVisibilityRange(observerLat, observerLng, orbitalElements);
            } catch (error) {
              console.warn('Failed to check visibility for satellite:', error);
              return false;
            }
          });

          // 衛星データを変換（一度に処理する数を制限）
          const satellitePromises = filteredData
            .slice(0, this.MAX_SATELLITES)
            .map(async (data) => {
              try {
                const cached = await this.getCachedSatellite(data.NORAD_CAT_ID);
                if (cached) return cached;
                return await this.convertGPDataToSatellite(data);
              } catch (error) {
                console.warn('Failed to process satellite:', error);
                return null;
              }
            });

          const satellites = (await Promise.all(satellitePromises))
            .filter((satellite): satellite is Satellite => satellite !== null);

          // 可視パスを計算
          const loc = { lat: observerLat, lng: observerLng };
          const results = await Promise.all(
            satellites.map(async (satellite, index) => {
              if (index > 0) {
                await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
              }

              try {
                const passes = await orbitService.calculatePasses(satellite.tle, loc, params);
                return { ...satellite, passes };
              } catch (error) {
                console.error(`Failed to calculate passes for satellite ${satellite.name}:`, error);
                return { ...satellite, passes: [] };
              }
            })
          );

          // パスフィルタリングと並び替え
          return results
            .filter(satellite => {
              const hasVisiblePasses = satellite.passes.some(pass => pass.maxElevation >= params.minElevation);
              return satellite.passes.length > 0 && hasVisiblePasses;
            })
            .sort((a, b) => {
              const maxElevA = Math.max(...a.passes.map(p => p.maxElevation));
              const maxElevB = Math.max(...b.passes.map(p => p.maxElevation));
              return maxElevB - maxElevA;
            });

        } catch (error) {
          console.warn(`Failed to fetch data from ${endpoint.url}:`, error);
          continue;
        }
      }

      // すべてのエンドポイントが失敗した場合
      console.warn('All endpoints failed, falling back to mock data');
      return this.mockSatellites;

    } catch (error) {
      console.error('Satellite search failed:', error);
      throw error;
    }
  }
}

// シングルトンインスタンスをエクスポート
export const satelliteService = new SatelliteService();

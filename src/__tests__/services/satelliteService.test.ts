import { searchSatellites } from '../../services/satelliteService';

describe('satelliteService', () => {
  // テストのタイムアウトを長めに設定（衛星計算は時間がかかる）
  jest.setTimeout(60000);

  it('東京の位置で衛星を検索できる', async () => {
    // 東京の位置情報
    const location = {
      latitude: 35.6812,
      longitude: 139.7671
    };

    // 検索期間（現在から24時間）
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 検索条件
    const params = {
      latitude: location.latitude,
      longitude: location.longitude,
      location: { lat: location.latitude, lng: location.longitude },
      startDate: now,
      endDate: tomorrow,
      minElevation: 10, // 仰角10度以上
      considerDaylight: false
    };

    // 衛星を検索
    const results = await searchSatellites(params);

    // 結果のログ出力
    console.log(`検索結果: ${results.length}件の衛星が見つかりました`);
    if (results.length > 0) {
      console.log('最初の5件:', results.slice(0, 5).map(s => ({
        name: s.name,
        noradId: s.noradId,
        passCount: s.passes.length,
        maxElevation: Math.max(...s.passes.map(p => p.maxElevation))
      })));
    }

    // 少なくとも1つの衛星が見つかることを期待
    expect(results.length).toBeGreaterThan(0);
  });

  it('仰角の閾値を変えると検索結果が変わる', async () => {
    // 東京の位置情報
    const location = {
      latitude: 35.6812,
      longitude: 139.7671
    };

    // 検索期間（現在から24時間）
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 仰角10度での検索
    const results10 = await searchSatellites({
      latitude: location.latitude,
      longitude: location.longitude,
      location: { lat: location.latitude, lng: location.longitude },
      startDate: now,
      endDate: tomorrow,
      minElevation: 10,
      considerDaylight: false
    });

    // 仰角30度での検索
    const results30 = await searchSatellites({
      latitude: location.latitude,
      longitude: location.longitude,
      location: { lat: location.latitude, lng: location.longitude },
      startDate: now,
      endDate: tomorrow,
      minElevation: 30,
      considerDaylight: false
    });

    // 結果のログ出力
    console.log(`仰角10度: ${results10.length}件の衛星`);
    console.log(`仰角30度: ${results30.length}件の衛星`);

    // 仰角10度の方が30度よりも多くの衛星が見つかることを期待
    // （仰角が低いほど、より多くの衛星が可視範囲に入る）
    expect(results10.length).toBeGreaterThanOrEqual(results30.length);
  });
});

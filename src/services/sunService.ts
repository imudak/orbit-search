import SunCalc from 'suncalc';
import type { LatLng, SunPath, SunPathSettings } from '@/types';

export class SunService {
  /**
   * 指定された期間の太陽軌道を計算
   */
  static calculateSunPaths(location: LatLng, settings: SunPathSettings): SunPath[] {
    const paths: SunPath[] = [];
    const { startDate, endDate, interval } = settings;

    // 開始日から終了日まで1日ごとに処理
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const points: LatLng[] = [];

      // 1日を指定された間隔で分割して太陽位置を計算
      for (let minutes = 0; minutes < 24 * 60; minutes += interval) {
        const time = new Date(currentDate);
        time.setMinutes(time.getMinutes() + minutes);

        // SunCalcを使用して太陽の位置を計算
        const sunPosition = SunCalc.getPosition(
          time,
          location.lat,
          location.lng
        );

        // 高度（altitude）と方位角（azimuth）から緯度経度に変換
        const { altitude, azimuth } = sunPosition;

        // 地平線より上にある場合のみ位置を記録
        const visible = altitude > 0;
        if (visible) {
          // 高度と方位角から見かけの位置を計算（単純な投影）
          // 注: これは見かけの位置を地図上に表現するための簡略化された計算です
          const distance = (90 - (altitude * 180 / Math.PI)) * 111; // km単位（1度あたり約111km）
          const lat = location.lat + distance * Math.cos(azimuth) / 111;
          const lng = location.lng + distance * Math.sin(azimuth) / (111 * Math.cos(location.lat * Math.PI / 180));

          points.push({ lat, lng });
        }
      }

      // その日の軌道を追加
      paths.push({
        date: new Date(currentDate),
        points,
        visible: points.length > 0
      });

      // 次の日へ
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return paths;
  }
}

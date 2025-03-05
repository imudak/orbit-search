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

        // 太陽の方位角と高度から天球上の位置を計算
        const altitudeDeg = altitude * 180 / Math.PI;
        const azimuthDeg = azimuth * 180 / Math.PI;

        // 天球上の位置を地図上に投影
        // 高度90度の場合は観測地点の真上、0度の場合は地平線上、-90度の場合は真下
        const angularDistance = (90 - altitudeDeg) / 2; // 角距離を半分にして投影を調整
        const lat = location.lat + angularDistance * Math.cos(azimuth);
        const lng = location.lng + angularDistance * Math.sin(azimuth) / Math.cos(location.lat * Math.PI / 180);

        points.push({
          lat,
          lng,
          isDaylight: altitude > 0
        });
      }

      // その日の軌道を追加
      paths.push({
        date: new Date(currentDate),
        points
      });

      // 次の日へ
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return paths;
  }
}

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

        // 時刻から経度を計算（1時間 = 15度）
        const utcHours = time.getUTCHours() + time.getUTCMinutes() / 60;
        const lng = -180 + (utcHours * 15);

        // 季節による太陽の赤緯（南北の偏り）を計算
        const dayOfYear = Math.floor((time.getTime() - new Date(time.getFullYear(), 0, 0).getTime()) / 86400000);
        const declination = 23.45 * Math.sin((360/365 * (dayOfYear - 81)) * Math.PI / 180);
        const lat = declination; // 赤緯を緯度として使用（約±23.45度の範囲）

        // 観測地点からの可視判定用に位置を再計算
        const localPosition = SunCalc.getPosition(time, location.lat, location.lng);

        points.push({
          lat,
          lng,
          isDaylight: localPosition.altitude > 0 // 観測地点から見て地平線より上なら昼
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

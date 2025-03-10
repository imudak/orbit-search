import React from 'react';
import { useMapEvents } from 'react-leaflet';
import type { Location } from '@/types';

interface MapClickHandlerProps {
  onLocationSelect: (location: Location) => void;
}

/**
 * 地図クリックイベントを処理するコンポーネント
 */
const MapClickHandler: React.FC<MapClickHandlerProps> = ({
  onLocationSelect
}) => {
  // 地図イベントを処理
  useMapEvents({
    click: (e) => {
      // UI部品がクリックされた場合は処理しない
      // originalEventのtargetを確認
      const target = e.originalEvent.target as HTMLElement;

      // UI部品（ボタンやコントロール）がクリックされた場合は処理しない
      // MUIコンポーネントはdata-mui-*属性を持つことが多い
      if (
        target.closest('[data-mui-internal-clone-element]') || // Tooltipなど
        target.closest('.MuiButtonBase-root') || // ボタン
        target.closest('.MuiToggleButton-root') || // トグルボタン
        target.closest('.MuiSpeedDial-root') || // SpeedDial
        target.closest('.MuiPaper-root') || // ペーパー（パネルなど）
        target.closest('.MuiBox-root[role="button"]') || // クリック可能なBox
        target.getAttribute('role') === 'button' || // role="button"の要素
        target.tagName === 'BUTTON' // 通常のボタン
      ) {
        console.log('UI部品がクリックされました。観測地点は移動しません。');
        return;
      }

      // クリックした位置の緯度経度を取得
      const { lat, lng } = e.latlng;

      // 親コンポーネントに通知
      onLocationSelect({
        lat,
        lng
      });

      console.log(`地図がクリックされました: 緯度=${lat}, 経度=${lng}`);
    }
  });

  return null;
};

export default MapClickHandler;

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// マップレイヤーの型定義
export interface MapLayer {
  id: string;
  name: string;
  description: string;
  isVisible: boolean;
  color: string;
  icon?: string;
  order?: number;
}

// レイヤー管理のためのコンテキスト型
interface LayerContextType {
  layers: MapLayer[];
  toggleLayer: (layerId: string) => void;
  setLayerVisibility: (layerId: string, isVisible: boolean) => void;
  isLayerVisible: (layerId: string) => boolean;
  addLayer: (layer: MapLayer) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<MapLayer>) => void;
}

// デフォルトのレイヤー
const defaultLayers: MapLayer[] = [
  {
    id: 'observer-marker',
    name: '観測地点',
    description: '選択された観測地点を表示します',
    isVisible: true,
    color: '#1976d2',
  },
  {
    id: 'visibility-circles',
    name: '可視範囲',
    description: '各軌道種類の衛星が見える範囲を表示します',
    isVisible: true,
    color: '#4caf50',
  },
  {
    id: 'orbit-paths',
    name: '軌道パス',
    description: '選択された衛星の軌道を表示します',
    isVisible: true,
    color: '#f44336',
  },
  {
    id: 'satellite-animation',
    name: '衛星アニメーション',
    description: '衛星の動きをアニメーションで表示します',
    isVisible: true,
    color: '#ff9800',
  },
];

// レイヤー管理コンテキストの作成
const LayerContext = createContext<LayerContextType | undefined>(undefined);

// レイヤー管理コンテキストのプロバイダーコンポーネント
interface LayerProviderProps {
  children: ReactNode;
  initialLayers?: MapLayer[];
}

/**
 * レイヤー管理システムのプロバイダーコンポーネント
 * レイヤーの状態管理と操作メソッドを提供
 */
export const LayerProvider: React.FC<LayerProviderProps> = ({
  children,
  initialLayers = defaultLayers
}) => {
  // レイヤーの状態
  const [layers, setLayers] = useState<MapLayer[]>(initialLayers);

  // レイヤーの表示/非表示を切り替える
  const toggleLayer = useCallback((layerId: string) => {
    setLayers(prevLayers =>
      prevLayers.map(layer =>
        layer.id === layerId
          ? { ...layer, isVisible: !layer.isVisible }
          : layer
      )
    );
  }, []);

  // レイヤーの表示/非表示を設定する
  const setLayerVisibility = useCallback((layerId: string, isVisible: boolean) => {
    setLayers(prevLayers =>
      prevLayers.map(layer =>
        layer.id === layerId
          ? { ...layer, isVisible }
          : layer
      )
    );
  }, []);

  // レイヤーが表示されているかどうかを確認する
  const isLayerVisible = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    return layer ? layer.isVisible : false;
  }, [layers]);

  // 新しいレイヤーを追加する
  const addLayer = useCallback((layer: MapLayer) => {
    setLayers(prevLayers => {
      // 既に同じIDのレイヤーが存在する場合は追加しない
      if (prevLayers.some(l => l.id === layer.id)) {
        return prevLayers;
      }
      return [...prevLayers, layer];
    });
  }, []);

  // レイヤーを削除する
  const removeLayer = useCallback((layerId: string) => {
    setLayers(prevLayers => prevLayers.filter(layer => layer.id !== layerId));
  }, []);

  // レイヤーを更新する
  const updateLayer = useCallback((layerId: string, updates: Partial<MapLayer>) => {
    setLayers(prevLayers =>
      prevLayers.map(layer =>
        layer.id === layerId
          ? { ...layer, ...updates }
          : layer
      )
    );
  }, []);

  // コンテキスト値
  const contextValue: LayerContextType = {
    layers,
    toggleLayer,
    setLayerVisibility,
    isLayerVisible,
    addLayer,
    removeLayer,
    updateLayer
  };

  return (
    <LayerContext.Provider value={contextValue}>
      {children}
    </LayerContext.Provider>
  );
};

// レイヤー管理コンテキストを使用するためのフック
export const useLayerManager = (): LayerContextType => {
  const context = useContext(LayerContext);
  if (context === undefined) {
    throw new Error('useLayerManager must be used within a LayerProvider');
  }
  return context;
};

/**
 * レイヤーコンポーネントをレンダリングするコンポーネント
 * 表示状態に応じて子コンポーネントをレンダリング
 */
interface LayerRendererProps {
  layerId: string;
  children: ReactNode;
}

export const LayerRenderer: React.FC<LayerRendererProps> = ({
  layerId,
  children
}) => {
  const { isLayerVisible } = useLayerManager();

  // レイヤーが表示状態の場合のみ子コンポーネントをレンダリング
  return isLayerVisible(layerId) ? <>{children}</> : null;
};

export default {
  LayerProvider,
  useLayerManager,
  LayerRenderer
};

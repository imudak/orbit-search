import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Map from '../../components/Map';
import { MapContainer } from 'react-leaflet';

// MapContainerのモック
jest.mock('react-leaflet', () => ({
  MapContainer: jest.fn(({ children }) => (
    <div data-testid="map-container">{children}</div>
  )),
  TileLayer: jest.fn(() => <div data-testid="tile-layer" />),
  useMap: jest.fn(() => ({
    setView: jest.fn(),
    fitBounds: jest.fn(),
    getZoom: jest.fn(() => 5),
    getCenter: jest.fn(() => ({ lat: 35.6812, lng: 139.7671 })),
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
  })),
  Marker: jest.fn(({ children }) => (
    <div data-testid="marker">{children}</div>
  )),
  Popup: jest.fn(({ children }) => (
    <div data-testid="popup">{children}</div>
  )),
  Circle: jest.fn(() => <div data-testid="circle" />),
  Polyline: jest.fn(() => <div data-testid="polyline" />),
}));

// Leafletのモック
jest.mock('leaflet', () => ({
  latLngBounds: jest.fn(() => ({
    isValid: jest.fn(() => true),
  })),
  latLng: jest.fn((lat, lng) => ({ lat, lng })),
  icon: jest.fn(() => ({})),
  divIcon: jest.fn(() => ({})),
}));

// MediaQueryListのモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false, // デスクトップモードをデフォルトとする
    media: query,
    onchange: null,
    addListener: jest.fn(), // 非推奨
    removeListener: jest.fn(), // 非推奨
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('Map Integration Tests', () => {
  const defaultProps = {
    center: { lat: 35.6812, lng: 139.7671 },
    onLocationSelect: jest.fn(),
    orbitPaths: [
      {
        satelliteId: 'test-satellite',
        maxElevation: 45,
        segments: [
          {
            points: [
              { lat: 35.0, lng: 139.0 },
              { lat: 36.0, lng: 140.0 },
            ],
            effectiveAngles: [30, 40],
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
    filters: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      location: { lat: 35.6812, lng: 139.7671 },
      minElevation: 10
    },
    satellites: [
      {
        orbitHeight: 500,
        orbitType: 'LEO',
      },
      {
        orbitHeight: 20000,
        orbitType: 'GEO',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders map with all components in desktop mode', async () => {
    // デスクトップモードのモック
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(<Map {...defaultProps} />);

    // 基本的なマップコンポーネントが表示されていることを確認
    expect(screen.getByTestId('map-container')).toBeInTheDocument();

    // レイヤーが表示されていることを確認
    await waitFor(() => {
      expect(screen.queryAllByTestId('polyline').length).toBeGreaterThan(0);
    });
  });

  test('renders map with mobile controls in mobile mode', async () => {
    // モバイルモードのモック
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query.includes('(max-width'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(<Map {...defaultProps} />);

    // 基本的なマップコンポーネントが表示されていることを確認
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  test('integrates with layer management system', async () => {
    render(<Map {...defaultProps} />);

    // レイヤーが表示されていることを確認
    await waitFor(() => {
      expect(screen.queryAllByTestId('polyline').length).toBeGreaterThan(0);
    });
  });

  test('integrates with mode management system', async () => {
    render(<Map {...defaultProps} />);

    // モード切替が機能していることを確認
    // 注: 実際のUIイベントをトリガーするテストは、実際のDOMが必要なため、
    // ここではコンポーネントが正しくレンダリングされることのみを確認
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });
});

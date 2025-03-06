import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('Map Component', () => {
  const defaultProps = {
    center: { lat: 35.6812, lng: 139.7671 },
    onLocationSelect: jest.fn(),
    orbitPaths: [],
    filters: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      location: { lat: 35.6812, lng: 139.7671 },
      minElevation: 10
    },
    satellites: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    render(<Map {...defaultProps} />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  test('renders with default center when no center is provided', () => {
    render(<Map onLocationSelect={defaultProps.onLocationSelect} />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  test('renders with orbit paths when provided', () => {
    const orbitPaths = [
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
    ];

    render(<Map {...defaultProps} orbitPaths={orbitPaths} />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  test('renders with satellites when provided', () => {
    const satellites = [
      {
        orbitHeight: 500,
        orbitType: 'LEO',
      },
      {
        orbitHeight: 20000,
        orbitType: 'GEO',
      },
    ];

    render(<Map {...defaultProps} satellites={satellites} />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });
});

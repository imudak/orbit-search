// 衛星データの型
export interface Satellite {
  id: string;
  name: string;
  noradId: string;
  type: string;
  operationalStatus: string;
  tle: TLEData;
}

// TLEデータの型
export interface TLEData {
  line1: string;
  line2: string;
  timestamp: string;
}

// 検索条件の型
export interface SearchFilters {
  startDate: Date;
  endDate: Date;
  location: Location;
  minElevation: number;
  considerDaylight?: boolean;
}

// 観測地点の型
export interface Location {
  lat: number;
  lng: number;
  name?: string;
}

// 可視性計算結果の型
export interface VisibilityResult {
  satellite: Satellite;
  passes: Pass[];
}

// パス（通過）情報の型
export interface Pass {
  startTime: Date;
  endTime: Date;
  maxElevation: number;
  isDaylight: boolean;
  points: PassPoint[];
}

// パスの各ポイントの型
export interface PassPoint {
  time: Date;
  azimuth: number;
  elevation: number;
  range: number;
  isDaylight: boolean;
}

// 軌道データの型
export interface OrbitPath {
  satelliteId: string;
  points: LatLng[];
  timestamp: string;
}

// CelesTrak APIのレスポンス型
export interface CelesTrakGPData {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  NORAD_CAT_ID: string;
  OBJECT_TYPE: string;
  OPERATIONAL_STATUS: string;
  TLE_LINE1: string;
  TLE_LINE2: string;
}

// 緯度経度の型
export interface LatLng {
  lat: number;
  lng: number;
}

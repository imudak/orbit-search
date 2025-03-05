// 衛星データの型
export interface Satellite {
  id: string;
  name: string;
  noradId: string;
  type: string;
  operationalStatus: string;
  tle: TLEData;
  orbitHeight?: number; // 軌道高度（km）
  orbitType?: string;   // 軌道種類（LEO, MEO, GEO, HEO）
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
  lat?: number; // 衛星の緯度
  lng?: number; // 衛星の経度
  isNewSegment?: boolean; // 経度の不連続点かどうか
  effectiveAngle?: number; // 観測地点からの実効的な角度
}

// 軌道セグメントの型
export interface OrbitSegment {
  points: LatLng[];
  effectiveAngles: number[]; // 各ポイントの実効的な角度
}

// 軌道データの型
export interface OrbitPath {
  satelliteId: string;
  segments: OrbitSegment[]; // 複数のセグメントに分割
  timestamp: string;
  maxElevation: number; // パスの最大仰角
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

// TOD座標系でのEphemerisデータの型
export interface EphemerisData {
  epoch: string;        // 開始時刻
  data: string;         // Ascii text形式のエフェメリスデータ
  duration: number;     // データ期間（秒）
  frame: 'TOD';        // 座標系（True of Date）
}

// 緯度経度の型
export interface LatLng {
  lat: number;
  lng: number;
}

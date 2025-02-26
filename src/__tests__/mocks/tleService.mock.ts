import type { TLEData } from '../../types';

export const mockTLEData: TLEData = {
  line1: '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927',
  line2: '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537',
  timestamp: '2024-02-26T02:00:00.000Z'
};

interface MockTLEDataMap {
  [key: string]: TLEData;
}

// 開発環境用のモックデータ
export const mockDebugData: MockTLEDataMap = {
  '25544': {
    line1: '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927',
    line2: '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537',
    timestamp: new Date().toISOString()
  },
  '25545': {
    line1: '1 25545U 98067B   08264.51782528 -.00002182  00000-0 -11606-4 0  2927',
    line2: '2 25545  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537',
    timestamp: new Date().toISOString()
  }
};

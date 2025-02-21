/// <reference types="vite/client" />

declare module 'satellite.js' {
  export interface EciVec3<T> {
    x: T;
    y: T;
    z: T;
  }

  export interface Satrec {
    satnum: string;
    epochyr: number;
    epochdays: number;
    jdsatepoch: number;
    [key: string]: any;
  }

  export interface PositionAndVelocity {
    position: EciVec3<number>;
    velocity: EciVec3<number>;
  }

  export interface GeodeticPosition {
    longitude: number;
    latitude: number;
    height: number;
  }

  export function twoline2satrec(line1: string, line2: string): Satrec | null;
  export function propagate(satrec: Satrec, date: Date): PositionAndVelocity;
  export function gstime(date: Date): number;
  export function eciToGeodetic(position: EciVec3<number>, gmst: number): GeodeticPosition;
  export function degreesLat(radians: number): number;
  export function degreesLong(radians: number): number;
}

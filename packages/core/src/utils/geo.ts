import type { LatLng } from '../types/analysis.js';

export function isValidCoordinate(coord: LatLng): boolean {
  return (
    coord.lat >= -90 &&
    coord.lat <= 90 &&
    coord.lng >= -180 &&
    coord.lng <= 180 &&
    Number.isFinite(coord.lat) &&
    Number.isFinite(coord.lng)
  );
}

export function distanceKm(a: LatLng, b: LatLng): number {
  const earthRadiusKm = 6371;
  const dLat = degreesToRadians(b.lat - a.lat);
  const dLng = degreesToRadians(b.lng - a.lng);
  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLng = Math.sin(dLng / 2);
  const haversine =
    sinHalfDLat * sinHalfDLat +
    Math.cos(degreesToRadians(a.lat)) *
      Math.cos(degreesToRadians(b.lat)) *
      sinHalfDLng *
      sinHalfDLng;
  const angularDistance = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusKm * angularDistance;
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function linearScale(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number,
): number {
  const clamped = clamp(value, inputMin, inputMax);
  const ratio = (clamped - inputMin) / (inputMax - inputMin);
  return outputMin + ratio * (outputMax - outputMin);
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1));
}

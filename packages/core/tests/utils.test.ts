import { describe, it, expect } from 'vitest';
import {
  isValidCoordinate,
  distanceKm,
  clamp,
  linearScale,
  mean,
  standardDeviation,
} from '../src/utils/geo.js';

describe('isValidCoordinate', () => {
  it('accepts valid coordinates', () => {
    expect(isValidCoordinate({ lat: 55.86, lng: -4.25 })).toBe(true);
    expect(isValidCoordinate({ lat: 0, lng: 0 })).toBe(true);
    expect(isValidCoordinate({ lat: -90, lng: -180 })).toBe(true);
    expect(isValidCoordinate({ lat: 90, lng: 180 })).toBe(true);
  });

  it('rejects invalid latitudes', () => {
    expect(isValidCoordinate({ lat: 91, lng: 0 })).toBe(false);
    expect(isValidCoordinate({ lat: -91, lng: 0 })).toBe(false);
  });

  it('rejects invalid longitudes', () => {
    expect(isValidCoordinate({ lat: 0, lng: 181 })).toBe(false);
    expect(isValidCoordinate({ lat: 0, lng: -181 })).toBe(false);
  });

  it('rejects NaN and Infinity', () => {
    expect(isValidCoordinate({ lat: NaN, lng: 0 })).toBe(false);
    expect(isValidCoordinate({ lat: 0, lng: Infinity })).toBe(false);
    expect(isValidCoordinate({ lat: -Infinity, lng: 0 })).toBe(false);
  });
});

describe('distanceKm', () => {
  it('returns 0 for the same point', () => {
    const point = { lat: 55.86, lng: -4.25 };
    expect(distanceKm(point, point)).toBeCloseTo(0, 5);
  });

  it('calculates known distance between Glasgow and Edinburgh', () => {
    const glasgow = { lat: 55.8642, lng: -4.2518 };
    const edinburgh = { lat: 55.9533, lng: -3.1883 };
    const distance = distanceKm(glasgow, edinburgh);
    // Roughly 70km
    expect(distance).toBeGreaterThan(60);
    expect(distance).toBeLessThan(80);
  });

  it('calculates distance across the equator', () => {
    const a = { lat: 1, lng: 0 };
    const b = { lat: -1, lng: 0 };
    const distance = distanceKm(a, b);
    // ~222km (2 degrees of latitude)
    expect(distance).toBeGreaterThan(200);
    expect(distance).toBeLessThan(250);
  });
});

describe('clamp', () => {
  it('returns value within range', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it('clamps to min', () => {
    expect(clamp(-10, 0, 100)).toBe(0);
  });

  it('clamps to max', () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it('handles equal min and max', () => {
    expect(clamp(50, 42, 42)).toBe(42);
  });
});

describe('linearScale', () => {
  it('maps linearly within range', () => {
    expect(linearScale(5, 0, 10, 0, 100)).toBe(50);
  });

  it('clamps below input min', () => {
    expect(linearScale(-5, 0, 10, 0, 100)).toBe(0);
  });

  it('clamps above input max', () => {
    expect(linearScale(15, 0, 10, 0, 100)).toBe(100);
  });

  it('scales in reverse direction', () => {
    expect(linearScale(5, 0, 10, 100, 0)).toBe(50);
  });
});

describe('mean', () => {
  it('calculates mean of numbers', () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
  });

  it('returns 0 for empty array', () => {
    expect(mean([])).toBe(0);
  });

  it('handles single value', () => {
    expect(mean([42])).toBe(42);
  });
});

describe('standardDeviation', () => {
  it('returns 0 for single value', () => {
    expect(standardDeviation([42])).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(standardDeviation([])).toBe(0);
  });

  it('calculates standard deviation correctly', () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    const sd = standardDeviation(values);
    expect(sd).toBeCloseTo(2.0, 0);
  });
});

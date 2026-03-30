import { describe, it, expect } from 'vitest';
import { scoreTerrainSuitability } from '../src/scoring/terrain-suitability.js';
import type { ElevationData } from '../src/types/datasources.js';

function makeElevationData(overrides: Partial<ElevationData> = {}): ElevationData {
  return {
    coordinate: { lat: 55.86, lng: -4.25 },
    elevationM: 150,
    slopePercent: 3,
    aspectDeg: 180,
    roughnessClass: 1,
    ...overrides,
  };
}

describe('scoreTerrainSuitability', () => {
  it('returns a valid FactorScore', () => {
    const result = scoreTerrainSuitability(makeElevationData(), 0.20);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const score = result.value;
      expect(score.factor).toBe('terrainSuitability');
      expect(score.weight).toBe(0.20);
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
      expect(score.detail).toBeTruthy();
    }
  });

  it('scores ideal flat terrain highly', () => {
    const result = scoreTerrainSuitability(
      makeElevationData({
        elevationM: 200,
        slopePercent: 2,
        roughnessClass: 1,
      }),
      0.20,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.score).toBeGreaterThanOrEqual(80);
    }
  });

  it('scores steep terrain poorly', () => {
    const result = scoreTerrainSuitability(
      makeElevationData({
        slopePercent: 28,
        roughnessClass: 3,
      }),
      0.20,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.score).toBeLessThan(30);
    }
  });

  it('scores prohibitive slope at minimum', () => {
    const result = scoreTerrainSuitability(
      makeElevationData({
        slopePercent: 35,
        roughnessClass: 3,
        elevationM: 3000,
      }),
      0.20,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.score).toBeLessThanOrEqual(20);
    }
  });

  it('handles below sea level elevation', () => {
    const result = scoreTerrainSuitability(
      makeElevationData({ elevationM: -30 }),
      0.20,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.score).toBeGreaterThan(0);
      expect(result.value.score).toBeLessThan(100);
    }
  });

  it('gives high confidence for normal terrain', () => {
    const result = scoreTerrainSuitability(makeElevationData(), 0.20);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.confidence).toBe('high');
    }
  });

  it('gives low confidence for extreme elevation', () => {
    const result = scoreTerrainSuitability(
      makeElevationData({ elevationM: 4000 }),
      0.20,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.confidence).toBe('low');
    }
  });

  it('includes elevation in detail string', () => {
    const result = scoreTerrainSuitability(
      makeElevationData({ elevationM: 450 }),
      0.20,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.detail).toContain('450');
    }
  });

  it('differentiates roughness classes', () => {
    const class1 = scoreTerrainSuitability(makeElevationData({ roughnessClass: 1 }), 0.20);
    const class3 = scoreTerrainSuitability(makeElevationData({ roughnessClass: 3 }), 0.20);

    expect(class1.ok).toBe(true);
    expect(class3.ok).toBe(true);
    if (class1.ok && class3.ok) {
      expect(class1.value.score).toBeGreaterThan(class3.value.score);
    }
  });
});

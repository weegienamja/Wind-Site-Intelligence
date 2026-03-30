import { describe, it, expect } from 'vitest';
import {
  degreesToCompass,
  emptyRoseData,
  COMPASS_DIRECTIONS,
  DEFAULT_WIND_BANDS,
} from '../../ui/src/components/WindRose.js';

describe('degreesToCompass', () => {
  it('maps 0° to N', () => {
    expect(degreesToCompass(0)).toBe('N');
  });

  it('maps 360° to N', () => {
    expect(degreesToCompass(360)).toBe('N');
  });

  it('maps 90° to E', () => {
    expect(degreesToCompass(90)).toBe('E');
  });

  it('maps 180° to S', () => {
    expect(degreesToCompass(180)).toBe('S');
  });

  it('maps 270° to W', () => {
    expect(degreesToCompass(270)).toBe('W');
  });

  it('maps 45° to NE', () => {
    expect(degreesToCompass(45)).toBe('NE');
  });

  it('maps 135° to SE', () => {
    expect(degreesToCompass(135)).toBe('SE');
  });

  it('maps 225° to SW', () => {
    expect(degreesToCompass(225)).toBe('SW');
  });

  it('maps 315° to NW', () => {
    expect(degreesToCompass(315)).toBe('NW');
  });

  it('maps 22.5° to NNE', () => {
    expect(degreesToCompass(22.5)).toBe('NNE');
  });

  it('maps 157.5° to SSE', () => {
    expect(degreesToCompass(157.5)).toBe('SSE');
  });

  it('handles negative degrees via wrapping', () => {
    expect(degreesToCompass(-90)).toBe('W');
  });

  it('handles large degrees via wrapping', () => {
    expect(degreesToCompass(450)).toBe('E');
  });

  it('maps 11° (near boundary) to N', () => {
    expect(degreesToCompass(11)).toBe('N');
  });

  it('maps 12° (boundary) to NNE', () => {
    // 12 / 22.5 = 0.53, rounds to 1 -> NNE
    expect(degreesToCompass(12)).toBe('NNE');
  });
});

describe('COMPASS_DIRECTIONS', () => {
  it('has exactly 16 directions', () => {
    expect(COMPASS_DIRECTIONS).toHaveLength(16);
  });

  it('starts with N', () => {
    expect(COMPASS_DIRECTIONS[0]).toBe('N');
  });

  it('has all cardinal directions', () => {
    expect(COMPASS_DIRECTIONS).toContain('N');
    expect(COMPASS_DIRECTIONS).toContain('E');
    expect(COMPASS_DIRECTIONS).toContain('S');
    expect(COMPASS_DIRECTIONS).toContain('W');
  });
});

describe('emptyRoseData', () => {
  it('returns 16 rows', () => {
    const rows = emptyRoseData(DEFAULT_WIND_BANDS);
    expect(rows).toHaveLength(16);
  });

  it('each row has direction and all band labels initialised to 0', () => {
    const rows = emptyRoseData(DEFAULT_WIND_BANDS);
    for (const row of rows) {
      expect(typeof row.direction).toBe('string');
      for (const band of DEFAULT_WIND_BANDS) {
        expect(row[band.label]).toBe(0);
      }
    }
  });

  it('directions are ordered starting from N', () => {
    const rows = emptyRoseData(DEFAULT_WIND_BANDS);
    expect(rows[0]!.direction).toBe('N');
    expect(rows[4]!.direction).toBe('E');
    expect(rows[8]!.direction).toBe('S');
    expect(rows[12]!.direction).toBe('W');
  });
});

describe('DEFAULT_WIND_BANDS', () => {
  it('has 4 speed bands', () => {
    expect(DEFAULT_WIND_BANDS).toHaveLength(4);
  });

  it('covers 0 to Infinity', () => {
    expect(DEFAULT_WIND_BANDS[0]!.minMs).toBe(0);
    expect(DEFAULT_WIND_BANDS[DEFAULT_WIND_BANDS.length - 1]!.maxMs).toBe(Infinity);
  });

  it('bands are contiguous', () => {
    for (let i = 1; i < DEFAULT_WIND_BANDS.length; i++) {
      expect(DEFAULT_WIND_BANDS[i]!.minMs).toBe(DEFAULT_WIND_BANDS[i - 1]!.maxMs);
    }
  });

  it('each band has a label and color', () => {
    for (const band of DEFAULT_WIND_BANDS) {
      expect(band.label).toBeTruthy();
      expect(band.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { isInCerraDomain, fetchCerraWindData, clearCerraCache } from '../src/datasources/cerra.js';

describe('CERRA Data Source', () => {
  beforeEach(() => {
    clearCerraCache();
  });

  describe('isInCerraDomain', () => {
    it('returns true for London (Europe)', () => {
      expect(isInCerraDomain({ lat: 51.5, lng: -0.12 })).toBe(true);
    });

    it('returns true for Glasgow (Europe)', () => {
      expect(isInCerraDomain({ lat: 55.86, lng: -4.25 })).toBe(true);
    });

    it('returns true for Berlin (Europe)', () => {
      expect(isInCerraDomain({ lat: 52.52, lng: 13.4 })).toBe(true);
    });

    it('returns false for New York (outside Europe)', () => {
      expect(isInCerraDomain({ lat: 40.71, lng: -74.0 })).toBe(false);
    });

    it('returns false for Tokyo (outside Europe)', () => {
      expect(isInCerraDomain({ lat: 35.68, lng: 139.69 })).toBe(false);
    });

    it('returns false for Sydney (outside Europe)', () => {
      expect(isInCerraDomain({ lat: -33.87, lng: 151.21 })).toBe(false);
    });

    it('returns true for Reykjavik (Iceland, near boundary)', () => {
      expect(isInCerraDomain({ lat: 64.13, lng: -21.9 })).toBe(true);
    });
  });

  describe('fetchCerraWindData', () => {
    it('rejects empty API key', async () => {
      const result = await fetchCerraWindData({ lat: 55, lng: -4 }, '');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('API key is required');
      }
    });

    it('rejects coordinate outside CERRA domain', async () => {
      const result = await fetchCerraWindData({ lat: 40.71, lng: -74.0 }, 'test-key');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('outside the CERRA domain');
      }
    });
  });
});

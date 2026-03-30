import { describe, it, expect } from 'vitest';
import { createCache } from '../src/utils/cache.js';

describe('createCache', () => {
  it('stores and retrieves values', () => {
    const cache = createCache<string>();
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('returns undefined for missing keys', () => {
    const cache = createCache<string>();
    expect(cache.get('missing')).toBeUndefined();
  });

  it('reports has correctly', () => {
    const cache = createCache<string>();
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('missing')).toBe(false);
  });

  it('expires entries after TTL', () => {
    const cache = createCache<string>(1); // 1ms TTL
    cache.set('key1', 'value1');

    // After a tiny delay the entry should be expired
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(cache.get('key1')).toBeUndefined();
        expect(cache.has('key1')).toBe(false);
        resolve();
      }, 10);
    });
  });

  it('clears all entries', () => {
    const cache = createCache<string>();
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });

  it('reports size correctly', () => {
    const cache = createCache<number>();
    expect(cache.size()).toBe(0);
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.size()).toBe(2);
  });
});

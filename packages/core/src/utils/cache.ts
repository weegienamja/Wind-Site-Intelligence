interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export function createCache<T>(ttlMs: number = 30 * 60 * 1000) {
  const store = new Map<string, CacheEntry<T>>();

  return {
    get(key: string): T | undefined {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },

    set(key: string, value: T): void {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },

    has(key: string): boolean {
      const entry = store.get(key);
      if (!entry) return false;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return false;
      }
      return true;
    },

    clear(): void {
      store.clear();
    },

    size(): number {
      return store.size;
    },
  };
}

export type Cache<T> = ReturnType<typeof createCache<T>>;

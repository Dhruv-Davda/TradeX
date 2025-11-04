// Lightweight in-memory cache with optional TTL

type CacheEntry<T = unknown> = {
  value: T;
  expiresAt?: number;
};

class DataCache {
  private store = new Map<string, CacheEntry>();

  get<T = unknown>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T = unknown>(key: string, value: T, ttlMs?: number): void {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
    };
    this.store.set(key, entry);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export const dataCache = new DataCache();



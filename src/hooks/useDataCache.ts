import { useState, useEffect, useCallback } from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // milliseconds
}

class DataCache {
  private cache = new Map<string, CacheItem<any>>();
  private defaultExpiry = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, expiresIn?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn: expiresIn || this.defaultExpiry
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const isExpired = Date.now() - item.timestamp > item.expiresIn;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

const dataCache = new DataCache();

export function useDataCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: { 
    expiresIn?: number;
    enabled?: boolean;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { expiresIn, enabled = true } = options;

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Check cache first
    const cachedData = dataCache.get<T>(key);
    if (cachedData) {
      setData(cachedData);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
      dataCache.set(key, result, expiresIn);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [key, fetchFn, expiresIn, enabled]);

  const invalidateCache = useCallback(() => {
    dataCache.delete(key);
  }, [key]);

  const refreshData = useCallback(() => {
    invalidateCache();
    fetchData();
  }, [invalidateCache, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refreshData,
    invalidateCache
  };
}

export { dataCache };

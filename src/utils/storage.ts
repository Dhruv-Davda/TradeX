// Simple localStorage wrapper used by DataMigration

export const STORAGE_KEYS = {
  TRADES: 'trades',
} as const;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const storage = {
  get<T = unknown>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    return safeParse<T>(window.localStorage.getItem(key));
  },
  set<T = unknown>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key: string): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  },
  clear(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.clear();
  },
};



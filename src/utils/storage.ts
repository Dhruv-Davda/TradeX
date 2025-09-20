// Local storage utilities for data persistence
const STORAGE_KEYS = {
  USER: 'trade_app_user',
  MERCHANTS: 'trade_app_merchants',
  TRADES: 'trade_app_trades',
  EXPENSES: 'trade_app_expenses',
  INCOME: 'trade_app_income',
  STOCK: 'trade_app_stock',
};

export const storage = {
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },

  remove: (key: string): void => {
    localStorage.removeItem(key);
  },

  clear: (): void => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  },
};

export { STORAGE_KEYS };
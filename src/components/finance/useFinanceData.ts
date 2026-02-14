import { useState, useMemo, useCallback } from 'react';
import { startOfMonth, endOfMonth, format, subMonths, eachMonthOfInterval, differenceInDays, isWithinInterval } from 'date-fns';

export interface FinanceItem {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: Date;
  paymentType: string;
  createdAt: Date;
}

export interface FinanceFilters {
  monthRange: { startMonth: string; endMonth: string };
  selectedCategories: string[];
  searchQuery: string;
  sortBy: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'category';
}

interface CategoryBreakdown {
  name: string;
  value: number;
  color: string;
}

interface MonthlyTrend {
  month: string;
  amount: number;
}

export interface FinanceAnalytics {
  filteredItems: FinanceItem[];
  totalForPeriod: number;
  averagePerDay: number;
  topCategory: { name: string; amount: number } | null;
  monthOverMonthChange: number | null;
  categoryBreakdown: CategoryBreakdown[];
  monthlyTrend: MonthlyTrend[];
  itemCount: number;
}

export function useFinanceData(
  items: FinanceItem[],
  categoryColors: Record<string, string>,
) {
  const today = new Date();

  const [filters, setFilters] = useState<FinanceFilters>({
    monthRange: {
      startMonth: format(startOfMonth(today), 'yyyy-MM'),
      endMonth: format(today, 'yyyy-MM'),
    },
    selectedCategories: [],
    searchQuery: '',
    sortBy: 'date_desc',
  });

  const setMonthRange = useCallback((range: { startMonth: string; endMonth: string }) => {
    setFilters(f => ({ ...f, monthRange: range }));
  }, []);

  const setSelectedCategories = useCallback((cats: string[]) => {
    setFilters(f => ({ ...f, selectedCategories: cats }));
  }, []);

  const setSearchQuery = useCallback((q: string) => {
    setFilters(f => ({ ...f, searchQuery: q }));
  }, []);

  const setSortBy = useCallback((s: FinanceFilters['sortBy']) => {
    setFilters(f => ({ ...f, sortBy: s }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      monthRange: {
        startMonth: format(startOfMonth(today), 'yyyy-MM'),
        endMonth: format(today, 'yyyy-MM'),
      },
      selectedCategories: [],
      searchQuery: '',
      sortBy: 'date_desc',
    });
  }, []);

  const hasActiveFilters = filters.selectedCategories.length > 0 || filters.searchQuery !== '';

  const analytics = useMemo((): FinanceAnalytics => {
    const [sy, sm] = filters.monthRange.startMonth.split('-').map(Number);
    const [ey, em] = filters.monthRange.endMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(sy, sm - 1, 1));
    const endDate = endOfMonth(new Date(ey, em - 1, 1));

    // Filter by date range
    let filtered = items.filter(item => {
      const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
      return isWithinInterval(itemDate, { start: startDate, end: endDate });
    });

    // Filter by categories
    if (filters.selectedCategories.length > 0) {
      filtered = filtered.filter(item => filters.selectedCategories.includes(item.category));
    }

    // Filter by search
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (filters.sortBy) {
        case 'date_desc': return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date_asc': return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'amount_desc': return b.amount - a.amount;
        case 'amount_asc': return a.amount - b.amount;
        case 'category': return a.category.localeCompare(b.category);
        default: return 0;
      }
    });

    // Total
    const totalForPeriod = sorted.reduce((sum, item) => sum + item.amount, 0);

    // Average per day
    const daysInRange = Math.max(1, differenceInDays(endDate, startDate) + 1);
    const averagePerDay = totalForPeriod / daysInRange;

    // Top category
    const catTotals = new Map<string, number>();
    sorted.forEach(item => {
      catTotals.set(item.category, (catTotals.get(item.category) || 0) + item.amount);
    });
    let topCategory: { name: string; amount: number } | null = null;
    let maxAmount = 0;
    catTotals.forEach((amount, name) => {
      if (amount > maxAmount) {
        maxAmount = amount;
        topCategory = { name, amount };
      }
    });

    // Month-over-month change
    const periodMonths = Math.max(1,
      (ey - sy) * 12 + (em - sm) + 1
    );
    const prevStart = subMonths(startDate, periodMonths);
    const prevEnd = subMonths(endDate, periodMonths);
    const prevTotal = items
      .filter(item => {
        const d = item.date instanceof Date ? item.date : new Date(item.date);
        return d >= prevStart && d <= prevEnd;
      })
      .reduce((sum, item) => sum + item.amount, 0);
    const monthOverMonthChange = prevTotal > 0
      ? ((totalForPeriod - prevTotal) / prevTotal) * 100
      : null;

    // Category breakdown for pie chart
    const categoryBreakdown: CategoryBreakdown[] = [];
    catTotals.forEach((value, name) => {
      categoryBreakdown.push({
        name,
        value,
        color: categoryColors[name] || '#6b7280',
      });
    });
    categoryBreakdown.sort((a, b) => b.value - a.value);

    // Monthly trend
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    const monthlyTrend: MonthlyTrend[] = months.map(month => {
      const mStart = startOfMonth(month);
      const mEnd = endOfMonth(month);
      const amount = sorted
        .filter(item => {
          const d = item.date instanceof Date ? item.date : new Date(item.date);
          return d >= mStart && d <= mEnd;
        })
        .reduce((sum, item) => sum + item.amount, 0);
      return { month: format(month, 'MMM yyyy'), amount };
    });

    return {
      filteredItems: sorted,
      totalForPeriod,
      averagePerDay,
      topCategory,
      monthOverMonthChange,
      categoryBreakdown,
      monthlyTrend,
      itemCount: sorted.length,
    };
  }, [items, filters, categoryColors]);

  return {
    filters,
    setMonthRange,
    setSelectedCategories,
    setSearchQuery,
    setSortBy,
    clearFilters,
    hasActiveFilters,
    analytics,
  };
}

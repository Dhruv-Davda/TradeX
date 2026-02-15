// ============================================================
// TRADE TYPE COLORS
// ============================================================
export const TRADE_TYPE_COLORS = {
  buy: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500/30',
    gradient: 'from-green-500 to-green-600',
    hex: '#10b981',
    label: 'Buy',
  },
  sell: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    gradient: 'from-blue-500 to-blue-600',
    hex: '#3b82f6',
    label: 'Sell',
  },
  transfer: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    gradient: 'from-purple-500 to-purple-600',
    hex: '#8b5cf6',
    label: 'Transfer',
  },
  settlement: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    gradient: 'from-orange-500 to-orange-600',
    hex: '#f59e0b',
    label: 'Settlement',
  },
} as const;

export const getTradeTypeBadgeClasses = (type: string): string => {
  const colors = TRADE_TYPE_COLORS[type as keyof typeof TRADE_TYPE_COLORS];
  if (!colors) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  return `${colors.bg} ${colors.text} ${colors.border}`;
};

// ============================================================
// METAL TYPE COLORS
// ============================================================
export const METAL_TYPE_COLORS = {
  gold: {
    bg: 'bg-yellow-400/10',
    text: 'text-yellow-400',
    hex: '#fbbf24',
    label: 'Gold',
  },
  silver: {
    bg: 'bg-gray-400/10',
    text: 'text-gray-400',
    hex: '#9ca3af',
    label: 'Silver',
  },
} as const;

// ============================================================
// STAT CARD COLOR VARIANTS
// ============================================================
export const STAT_VARIANTS = {
  default: { bg: 'bg-primary-400/10', text: 'text-primary-400' },
  success: { bg: 'bg-green-400/10', text: 'text-green-400' },
  danger: { bg: 'bg-red-400/10', text: 'text-red-400' },
  warning: { bg: 'bg-orange-400/10', text: 'text-orange-400' },
  info: { bg: 'bg-blue-400/10', text: 'text-blue-400' },
  gold: { bg: 'bg-yellow-400/10', text: 'text-yellow-400' },
  silver: { bg: 'bg-gray-400/10', text: 'text-gray-400' },
  purple: { bg: 'bg-purple-400/10', text: 'text-purple-400' },
  emerald: { bg: 'bg-emerald-400/10', text: 'text-emerald-400' },
  teal: { bg: 'bg-teal-400/10', text: 'text-teal-400' },
} as const;

export type StatVariant = keyof typeof STAT_VARIANTS;

// ============================================================
// EXPENSE CATEGORIES
// ============================================================
export const EXPENSE_CATEGORIES = [
  'Salary',
  'Rent',
  'Electricity',
  'Fuel',
  'Marketing',
  'Equipment',
  'Maintenance',
  'Travel',
  'Food',
  'Office Supplies',
  'Insurance',
  'Other',
] as const;

// ============================================================
// INCOME CATEGORIES
// ============================================================
export const INCOME_CATEGORIES = [
  'Rent Income',
  'Interest on Loans',
  'F&O Trading',
  'IPO Gains',
  'Brokerage Income',
  'Dividend Income',
  'Capital Gains',
  'Consulting Fees',
  'Investment Returns',
  'Other Income',
] as const;

// ============================================================
// PAYMENT OPTIONS
// ============================================================
export const PAYMENT_TYPE_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
] as const;

// ============================================================
// CHART COLOR PALETTE (for pie/donut charts)
// ============================================================
export const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48',
] as const;

export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  'Salary': '#3b82f6',
  'Rent': '#10b981',
  'Electricity': '#f59e0b',
  'Fuel': '#ef4444',
  'Marketing': '#8b5cf6',
  'Equipment': '#ec4899',
  'Maintenance': '#06b6d4',
  'Travel': '#84cc16',
  'Food': '#f97316',
  'Office Supplies': '#6366f1',
  'Insurance': '#14b8a6',
  'Other': '#6b7280',
};

export const INCOME_CATEGORY_COLORS: Record<string, string> = {
  'Rent Income': '#10b981',
  'Interest on Loans': '#3b82f6',
  'F&O Trading': '#f59e0b',
  'IPO Gains': '#8b5cf6',
  'Brokerage Income': '#ec4899',
  'Dividend Income': '#06b6d4',
  'Capital Gains': '#84cc16',
  'Consulting Fees': '#f97316',
  'Investment Returns': '#6366f1',
  'Other Income': '#6b7280',
};

// ============================================================
// SORT OPTIONS
// ============================================================
export const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'amount_desc', label: 'Highest Amount' },
  { value: 'amount_asc', label: 'Lowest Amount' },
] as const;

// ============================================================
// JEWELLERY (GHAAT) CONSTANTS
// ============================================================
export const DEFAULT_JEWELLERY_CATEGORIES = [
  'Bracelets', 'Chains', 'Jhoomke', 'Rings', 'Necklaces',
  'Pendants', 'Bangles', 'Earrings', 'Mangalsutra', 'Other',
] as const;

export const WEIGHT_BRACKETS = [
  { label: 'Under 3 gm', min: 0, max: 3 },
  { label: '3 - 5 gm', min: 3, max: 5 },
  { label: '5 - 10 gm', min: 5, max: 10 },
  { label: '10 - 15 gm', min: 10, max: 15 },
  { label: '15 - 20 gm', min: 15, max: 20 },
  { label: '20+ gm', min: 20, max: Infinity },
] as const;

export const GHAAT_TRANSACTION_COLORS = {
  buy: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', hex: '#f59e0b' },
  sell: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', hex: '#10b981' },
} as const;

export const GHAAT_STATUS_COLORS = {
  pending: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  sold: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
} as const;

export const JEWELLERY_CATEGORY_COLORS: Record<string, string> = {
  'Bracelets': '#f59e0b',
  'Chains': '#3b82f6',
  'Jhoomke': '#ec4899',
  'Rings': '#8b5cf6',
  'Necklaces': '#10b981',
  'Pendants': '#06b6d4',
  'Bangles': '#f97316',
  'Earrings': '#e11d48',
  'Mangalsutra': '#84cc16',
  'Other': '#6b7280',
};

// ============================================================
// DARK TOOLTIP STYLE (for Recharts)
// ============================================================
export const DARK_TOOLTIP_STYLE = {
  backgroundColor: '#1f2937',
  border: '1px solid #374151',
  borderRadius: '8px',
  color: '#f3f4f6',
} as const;

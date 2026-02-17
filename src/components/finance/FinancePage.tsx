import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calendar, Search, Tag, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatCard } from '../ui/StatCard';
import { EmptyState } from '../ui/EmptyState';
import { PageSkeleton } from '../ui/Skeleton';
import { CategoryMultiSelect } from '../ui/CategoryMultiSelect';
import { MonthYearPicker } from '../ui/MonthYearPicker';
import { Input } from '../ui/Input';
import { DataTable, ColumnDef } from '../ui/DataTable';
import { useFinanceData, FinanceItem } from './useFinanceData';
import { FinanceFormModal } from './FinanceFormModal';
import { FinanceCategoryChart } from './FinanceCategoryChart';
import { FinanceMonthlyTrendChart } from './FinanceMonthlyTrendChart';
import { formatCurrency } from '../../utils/calculations';
import { StatVariant } from '../../lib/constants';

interface FinancePageConfig {
  type: 'expense' | 'income';
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconGradient: string;
  chartColor: string;
  statVariant: StatVariant;
  categories: readonly string[];
  categoryColors: Record<string, string>;
  loadFn: () => Promise<{ data: FinanceItem[]; error: string | null }>;
  addFn: (item: Omit<FinanceItem, 'id' | 'createdAt'>) => Promise<{ item: FinanceItem | null; error: string | null }>;
  updateFn: (item: FinanceItem) => Promise<{ item: FinanceItem | null; error: string | null }>;
  deleteFn: (id: string) => Promise<{ success: boolean; error: string | null }>;
}

export const FinancePage: React.FC<FinancePageConfig> = (config) => {
  const [items, setItems] = useState<FinanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FinanceItem | null>(null);

  const {
    filters,
    setMonthRange,
    setSelectedCategories,
    setSearchQuery,
    setSortBy,
    clearFilters,
    hasActiveFilters,
    analytics,
  } = useFinanceData(items, config.categoryColors);

  // Load data
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const { data, error } = await config.loadFn();
      if (!error && data) {
        setItems(data);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  // Form submit handler
  const handleFormSubmit = async (formData: { category: string; description: string; amount: number; date: string; paymentType: string }) => {
    if (editingItem) {
      const updated: FinanceItem = {
        ...editingItem,
        category: formData.category,
        description: formData.description,
        amount: formData.amount,
        date: new Date(formData.date),
        paymentType: formData.paymentType,
      };
      const { item, error } = await config.updateFn(updated);
      if (!error && item) {
        setItems(prev => prev.map(i => i.id === item.id ? item : i));
      }
    } else {
      const newItem = {
        category: formData.category,
        description: formData.description,
        amount: formData.amount,
        date: new Date(formData.date),
        paymentType: formData.paymentType,
      } as Omit<FinanceItem, 'id' | 'createdAt'>;
      const { item, error } = await config.addFn(newItem);
      if (!error && item) {
        setItems(prev => [item, ...prev]);
      }
    }
    setEditingItem(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete this ${config.type}?`)) return;
    const { success } = await config.deleteFn(id);
    if (success) {
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleEdit = (item: FinanceItem) => {
    setEditingItem(item);
    setShowFormModal(true);
  };

  // Table columns
  const columns: ColumnDef<FinanceItem>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      sortFn: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      render: (row) => (
        <span className="text-gray-300 text-sm whitespace-nowrap">
          {format(row.date instanceof Date ? row.date : new Date(row.date), 'MMM dd, yyyy')}
        </span>
      ),
      width: 'w-28',
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      sortFn: (a, b) => a.category.localeCompare(b.category),
      render: (row) => (
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
          style={{
            backgroundColor: `${config.categoryColors[row.category] || '#6b7280'}15`,
            color: config.categoryColors[row.category] || '#9ca3af',
            borderColor: `${config.categoryColors[row.category] || '#6b7280'}30`,
          }}
        >
          {row.category}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <span className="text-gray-300 truncate max-w-[200px] block">{row.description}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (row) => (
        <span className="text-xs text-gray-400 capitalize">
          {row.paymentType === 'bank_transfer' ? 'Bank' : row.paymentType}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      sortFn: (a, b) => a.amount - b.amount,
      render: (row) => (
        <span className={`font-semibold ${config.type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
      width: 'w-20',
    },
  ];

  if (isLoading) {
    return <PageSkeleton cards={4} />;
  }

  const Icon = config.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${config.iconGradient}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white font-display">{config.title}</h1>
            <p className="text-sm text-gray-400">{config.subtitle}</p>
          </div>
        </div>
        <Button onClick={() => { setEditingItem(null); setShowFormModal(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Add {config.type === 'expense' ? 'Expense' : 'Income'}
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-end">
            <div className="flex items-center gap-3 flex-wrap flex-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400 font-medium">From</span>
                <MonthYearPicker
                  value={filters.monthRange.startMonth}
                  onChange={(val) => setMonthRange({ ...filters.monthRange, startMonth: val })}
                />
              </div>
              <span className="text-gray-600 hidden lg:inline">—</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">To</span>
                <MonthYearPicker
                  value={filters.monthRange.endMonth}
                  onChange={(val) => setMonthRange({ ...filters.monthRange, endMonth: val })}
                />
              </div>
            </div>
            <div className="min-w-[180px]">
              <CategoryMultiSelect
                categories={config.categories as unknown as string[]}
                selected={filters.selectedCategories}
                onChange={setSelectedCategories}
                placeholder="All Categories"
              />
            </div>
            <div className="min-w-[200px]">
              <Input
                placeholder="Search description..."
                icon={<Search className="w-4 h-4" />}
                value={filters.searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={`Total ${config.title}`}
          value={formatCurrency(analytics.totalForPeriod)}
          icon={DollarSign}
          variant={config.statVariant}
          animationDelay={0}
        />
        <StatCard
          label="Average / Day"
          value={formatCurrency(Math.round(analytics.averagePerDay))}
          icon={Calendar}
          variant="purple"
          animationDelay={0.05}
        />
        <StatCard
          label="Top Category"
          value={analytics.topCategory?.name || 'N/A'}
          icon={Tag}
          variant="warning"
          animationDelay={0.1}
          subtitle={analytics.topCategory && (
            <span className="text-xs text-gray-400">{formatCurrency(analytics.topCategory.amount)}</span>
          )}
        />
        <StatCard
          label="vs Previous Period"
          value={analytics.monthOverMonthChange !== null
            ? `${analytics.monthOverMonthChange >= 0 ? '+' : ''}${analytics.monthOverMonthChange.toFixed(1)}%`
            : 'N/A'
          }
          icon={analytics.monthOverMonthChange !== null && analytics.monthOverMonthChange >= 0 ? TrendingUp : TrendingDown}
          variant={analytics.monthOverMonthChange !== null
            ? (config.type === 'expense'
              ? (analytics.monthOverMonthChange >= 0 ? 'danger' : 'success')
              : (analytics.monthOverMonthChange >= 0 ? 'success' : 'danger'))
            : 'default'
          }
          animationDelay={0.15}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinanceCategoryChart
          data={analytics.categoryBreakdown}
          total={analytics.totalForPeriod}
          title={`${config.type === 'expense' ? 'Expense' : 'Income'} Breakdown`}
        />
        <FinanceMonthlyTrendChart
          data={analytics.monthlyTrend}
          barColor={config.chartColor}
          title={`Monthly ${config.title}`}
        />
      </div>

      {/* Data Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              {config.title} Records
            </h3>
            <span className="text-xs text-gray-500">{analytics.itemCount} entries</span>
          </div>
          {analytics.filteredItems.length === 0 ? (
            <EmptyState
              icon={config.icon}
              title={`No ${config.type}s found`}
              description={hasActiveFilters
                ? 'Try adjusting your filters'
                : `Start tracking your ${config.type}s`
              }
              action={!hasActiveFilters ? {
                label: `Add First ${config.type === 'expense' ? 'Expense' : 'Income'}`,
                onClick: () => { setEditingItem(null); setShowFormModal(true); },
                icon: Plus,
              } : undefined}
            />
          ) : (
            <DataTable
              columns={columns}
              data={analytics.filteredItems}
              rowKey={(row) => row.id}
              pageSize={15}
            />
          )}
        </Card>
      </motion.div>

      {/* Form Modal */}
      <FinanceFormModal
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); setEditingItem(null); }}
        onSubmit={handleFormSubmit}
        editingItem={editingItem}
        categories={config.categories}
        title={editingItem
          ? `Edit ${config.type === 'expense' ? 'Expense' : 'Income'}`
          : `Add ${config.type === 'expense' ? 'Expense' : 'Income'}`
        }
      />
    </div>
  );
};

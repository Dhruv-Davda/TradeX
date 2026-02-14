import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  History,
  Search,
  Download,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Coins,
} from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { PageSkeleton } from '../ui/Skeleton';
import { TradeEditModal } from '../ui/TradeEditModal';
import { Trade } from '../../types';
import { formatCurrency, formatWeight } from '../../utils/calculations';
import { TradeService } from '../../services/tradeService';
import { getTradeTypeBadgeClasses } from '../../lib/constants';

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'amount_desc', label: 'Highest Amount' },
  { value: 'amount_asc', label: 'Lowest Amount' },
  { value: 'merchant', label: 'Merchant Name' },
];

const TYPE_PILLS = [
  { value: 'all', label: 'All' },
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'settlement', label: 'Settlement' },
];

const METAL_PILLS = [
  { value: 'all', label: 'All Metals' },
  { value: 'gold', label: 'Gold' },
  { value: 'silver', label: 'Silver' },
];

export const TradeHistory: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMetal, setFilterMetal] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Edit modal
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const loadTrades = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { trades: dbTrades, error: tradesError } = await TradeService.getTrades();
      if (tradesError) {
        setError(tradesError);
      } else {
        setTrades(dbTrades);
      }
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => { loadTrades(); }, [loadTrades]);

  // Filter + Sort
  const filteredTrades = useMemo(() => {
    let filtered = trades.filter(trade => {
      if (!trade) return false;

      const merchantName = trade.merchantName || '';
      const notes = trade.notes || '';
      const matchesSearch = !searchTerm ||
        merchantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notes.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = filterType === 'all' || trade.type === filterType;
      const matchesMetal = filterMetal === 'all' || trade.metalType === filterMetal;

      let matchesDate = true;
      if (dateFrom || dateTo) {
        const tradeDate = new Date(trade.tradeDate || trade.createdAt);
        if (dateFrom) matchesDate = tradeDate >= new Date(dateFrom);
        if (dateTo && matchesDate) matchesDate = tradeDate <= new Date(dateTo + 'T23:59:59');
      }

      return matchesSearch && matchesType && matchesMetal && matchesDate;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.tradeDate || b.createdAt).getTime() - new Date(a.tradeDate || a.createdAt).getTime();
        case 'date_asc':
          return new Date(a.tradeDate || a.createdAt).getTime() - new Date(b.tradeDate || b.createdAt).getTime();
        case 'amount_desc':
          return (b.totalAmount || 0) - (a.totalAmount || 0);
        case 'amount_asc':
          return (a.totalAmount || 0) - (b.totalAmount || 0);
        case 'merchant':
          return (a.merchantName || '').localeCompare(b.merchantName || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [trades, searchTerm, filterType, filterMetal, dateFrom, dateTo, sortBy]);

  // Running totals
  const summaryStats = useMemo(() => {
    const totalBuy = filteredTrades.filter(t => t.type === 'buy').reduce((s, t) => s + (t.totalAmount || 0), 0);
    const totalSell = filteredTrades.filter(t => t.type === 'sell').reduce((s, t) => s + (t.totalAmount || 0), 0);
    const transferCount = filteredTrades.filter(t => t.type === 'transfer').length;
    const settlementCount = filteredTrades.filter(t => t.type === 'settlement').length;
    return { totalBuy, totalSell, net: totalSell - totalBuy, transferCount, settlementCount };
  }, [filteredTrades]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTrades.length / itemsPerPage));
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTrades.slice(start, start + itemsPerPage);
  }, [filteredTrades, currentPage, itemsPerPage]);

  // Reset page when filters change
  React.useEffect(() => { setCurrentPage(1); }, [searchTerm, filterType, filterMetal, dateFrom, dateTo, sortBy, itemsPerPage]);

  const hasActiveFilters = filterType !== 'all' || filterMetal !== 'all' || dateFrom || dateTo || searchTerm;

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterMetal('all');
    setDateFrom('');
    setDateTo('');
    setSortBy('date_desc');
  };

  // CSV Export
  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Metal', 'Merchant', 'Weight', 'Price/Unit', 'Total Amount', 'Notes'];
    const rows = filteredTrades.map(t => [
      t.tradeDate ? format(new Date(t.tradeDate), 'yyyy-MM-dd') : format(new Date(t.createdAt), 'yyyy-MM-dd'),
      t.type,
      t.metalType || '',
      t.merchantName || '',
      t.weight?.toString() || '',
      t.pricePerUnit?.toString() || '',
      t.totalAmount?.toString() || '0',
      (t.notes || '').replace(/,/g, ';'),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Edit/Delete handlers
  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setShowEditModal(true);
  };

  const handleTradeUpdated = (updatedTrade: Trade) => {
    setTrades(prev => prev.map(t => t.id === updatedTrade.id ? updatedTrade : t));
    setEditingTrade(null);
  };

  const handleTradeDeleted = (tradeId: string) => {
    setTrades(prev => prev.filter(t => t.id !== tradeId));
    setEditingTrade(null);
  };

  const handleDeleteTrade = async (tradeId: string) => {
    if (!window.confirm('Are you sure you want to delete this trade?')) return;
    try {
      const { error } = await TradeService.deleteTrade(tradeId);
      if (error) {
        alert('Error deleting trade: ' + error);
        return;
      }
      setTrades(prev => prev.filter(t => t.id !== tradeId));
    } catch (err) {
      alert('Unexpected error deleting trade');
    }
  };

  if (isLoading) return <PageSkeleton cards={4} />;

  if (error) {
    return (
      <EmptyState
        icon={History}
        title="Error Loading Trades"
        description={error}
        action={{ label: 'Try Again', onClick: loadTrades }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
      >
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white font-display">Trade History</h1>
            <p className="text-gray-400 text-sm">View and manage all transactions</p>
          </div>
        </div>
        <Button onClick={exportCSV} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1.5" />
          Export CSV
        </Button>
      </motion.div>

      {/* Inline Filters */}
      <Card className="p-4 space-y-3">
        {/* Row 1: Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search merchants or notes..."
              icon={<Search className="w-4 h-4" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            />
          </div>
        </div>

        {/* Row 2: Type pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mr-1">Type:</span>
          {TYPE_PILLS.map(pill => (
            <button
              key={pill.value}
              onClick={() => setFilterType(pill.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                filterType === pill.value
                  ? pill.value === 'all'
                    ? 'bg-white/10 text-white border-white/20'
                    : `${getTradeTypeBadgeClasses(pill.value)} border`
                  : 'bg-transparent text-gray-500 border-secondary-600/50 hover:text-gray-300 hover:border-secondary-500'
              }`}
            >
              {pill.label}
            </button>
          ))}

          <span className="text-gray-700 mx-1">|</span>

          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mr-1">Metal:</span>
          {METAL_PILLS.map(pill => (
            <button
              key={pill.value}
              onClick={() => setFilterMetal(pill.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                filterMetal === pill.value
                  ? pill.value === 'all'
                    ? 'bg-white/10 text-white border-white/20'
                    : pill.value === 'gold'
                      ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30'
                      : 'bg-gray-400/10 text-gray-300 border-gray-400/30'
                  : 'bg-transparent text-gray-500 border-secondary-600/50 hover:text-gray-300 hover:border-secondary-500'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Row 3: Date range + Clear */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Date Range:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-secondary-800/50 border border-secondary-600/50 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:border-primary-500 focus:outline-none transition-colors"
            />
            <span className="text-gray-500 text-sm">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-secondary-800/50 border border-secondary-600/50 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:border-primary-500 focus:outline-none transition-colors"
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium transition-colors ml-auto"
            >
              <X className="w-3 h-3" />
              Clear All
            </button>
          )}
        </div>
      </Card>

      {/* Summary Bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1">
        <span className="text-sm text-gray-400">
          Showing <span className="text-white font-medium">{filteredTrades.length}</span> of{' '}
          <span className="text-white font-medium">{trades.length}</span> trades
        </span>
        <span className="hidden sm:inline text-gray-700">|</span>
        <span className="text-sm">
          <span className="text-gray-400">Purchases: </span>
          <span className="text-red-400 font-medium">{formatCurrency(summaryStats.totalBuy)}</span>
        </span>
        <span className="text-sm">
          <span className="text-gray-400">Sales: </span>
          <span className="text-green-400 font-medium">{formatCurrency(summaryStats.totalSell)}</span>
        </span>
        <span className="text-sm">
          <span className="text-gray-400">Net: </span>
          <span className={`font-semibold ${summaryStats.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {summaryStats.net >= 0 ? '+' : ''}{formatCurrency(summaryStats.net)}
          </span>
        </span>
        {summaryStats.transferCount > 0 && (
          <span className="text-sm text-gray-400">
            Transfers: <span className="text-purple-400 font-medium">{summaryStats.transferCount}</span>
          </span>
        )}
        {summaryStats.settlementCount > 0 && (
          <span className="text-sm text-gray-400">
            Settlements: <span className="text-amber-400 font-medium">{summaryStats.settlementCount}</span>
          </span>
        )}
      </div>

      {/* Trade Cards */}
      {paginatedTrades.length > 0 ? (
        <div className="space-y-3">
          {paginatedTrades.map((trade, index) => (
            <TradeCard
              key={trade.id}
              trade={trade}
              index={index}
              onEdit={handleEditTrade}
              onDelete={handleDeleteTrade}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Coins}
          title="No transactions found"
          description={hasActiveFilters ? 'Try adjusting your filters' : 'Start by adding your first trade'}
        />
      )}

      {/* Pagination */}
      {filteredTrades.length > 0 && (
        <Card className="p-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-secondary-800/50 border border-secondary-600/50 rounded-lg px-2 py-1 text-sm text-gray-300 focus:border-primary-500 focus:outline-none"
              >
                {ITEMS_PER_PAGE_OPTIONS.map(n => (
                  <option key={n} value={n} className="bg-secondary-800">{n}</option>
                ))}
              </select>
              <span className="text-sm text-gray-400">
                {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredTrades.length)} of {filteredTrades.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Prev
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-primary-500 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Edit Trade Modal */}
      <TradeEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTrade(null);
        }}
        trade={editingTrade}
        onTradeUpdated={handleTradeUpdated}
        onTradeDeleted={handleTradeDeleted}
      />
    </div>
  );
};

// ── Trade Card Component ──────────────────────────────────────

interface TradeCardProps {
  trade: Trade;
  index: number;
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
}

const TradeCard: React.FC<TradeCardProps> = ({ trade, index, onEdit, onDelete }) => {
  const tradeDate = trade.tradeDate || trade.createdAt;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
    >
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row justify-between gap-3">
          {/* Left: Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Row 1: Badges + Date */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${getTradeTypeBadgeClasses(trade.type)}`}>
                {trade.type}
              </span>
              {(trade.type === 'buy' || trade.type === 'sell') && trade.metalType && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                  trade.metalType === 'gold'
                    ? 'bg-yellow-400/10 text-yellow-400'
                    : 'bg-gray-400/10 text-gray-300'
                }`}>
                  {trade.metalType}
                </span>
              )}
              {trade.type === 'settlement' && trade.settlementType && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-gray-700 text-gray-300">
                  {trade.settlementType}
                </span>
              )}
              {(trade.type === 'buy' || trade.type === 'sell') && trade.settlementType && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize bg-gray-700/50 text-gray-400">
                  {trade.settlementType}
                </span>
              )}
              <span className="text-[11px] text-gray-500 ml-auto sm:ml-0">
                {tradeDate ? format(new Date(tradeDate), 'MMM dd, yyyy') : 'No date'}
              </span>
            </div>

            {/* Row 2: Merchant Name */}
            <p className="text-sm font-semibold text-white truncate">
              {trade.merchantName || 'Unknown'}
            </p>

            {/* Row 3: Details Grid */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {/* Buy/Sell details */}
              {(trade.type === 'buy' || trade.type === 'sell') && (
                <>
                  {trade.weight != null && trade.metalType && (
                    <Detail label="Weight" value={formatWeight(trade.weight, trade.metalType as 'gold' | 'silver')} />
                  )}
                  {trade.pricePerUnit != null && (
                    <Detail label={`Rate/${trade.metalType === 'gold' ? '10g' : 'kg'}`} value={formatCurrency(trade.pricePerUnit)} />
                  )}
                  {trade.type === 'buy' && trade.amountPaid != null && (
                    <Detail label="Paid" value={formatCurrency(trade.amountPaid)} />
                  )}
                  {trade.type === 'sell' && trade.amountReceived != null && (
                    <Detail label="Received" value={formatCurrency(trade.amountReceived)} />
                  )}
                  {trade.type === 'buy' && trade.amountPaid != null && trade.amountPaid < trade.totalAmount && (
                    <Detail label="Due" value={formatCurrency(trade.totalAmount - trade.amountPaid)} valueClass="text-red-400" />
                  )}
                  {trade.type === 'sell' && trade.amountReceived != null && trade.amountReceived < trade.totalAmount && (
                    <Detail label="Receivable" value={formatCurrency(trade.totalAmount - trade.amountReceived)} valueClass="text-orange-400" />
                  )}
                </>
              )}

              {/* Settlement details */}
              {trade.type === 'settlement' && (
                <>
                  {trade.settlementType && (
                    <Detail label="Type" value={trade.settlementType} capitalize />
                  )}
                  {trade.settlementDirection && (
                    <Detail
                      label="Direction"
                      value={trade.settlementDirection === 'receiving' ? 'Receiving' : 'Paying'}
                      valueClass={trade.settlementDirection === 'receiving' ? 'text-green-400' : 'text-orange-400'}
                    />
                  )}
                </>
              )}

              {/* Transfer details */}
              {trade.type === 'transfer' && (
                <>
                  {trade.pickupLocation && <Detail label="Pickup" value={trade.pickupLocation} />}
                  {trade.dropLocation && <Detail label="Drop" value={trade.dropLocation} />}
                  {trade.transferCharges != null && trade.transferCharges > 0 && (
                    <Detail label="Charges" value={formatCurrency(trade.transferCharges)} />
                  )}
                </>
              )}

              <Detail label="Total" value={formatCurrency(trade.totalAmount || 0)} valueClass="text-white font-semibold" />
            </div>

            {/* Row 4: Notes */}
            {trade.notes && (
              <p className="text-xs text-gray-500 truncate">
                <span className="text-gray-600">Note:</span> {trade.notes}
              </p>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex lg:flex-col items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(trade)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(trade.id)}
              className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// ── Detail Inline ─────────────────────────────────────────────

const Detail: React.FC<{
  label: string;
  value: string;
  valueClass?: string;
  capitalize?: boolean;
}> = ({ label, value, valueClass = 'text-white', capitalize }) => (
  <div className="flex items-baseline gap-1.5">
    <span className="text-gray-500 text-xs">{label}:</span>
    <span className={`text-sm ${valueClass} ${capitalize ? 'capitalize' : ''}`}>{value}</span>
  </div>
);

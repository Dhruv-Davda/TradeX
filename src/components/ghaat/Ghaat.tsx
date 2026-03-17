import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Gem, ShoppingCart, TrendingUp, Package, Scale, Clock, Coins, Hammer, Edit, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { StatCard } from '../ui/StatCard';
import { EmptyState } from '../ui/EmptyState';
import { PageSkeleton } from '../ui/Skeleton';
import { GhaatEditModal } from '../ui/GhaatEditModal';
import { GhaatTransaction } from '../../types';
import { GhaatService, GhaatStockItem } from '../../services/ghaatService';
import { RawGoldLedgerService } from '../../services/rawGoldLedgerService';
import { JewelleryCategoryService } from '../../services/jewelleryCategoryService';
import { DEFAULT_JEWELLERY_CATEGORIES, JEWELLERY_CATEGORY_COLORS, GHAAT_TRANSACTION_COLORS, GHAAT_STATUS_COLORS } from '../../lib/constants';

const ITEMS_PER_PAGE = 20;

export const Ghaat: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<GhaatTransaction[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rawGoldBalance, setRawGoldBalance] = useState(0);

  // Filter & pagination state
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);

  // Edit modal state
  const [editingTxn, setEditingTxn] = useState<GhaatTransaction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [txnResult, catResult, balanceResult] = await Promise.all([
          GhaatService.getTransactions(),
          JewelleryCategoryService.getCategories(),
          RawGoldLedgerService.getBalance(),
        ]);
        if (!txnResult.error) setTransactions(txnResult.transactions);
        if (!catResult.error) setCustomCategories(catResult.categories.map(c => c.name));
        if (!balanceResult.error) setRawGoldBalance(balanceResult.balance);
      } catch (error) {
        console.error('Error loading ghaat data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const stock = useMemo(() => GhaatService.calculateStock(transactions), [transactions]);
  const pnl = useMemo(() => GhaatService.calculatePnL(transactions), [transactions]);

  const allCategories = useMemo(() => {
    return [...new Set([...DEFAULT_JEWELLERY_CATEGORIES, ...customCategories])];
  }, [customCategories]);

  // Total stats
  const totalUnits = stock.reduce((s, item) => s + item.units, 0);
  const totalGrossWeight = stock.reduce((s, item) => s + item.totalGrossWeight, 0);
  const totalFineGold = stock.reduce((s, item) => s + item.totalFineGold, 0);

  // Pending items summary
  const pendingTxns = transactions.filter(t => t.type === 'sell' && t.status === 'pending');
  const pendingUnits = pendingTxns.reduce((s, t) => s + t.units, 0);
  const pendingFineGold = pendingTxns.reduce((s, t) => s + t.fineGold, 0);

  // Stock items with positive values only
  const stockWithData = useMemo(() => {
    return stock.filter(s => s.units > 0 || s.totalFineGold > 0);
  }, [stock]);

  // Filtered & paginated transactions
  const filteredTransactions = useMemo(() => {
    let txns = [...transactions];

    if (filterType !== 'all') {
      txns = txns.filter(t => t.type === filterType);
    }
    if (filterCategory) {
      txns = txns.filter(t => t.category === filterCategory);
    }
    if (dateRange.start) {
      txns = txns.filter(t => {
        const d = t.transactionDate || t.createdAt.toISOString().split('T')[0];
        return d >= dateRange.start;
      });
    }
    if (dateRange.end) {
      txns = txns.filter(t => {
        const d = t.transactionDate || t.createdAt.toISOString().split('T')[0];
        return d <= dateRange.end;
      });
    }

    return txns.sort((a, b) => {
      const da = a.transactionDate || a.createdAt.toISOString();
      const db = b.transactionDate || b.createdAt.toISOString();
      return db.localeCompare(da);
    });
  }, [transactions, filterType, filterCategory, dateRange]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterCategory, dateRange]);

  const handleCategoryClick = (category: string) => {
    setFilterCategory(prev => prev === category ? '' : category);
  };

  const getStockForCategory = (category: string): GhaatStockItem | undefined => {
    return stock.find(s => s.category === category);
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center">
            <Gem className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Ghaat — Jewellery Inventory</h1>
            <p className="text-gray-400">Track your jewellery stock by category</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/karigars')} variant="outline">
            <Hammer className="w-4 h-4 mr-2" /> Karigars
          </Button>
          <Button onClick={() => navigate('/ghaat-settlement')} variant="outline">
            <Scale className="w-4 h-4 mr-2" /> Settlement
          </Button>
          <Button onClick={() => navigate('/ghaat-buy')} className="bg-gradient-to-r from-amber-500 to-amber-600">
            <ShoppingCart className="w-4 h-4 mr-2" /> Buy from Karigar
          </Button>
          <Button onClick={() => navigate('/ghaat-sell')} className="bg-gradient-to-r from-emerald-500 to-emerald-600">
            <TrendingUp className="w-4 h-4 mr-2" /> Sell to Merchant
          </Button>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Units in Stock"
          value={`${totalUnits} pcs`}
          icon={Package}
          variant="info"
          animationDelay={0}
        />
        <StatCard
          label="Total Gross Weight"
          value={`${totalGrossWeight.toFixed(3)} gm`}
          icon={Scale}
          variant="silver"
          animationDelay={0.05}
        />
        <StatCard
          label="Total Fine Gold"
          value={`${totalFineGold.toFixed(3)} gm`}
          icon={Gem}
          variant="gold"
          animationDelay={0.1}
        />
        <StatCard
          label="Net Gold P&L"
          value={`${pnl.netGoldProfit >= 0 ? '+' : ''}${pnl.netGoldProfit.toFixed(3)} gm`}
          icon={TrendingUp}
          variant={pnl.netGoldProfit >= 0 ? 'success' : 'danger'}
          animationDelay={0.15}
          subtitle={
            <span className="text-[11px] text-gray-500">
              Sold: {pnl.totalSellFineGold.toFixed(3)} gm | Bought: {pnl.totalBuyFineGold.toFixed(3)} gm | Labor: {pnl.goldLaborPaid.toFixed(3)} gm
            </span>
          }
        />
        <div className="cursor-pointer" onClick={() => navigate('/raw-gold')}>
          <StatCard
            label="Raw Gold Balance"
            value={`${rawGoldBalance.toFixed(3)} gm`}
            icon={Coins}
            variant={rawGoldBalance >= 0 ? 'gold' : 'danger'}
            animationDelay={0.2}
            subtitle={<span className="text-[11px] text-gray-500">Tap to view ledger</span>}
          />
        </div>
      </div>

      {/* Pending with Merchants */}
      {pendingUnits > 0 && (
        <Card
          className="p-4 border-amber-500/20 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => navigate('/ghaat-sell')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-400">Pending with Merchants</h3>
                <p className="text-xs text-gray-500">{pendingUnits} pcs | {pendingFineGold.toFixed(3)} gm fine gold currently with merchants</p>
              </div>
            </div>
            <Button onClick={(e) => { e.stopPropagation(); navigate('/ghaat-sell'); }} variant="outline" size="sm" className="text-amber-400 border-amber-500/30">
              View
            </Button>
          </div>
        </Card>
      )}

      {transactions.length === 0 ? (
        <EmptyState
          icon={Gem}
          title="No Jewellery Transactions"
          description="Start by buying jewellery from a Karigar or recording a sale."
          action={{
            label: 'Buy from Karigar',
            onClick: () => navigate('/ghaat-buy'),
          }}
        />
      ) : (
        <>
          {/* Stock Summary Table */}
          {stockWithData.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">Stock by Category</h2>
                <p className="text-xs text-gray-500">Tap a category to filter transactions below</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="text-left p-3 text-gray-400 font-medium">Category</th>
                      <th className="text-right p-3 text-gray-400 font-medium">Units</th>
                      <th className="text-right p-3 text-gray-400 font-medium">Gross Weight</th>
                      <th className="text-right p-3 text-gray-400 font-medium">Fine Gold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockWithData.map(item => {
                      const color = JEWELLERY_CATEGORY_COLORS[item.category] || '#6b7280';
                      const isActive = filterCategory === item.category;
                      return (
                        <tr
                          key={item.category}
                          onClick={() => handleCategoryClick(item.category)}
                          className={`border-b border-white/5 cursor-pointer transition-colors ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
                        >
                          <td className="p-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                              <span className="text-white font-medium">{item.category}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right text-white">{item.units} pcs</td>
                          <td className="p-3 text-right text-gray-300">{item.totalGrossWeight.toFixed(3)} gm</td>
                          <td className="p-3 text-right text-yellow-400 font-medium">{item.totalFineGold.toFixed(3)} gm</td>
                        </tr>
                      );
                    })}
                    {/* Totals row */}
                    <tr className="bg-white/5 font-semibold">
                      <td className="p-3 text-gray-300">Total</td>
                      <td className="p-3 text-right text-white">{totalUnits} pcs</td>
                      <td className="p-3 text-right text-gray-300">{totalGrossWeight.toFixed(3)} gm</td>
                      <td className="p-3 text-right text-yellow-400">{totalFineGold.toFixed(3)} gm</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Transaction History */}
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Transaction History</h2>
              <p className="text-xs text-gray-500">{filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Filters */}
            <div className="px-4 py-3 border-b border-white/10 space-y-3">
              {/* Type pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'buy', 'sell'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      filterType === type
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {type === 'all' ? 'All' : type === 'buy' ? 'Buy' : 'Sell'}
                  </button>
                ))}

                {/* Category filter */}
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-gray-300 border-0 focus:outline-none focus:ring-1 focus:ring-white/20 cursor-pointer"
                >
                  <option value="" className="bg-gray-800">All Categories</option>
                  {allCategories.map(c => (
                    <option key={c} value={c} className="bg-gray-800">{c}</option>
                  ))}
                </select>

                {/* Clear filters */}
                {(filterType !== 'all' || filterCategory || dateRange.start || dateRange.end) && (
                  <button
                    onClick={() => { setFilterType('all'); setFilterCategory(''); setDateRange({ start: '', end: '' }); }}
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Date range */}
              <div className="flex items-center gap-3 flex-wrap">
                <CalendarDays className="w-4 h-4 text-gray-400" />
                <Input type="date" value={dateRange.start}
                  onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="w-auto !py-1.5 text-xs" />
                <span className="text-gray-500 text-xs">to</span>
                <Input type="date" value={dateRange.end}
                  onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="w-auto !py-1.5 text-xs" />
              </div>
            </div>

            {/* Transaction list */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="text-left p-3 text-gray-400 font-medium">Date</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Type</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Category</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Party</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Units</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Gross Wt</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Fine Gold</th>
                    <th className="text-center p-3 text-gray-400 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.length === 0 ? (
                    <tr><td colSpan={8} className="text-center p-8 text-gray-500">No transactions found</td></tr>
                  ) : (
                    paginatedTransactions.map(txn => {
                      const txnColor = GHAAT_TRANSACTION_COLORS[txn.type];
                      const partyName = txn.type === 'buy'
                        ? (txn.karigarName || txn.merchantName || '—')
                        : (txn.merchantName || '—');

                      return (
                        <tr key={txn.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-3 text-gray-300 whitespace-nowrap">
                            {txn.transactionDate
                              ? format(new Date(txn.transactionDate), 'dd MMM yyyy')
                              : format(new Date(txn.createdAt), 'dd MMM yyyy')}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${txnColor.bg} ${txnColor.text} border ${txnColor.border}`}>
                                {txn.type === 'buy' ? 'Buy' : 'Sell'}
                              </span>
                              {txn.type === 'sell' && txn.status && (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${GHAAT_STATUS_COLORS[txn.status].bg} ${GHAAT_STATUS_COLORS[txn.status].text} border ${GHAAT_STATUS_COLORS[txn.status].border}`}>
                                  {txn.status}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-white font-medium">{txn.category}</td>
                          <td className="p-3 text-gray-300">{partyName}</td>
                          <td className="p-3 text-right text-white">{txn.units}</td>
                          <td className="p-3 text-right text-gray-300">{txn.totalGrossWeight.toFixed(3)} gm</td>
                          <td className="p-3 text-right text-yellow-400 font-medium">{txn.fineGold.toFixed(3)} gm</td>
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setEditingTxn(txn); setShowEditModal(true); }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Edit Modal */}
      <GhaatEditModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingTxn(null); }}
        transaction={editingTxn}
        onTransactionUpdated={(updated) => {
          setTransactions(transactions.map(t => t.id === updated.id ? updated : t));
          setShowEditModal(false);
          setEditingTxn(null);
        }}
        onTransactionDeleted={(id) => {
          setTransactions(transactions.filter(t => t.id !== id));
          setShowEditModal(false);
          setEditingTxn(null);
        }}
        allCategories={allCategories}
      />
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Gem, ShoppingCart, TrendingUp, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatCard } from '../ui/StatCard';
import { EmptyState } from '../ui/EmptyState';
import { PageSkeleton } from '../ui/Skeleton';
import { GhaatTransaction } from '../../types';
import { GhaatService, GhaatStockItem, GhaatPnL } from '../../services/ghaatService';
import { JewelleryCategoryService } from '../../services/jewelleryCategoryService';
import { DEFAULT_JEWELLERY_CATEGORIES, WEIGHT_BRACKETS, JEWELLERY_CATEGORY_COLORS } from '../../lib/constants';

export const Ghaat: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<GhaatTransaction[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [txnResult, catResult] = await Promise.all([
          GhaatService.getTransactions(),
          JewelleryCategoryService.getCategories(),
        ]);
        if (!txnResult.error) setTransactions(txnResult.transactions);
        if (!catResult.error) setCustomCategories(catResult.categories.map(c => c.name));
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
    const cats = [...new Set([...DEFAULT_JEWELLERY_CATEGORIES, ...customCategories])];
    return cats;
  }, [customCategories]);

  // Total stats
  const totalUnits = stock.reduce((s, item) => s + item.units, 0);
  const totalFineGold = stock.reduce((s, item) => s + item.totalFineGold, 0);

  // Get stock for a specific category
  const getStockForCategory = (category: string): GhaatStockItem | undefined => {
    return stock.find(s => s.category === category);
  };

  // Get weight bracket breakdown for a category
  const getWeightBrackets = (category: string) => {
    const categoryTxns = transactions.filter(t => t.category === category);

    // Build a simple inventory: for each bracket, track buy and sell units/weight
    return WEIGHT_BRACKETS.map(bracket => {
      let buyUnits = 0, buyFineGold = 0;
      let sellUnits = 0, sellFineGold = 0;

      for (const txn of categoryTxns) {
        if (txn.grossWeightPerUnit >= bracket.min && txn.grossWeightPerUnit < bracket.max) {
          if (txn.type === 'buy') {
            buyUnits += txn.units;
            buyFineGold += txn.fineGold;
          } else {
            sellUnits += txn.units;
            sellFineGold += txn.fineGold;
          }
        }
      }

      return {
        ...bracket,
        units: buyUnits - sellUnits,
        fineGold: buyFineGold - sellFineGold,
      };
    }).filter(b => b.units > 0 || b.fineGold > 0);
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
          <Button onClick={() => navigate('/ghaat-buy')} className="bg-gradient-to-r from-amber-500 to-amber-600">
            <ShoppingCart className="w-4 h-4 mr-2" /> Buy from Karigar
          </Button>
          <Button onClick={() => navigate('/ghaat-sell')} className="bg-gradient-to-r from-emerald-500 to-emerald-600">
            <TrendingUp className="w-4 h-4 mr-2" /> Sell to Merchant
          </Button>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Units in Stock"
          value={`${totalUnits} pcs`}
          icon={Package}
          variant="info"
          animationDelay={0}
        />
        <StatCard
          label="Total Fine Gold in Stock"
          value={`${totalFineGold.toFixed(3)} gm`}
          icon={Gem}
          variant="gold"
          animationDelay={0.05}
        />
        <StatCard
          label="Net Gold P&L"
          value={`${pnl.netGoldProfit >= 0 ? '+' : ''}${pnl.netGoldProfit.toFixed(3)} gm`}
          icon={TrendingUp}
          variant={pnl.netGoldProfit >= 0 ? 'success' : 'danger'}
          animationDelay={0.1}
          subtitle={
            <span className="text-[11px] text-gray-500">
              Sold: {pnl.totalSellFineGold.toFixed(3)} gm | Bought: {pnl.totalBuyFineGold.toFixed(3)} gm | Labor: {pnl.goldLaborPaid.toFixed(3)} gm
            </span>
          }
        />
      </div>

      {/* Category Grid */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCategories.map((category, index) => {
            const catStock = getStockForCategory(category);
            const units = catStock?.units || 0;
            const fineGold = catStock?.totalFineGold || 0;
            const isExpanded = expandedCategory === category;
            const brackets = isExpanded ? getWeightBrackets(category) : [];
            const color = JEWELLERY_CATEGORY_COLORS[category] || '#6b7280';

            // Skip categories with no stock
            if (units <= 0 && fineGold <= 0) return null;

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="p-0 overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : category)}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <div className="text-left">
                        <h3 className="text-white font-semibold">{category}</h3>
                        <p className="text-sm text-gray-400">
                          {units} pcs • {fineGold.toFixed(3)} gm fine gold
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {/* Expanded Weight Brackets */}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/10"
                    >
                      {brackets.length > 0 ? (
                        <div className="p-4 space-y-2">
                          {brackets.map(bracket => (
                            <div key={bracket.label} className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg">
                              <span className="text-sm text-gray-300">{bracket.label}</span>
                              <div className="flex items-center space-x-4">
                                <span className="text-sm text-white font-medium">{bracket.units} pcs</span>
                                <span className="text-sm text-yellow-400">{bracket.fineGold.toFixed(3)} gm</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-sm text-gray-500">
                          No items in weight brackets
                        </div>
                      )}
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

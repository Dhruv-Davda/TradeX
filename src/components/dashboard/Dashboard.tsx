import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  DollarSign,
  Package,
  Scale,
  BarChart3,
  ArrowRight,
  Coins,
  Gem,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { subDays, startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatCard } from '../ui/StatCard';
import { EmptyState } from '../ui/EmptyState';
import { PageSkeleton } from '../ui/Skeleton';
import { formatCurrency, formatCurrencyCompact } from '../../utils/calculations';
import { TradeService } from '../../services/tradeService';
import { StockService } from '../../services/stockService';
import { GhaatService } from '../../services/ghaatService';
import { Trade } from '../../types';
import { useAuth } from '../../contexts/AuthContext-simple';
import { getTradeTypeBadgeClasses, DARK_TOOLTIP_STYLE } from '../../lib/constants';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trades, setTrades] = React.useState<Trade[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [stock, setStock] = React.useState<{ gold: number; silver: number }>({ gold: 0, silver: 0 });
  const [ghaatStockFineGold, setGhaatStockFineGold] = React.useState(0);

  const loadTrades = async () => {
    setLoading(true);
    setError(null);
    try {
      const { trades: dbTrades, error: tradesError } = await TradeService.getTrades();
      if (tradesError) {
        setError(tradesError);
        return;
      }
      setTrades(dbTrades);

      const { stock: dbStock, error: stockError } = await StockService.calculateAndUpdateStockFromTrades();
      if (!stockError && dbStock) {
        const stockObj = { gold: 0, silver: 0 };
        dbStock.forEach(stockItem => {
          if (stockItem.metalType === 'gold') stockObj.gold = stockItem.quantity;
          else if (stockItem.metalType === 'silver') stockObj.silver = stockItem.quantity;
        });
        setStock(stockObj);
      }

      // Load Ghaat data
      const { transactions: ghaatTxns } = await GhaatService.getTransactions();
      if (ghaatTxns.length > 0) {
        const stockItems = GhaatService.calculateStock(ghaatTxns);
        const totalFineGold = stockItems.reduce((sum, item) => sum + item.totalFineGold, 0);
        setGhaatStockFineGold(totalFineGold);
      }
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { loadTrades(); }, []);

  const stats = useMemo(() => {
    const totalRevenue = trades
      .filter(t => t.type === 'sell')
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const totalPurchases = trades
      .filter(t => t.type === 'buy')
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    return { totalRevenue, totalPurchases, goldStock: stock.gold, silverStock: stock.silver };
  }, [trades, stock]);

  // 7-day chart data
  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const dayTrades = trades.filter(t => {
        const d = new Date(t.tradeDate || t.createdAt);
        return d >= dayStart && d <= dayEnd;
      });
      return {
        day: format(day, 'EEE'),
        buys: dayTrades.filter(t => t.type === 'buy').reduce((s, t) => s + (t.totalAmount || 0), 0),
        sells: dayTrades.filter(t => t.type === 'sell').reduce((s, t) => s + (t.totalAmount || 0), 0),
      };
    });
  }, [trades]);

  // Recent 8 trades
  const recentTrades = useMemo(() => {
    return [...trades]
      .sort((a, b) => new Date(b.tradeDate || b.createdAt).getTime() - new Date(a.tradeDate || a.createdAt).getTime())
      .slice(0, 8);
  }, [trades]);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return <PageSkeleton cards={5} />;

  if (error) {
    return (
      <EmptyState
        icon={Coins}
        title="Error Loading Data"
        description={error}
        action={{ label: 'Try Again', onClick: loadTrades }}
      />
    );
  }

  const quickActions = [
    { title: 'Buy', description: 'Purchase metals', icon: ShoppingCart, color: 'from-green-500 to-green-600', path: '/buy' },
    { title: 'Sell', description: 'Sell to customers', icon: TrendingUp, color: 'from-blue-500 to-blue-600', path: '/sell' },
    { title: 'Transfer', description: 'Transfer metals', icon: RefreshCw, color: 'from-purple-500 to-purple-600', path: '/transfer' },
    { title: 'Settlement', description: 'Settle dues', icon: DollarSign, color: 'from-orange-500 to-orange-600', path: '/settlement' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold text-white font-display">
            {greeting}, {user?.businessName || 'Trader'}!
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {format(new Date(), 'EEEE, MMM dd yyyy')} &middot; Here's your trading overview
          </p>
        </div>
        <Button onClick={() => navigate('/analytics')} variant="outline" size="sm">
          <BarChart3 className="w-4 h-4 mr-1.5" />
          View Analytics
        </Button>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrencyCompact(stats.totalRevenue)}
          icon={TrendingUp}
          variant="success"
          animationDelay={0}
          subtitle={<span className="text-[11px] text-gray-500">{formatCurrency(stats.totalRevenue)}</span>}
        />
        <StatCard
          label="Total Purchases"
          value={formatCurrencyCompact(stats.totalPurchases)}
          icon={TrendingDown}
          variant="danger"
          animationDelay={0.05}
          subtitle={<span className="text-[11px] text-gray-500">{formatCurrency(stats.totalPurchases)}</span>}
        />
        <StatCard
          label="Gold Stock"
          value={`${stats.goldStock.toFixed(2)} gms`}
          icon={Package}
          variant="gold"
          animationDelay={0.1}
          subtitle={stats.goldStock < 0 ? <span className="text-xs text-red-400">Deficit</span> : undefined}
        />
        <StatCard
          label="Silver Stock"
          value={`${stats.silverStock.toFixed(2)} kg`}
          icon={Scale}
          variant="silver"
          animationDelay={0.15}
          subtitle={stats.silverStock < 0 ? <span className="text-xs text-red-400">Deficit</span> : undefined}
        />
        <StatCard
          label="Jewellery Stock"
          value={`${ghaatStockFineGold.toFixed(2)} gm`}
          icon={Gem}
          variant="gold"
          animationDelay={0.2}
          subtitle={<span className="text-[11px] text-gray-500">Fine gold in stock</span>}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card
                hover
                className="p-4 cursor-pointer group"
                onClick={() => navigate(action.path)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 bg-gradient-to-r ${action.color} rounded-xl flex items-center justify-center shrink-0`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white">{action.title}</h3>
                    <p className="text-xs text-gray-400 truncate">{action.description}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Chart + Recent Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Activity Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">7-Day Activity</h3>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => {
                      if (val >= 10000000) return `${(val / 10000000).toFixed(1)}Cr`;
                      if (val >= 100000) return `${(val / 100000).toFixed(0)}L`;
                      if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
                      return val;
                    }}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={DARK_TOOLTIP_STYLE}
                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'buys' ? 'Purchases' : 'Sales']}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Bar dataKey="buys" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={20} name="buys" />
                  <Bar dataKey="sells" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={20} name="sells" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Recent Transactions</h3>
              <button
                onClick={() => navigate('/history')}
                className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 font-medium"
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {recentTrades.length > 0 ? (
              <div className="space-y-2">
                {recentTrades.map((trade, index) => (
                  <motion.div
                    key={trade.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${getTradeTypeBadgeClasses(trade.type)}`}>
                        {trade.type}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">{trade.merchantName || 'Unknown'}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                          {trade.metalType && (
                            <span className="capitalize">{trade.metalType}</span>
                          )}
                          {trade.weight && trade.metalType && (
                            <>
                              <span>&middot;</span>
                              <span>{trade.weight}{trade.metalType === 'gold' ? 'g' : 'kg'}</span>
                            </>
                          )}
                          <span>&middot;</span>
                          <span>{format(new Date(trade.tradeDate || trade.createdAt), 'MMM dd')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold text-white">{formatCurrency(trade.totalAmount)}</p>
                      {trade.type === 'buy' && trade.amountPaid !== undefined && trade.amountPaid < trade.totalAmount && (
                        <p className="text-[10px] text-red-400">Due: {formatCurrency(trade.totalAmount - trade.amountPaid)}</p>
                      )}
                      {trade.type === 'sell' && trade.amountReceived !== undefined && trade.amountReceived < trade.totalAmount && (
                        <p className="text-[10px] text-orange-400">Recv: {formatCurrency(trade.totalAmount - trade.amountReceived)}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Coins}
                title="No transactions yet"
                description="Start by adding your first trade"
                action={{ label: 'Add Transaction', onClick: () => navigate('/buy') }}
              />
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

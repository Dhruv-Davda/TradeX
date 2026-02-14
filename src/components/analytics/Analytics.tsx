import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { Card } from '../ui/Card';
import { StatCard } from '../ui/StatCard';
import { PageSkeleton } from '../ui/Skeleton';
import { Trade, Expense, Income } from '../../types';
import { TradeService } from '../../services/tradeService';
import { IncomeService } from '../../services/incomeService';
import { ExpensesService } from '../../services/expensesService';
import { StockService } from '../../services/stockService';
import { ManualNetProfitService } from '../../services/manualNetProfitService';
import { formatCurrency, formatCurrencyCompact, formatCurrencyInCR } from '../../utils/calculations';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isWithinInterval } from 'date-fns';
import { MonthYearPicker } from '../ui/MonthYearPicker';
import { TRADE_TYPE_COLORS, METAL_TYPE_COLORS, DARK_TOOLTIP_STYLE } from '../../lib/constants';

export const Analytics: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stockSnapshots, setStockSnapshots] = useState<{
    endMonth: { goldGrams: number; silverGrams: number } | null;
    previousMonth: { goldGrams: number; silverGrams: number } | null;
  }>({ endMonth: null, previousMonth: null });
  const [manualNetProfit, setManualNetProfit] = useState<number>(0);

  // Load all data from database
  React.useEffect(() => {
    const loadAllData = async () => {
      try {
        const [tradesResult, expensesResult, incomeResult] = await Promise.all([
          TradeService.getTrades(),
          ExpensesService.getExpenses(),
          IncomeService.getIncome(),
        ]);

        if (!tradesResult.error) setTrades(tradesResult.trades);
        if (!expensesResult.error) setExpenses(expensesResult.expenses);
        if (!incomeResult.error) setIncome(incomeResult.income);
      } catch (error) {
        console.error('Error loading analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, []);

  const today = new Date();
  const [monthRange, setMonthRange] = useState({
    startMonth: format(startOfMonth(today), 'yyyy-MM'),
    endMonth: format(today, 'yyyy-MM')
  });

  // Load stock snapshots when month range changes
  React.useEffect(() => {
    const loadStockSnapshots = async () => {
      try {
        const [sy, sm] = monthRange.startMonth.split('-').map(Number);
        const [ey, em] = monthRange.endMonth.split('-').map(Number);

        const endMonthLastDay = endOfMonth(new Date(ey || today.getFullYear(), (em || 1) - 1, 1));
        const startMonthDate = new Date(sy || today.getFullYear(), (sm || 1) - 1, 1);
        const previousMonthLastDay = endOfMonth(subMonths(startMonthDate, 1));

        const [endSnapshot, prevSnapshot] = await Promise.all([
          StockService.getStockSnapshot(endMonthLastDay),
          StockService.getStockSnapshot(previousMonthLastDay)
        ]);

        setStockSnapshots({
          endMonth: { goldGrams: endSnapshot.goldGrams, silverGrams: endSnapshot.silverGrams },
          previousMonth: { goldGrams: prevSnapshot.goldGrams, silverGrams: prevSnapshot.silverGrams }
        });
      } catch (error) {
        console.error('Error loading stock snapshots:', error);
        setStockSnapshots({ endMonth: null, previousMonth: null });
      }
    };

    loadStockSnapshots();
  }, [monthRange]);

  // Load manual net profit when month range changes
  React.useEffect(() => {
    const loadManualNetProfit = async () => {
      try {
        const { netProfit, error } = await ManualNetProfitService.getNetProfitForMonthRange(
          monthRange.startMonth,
          monthRange.endMonth
        );
        setManualNetProfit(error ? 0 : netProfit);
      } catch (error) {
        setManualNetProfit(0);
      }
    };

    loadManualNetProfit();
  }, [monthRange]);

  const analytics = useMemo(() => {
    const [sy, sm] = monthRange.startMonth.split('-').map(Number);
    const [ey, em] = monthRange.endMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(sy || today.getFullYear(), (sm || 1) - 1, 1));
    const endDate = endOfMonth(new Date(ey || today.getFullYear(), (em || 1) - 1, 1));

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const filteredTrades = trades.filter(trade => {
      let tradeDateObj: Date | null = null;

      if (trade.tradeDate) {
        tradeDateObj = typeof trade.tradeDate === 'string'
          ? new Date(trade.tradeDate)
          : (trade.tradeDate as any) instanceof Date
            ? trade.tradeDate as Date
            : new Date(trade.tradeDate as any);
      } else if (trade.createdAt) {
        tradeDateObj = trade.createdAt instanceof Date
          ? trade.createdAt
          : new Date(trade.createdAt);
      }

      if (!tradeDateObj || isNaN(tradeDateObj.getTime())) return false;

      const tradeDateOnly = new Date(tradeDateObj.getFullYear(), tradeDateObj.getMonth(), tradeDateObj.getDate());
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

      return tradeDateOnly >= startDateOnly && tradeDateOnly <= endDateOnly;
    });

    const filteredExpenses = expenses.filter(expense => isWithinInterval(expense.date, { start: startDate, end: endDate }));
    const filteredIncome = income.filter(incomeItem => isWithinInterval(incomeItem.date, { start: startDate, end: endDate }));

    const buyTrades = filteredTrades.filter(t => t.type === 'buy');
    const sellTrades = filteredTrades.filter(t => t.type === 'sell');
    const transferTrades = filteredTrades.filter(t => t.type === 'transfer');

    const totalPurchases = buyTrades.reduce((sum, t) => {
      const amt = Number(t.totalAmount || 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
    const totalSales = sellTrades.reduce((sum, t) => {
      const amt = Number(t.totalAmount || 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
    const totalTransferCharges = transferTrades.reduce((sum, t) => sum + Number(t.transferCharges || 0), 0);

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalIncome = filteredIncome.reduce((sum, i) => sum + Number(i.amount), 0);
    const grossProfit = totalSales - totalPurchases + totalTransferCharges + totalIncome - totalExpenses;
    const netProfit = grossProfit;

    const goldDeltaGrams = stockSnapshots.endMonth && stockSnapshots.previousMonth
      ? stockSnapshots.endMonth.goldGrams - stockSnapshots.previousMonth.goldGrams
      : 0;
    const silverDeltaGrams = stockSnapshots.endMonth && stockSnapshots.previousMonth
      ? stockSnapshots.endMonth.silverGrams - stockSnapshots.previousMonth.silverGrams
      : 0;
    const silverDeltaKg = silverDeltaGrams / 1000;

    // Monthly data for the last 12 months
    const last12Months = eachMonthOfInterval({
      start: subMonths(new Date(), 11),
      end: new Date()
    });

    const monthlyData = last12Months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthTrades = filteredTrades.filter(trade => {
        const tradeDate = new Date(trade.tradeDate || trade.createdAt);
        return tradeDate >= monthStart && tradeDate <= monthEnd;
      });

      const monthExpenses = filteredExpenses.filter(expense => expense.date >= monthStart && expense.date <= monthEnd);
      const monthIncome = filteredIncome.filter(incomeItem => incomeItem.date >= monthStart && incomeItem.date <= monthEnd);

      const sales = monthTrades.filter(t => t.type === 'sell').reduce((sum, t) => sum + Number(t.totalAmount), 0);
      const purchases = monthTrades.filter(t => t.type === 'buy').reduce((sum, t) => sum + Number(t.totalAmount), 0);
      const transferCharges = monthTrades.filter(t => t.type === 'transfer').reduce((sum, t) => sum + Number(t.transferCharges || 0), 0);
      const expenseAmount = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const incomeAmount = monthIncome.reduce((sum, i) => sum + Number(i.amount), 0);

      return {
        month: format(month, 'MMM yyyy'),
        sales,
        purchases,
        transferCharges,
        expenses: expenseAmount,
        income: incomeAmount,
        profit: sales - purchases + transferCharges + incomeAmount - expenseAmount,
      };
    });

    // Trade type distribution using constants
    const tradeTypes = [
      { name: 'Buy', value: buyTrades.length, color: TRADE_TYPE_COLORS.buy.hex },
      { name: 'Sell', value: sellTrades.length, color: TRADE_TYPE_COLORS.sell.hex },
      { name: 'Transfer', value: filteredTrades.filter(t => t.type === 'transfer').length, color: TRADE_TYPE_COLORS.transfer.hex },
      { name: 'Settlement', value: filteredTrades.filter(t => t.type === 'settlement').length, color: TRADE_TYPE_COLORS.settlement.hex },
    ];

    // Metal type distribution using constants
    const metalDistribution = [
      { name: 'Gold', value: filteredTrades.filter(t => t.metalType === 'gold').length, color: METAL_TYPE_COLORS.gold.hex },
      { name: 'Silver', value: filteredTrades.filter(t => t.metalType === 'silver').length, color: METAL_TYPE_COLORS.silver.hex },
    ];

    const maxValue = Math.max(
      ...monthlyData.map(d => Math.max(d.sales, d.purchases, d.transferCharges, Math.abs(d.profit))),
      1
    );

    return {
      totalPurchases,
      totalSales,
      totalTransferCharges,
      totalExpenses,
      totalIncome,
      grossProfit,
      netProfit,
      monthlyData,
      tradeTypes,
      metalDistribution,
      totalTrades: filteredTrades.length,
      maxValue,
      goldDeltaGrams,
      silverDeltaKg,
    };
  }, [trades, expenses, income, monthRange, stockSnapshots]);

  if (isLoading) return <PageSkeleton cards={5} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center space-x-3"
      >
        <div className="w-11 h-11 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Analytics</h1>
          <p className="text-gray-400 text-sm">Business insights and performance metrics</p>
        </div>
      </motion.div>

      {/* Month Range Filter */}
      <Card className="p-5 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700/50 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-primary-500/20 to-primary-600/20 rounded-lg border border-primary-500/30">
              <Calendar className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Date Range</h3>
              <p className="text-gray-400 text-xs mt-0.5">Select period for analysis</p>
            </div>
          </div>

          <div className="flex items-end gap-4 w-full lg:w-auto justify-center lg:justify-end">
            <MonthYearPicker
              label="From"
              value={monthRange.startMonth}
              onChange={(value) => setMonthRange(prev => ({ ...prev, startMonth: value }))}
              className="w-44 sm:w-52"
            />
            <div className="flex items-center justify-center pb-2.5 px-2">
              <div className="w-6 h-px bg-gradient-to-r from-gray-600 via-gray-400 to-gray-600"></div>
            </div>
            <MonthYearPicker
              label="To"
              value={monthRange.endMonth}
              onChange={(value) => setMonthRange(prev => ({ ...prev, endMonth: value }))}
              className="w-44 sm:w-52"
            />
          </div>
        </div>
      </Card>

      {/* Stats Cards - Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          label="Total Sales"
          value={formatCurrencyCompact(analytics.totalSales)}
          icon={TrendingUp}
          variant="success"
          animationDelay={0}
          subtitle={<span className="text-[11px] text-gray-500">{formatCurrency(analytics.totalSales)}</span>}
        />
        <StatCard
          label="Total Purchases"
          value={formatCurrencyCompact(analytics.totalPurchases)}
          icon={TrendingDown}
          variant="danger"
          animationDelay={0.05}
          subtitle={<span className="text-[11px] text-gray-500">{formatCurrency(analytics.totalPurchases)}</span>}
        />
        <StatCard
          label="Other Income"
          value={formatCurrencyCompact(analytics.totalIncome)}
          icon={TrendingUp}
          variant="emerald"
          animationDelay={0.1}
          subtitle={<span className="text-[11px] text-gray-500">{formatCurrency(analytics.totalIncome)}</span>}
        />
        <StatCard
          label="Net Expenses"
          value={formatCurrencyCompact(analytics.totalExpenses)}
          icon={TrendingDown}
          variant="warning"
          animationDelay={0.15}
          subtitle={<span className="text-[11px] text-gray-500">{formatCurrency(analytics.totalExpenses)}</span>}
        />
        <StatCard
          label="Gross Profit"
          value={formatCurrencyCompact(analytics.grossProfit)}
          icon={DollarSign}
          variant={analytics.grossProfit >= 0 ? 'success' : 'danger'}
          animationDelay={0.2}
          subtitle={
            <div>
              <span className={`text-xs font-medium ${analytics.grossProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {analytics.grossProfit >= 0 ? 'Profit' : 'Loss'}
              </span>
              <span className="text-[11px] text-gray-500 ml-2">{formatCurrency(analytics.grossProfit)}</span>
            </div>
          }
        />
      </div>

      {/* Row 2: Net Profit + Manual Net Profit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <Card className="p-5 h-full">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-400 mb-1 font-medium">Net Profit</p>
                <p className="text-2xl font-bold text-white">{formatCurrencyCompact(analytics.grossProfit)}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{formatCurrency(analytics.grossProfit)}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-sm">
                  <span className={analytics.goldDeltaGrams >= 0 ? 'text-yellow-400' : 'text-yellow-500'}>
                    {analytics.goldDeltaGrams >= 0 ? '+' : ''}{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(analytics.goldDeltaGrams)} gm Gold
                  </span>
                  <span className={analytics.silverDeltaKg >= 0 ? 'text-gray-300' : 'text-gray-400'}>
                    {analytics.silverDeltaKg >= 0 ? '+' : ''}{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(analytics.silverDeltaKg)} kg Silver
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-xl shrink-0 ml-3 ${analytics.netProfit >= 0 ? 'bg-green-400/10' : 'bg-red-400/10'}`}>
                <BarChart3 className={`w-6 h-6 ${analytics.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`} />
              </div>
            </div>
          </Card>
        </motion.div>

        <StatCard
          label="Final Net Profit in ₹"
          value={formatCurrencyCompact(manualNetProfit)}
          icon={DollarSign}
          variant="default"
          animationDelay={0.3}
          subtitle={<span className="text-[11px] text-gray-500">{formatCurrency(manualNetProfit)}</span>}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Monthly Performance</h3>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCurrencyInCR(value)}
                    domain={[0, Math.max(analytics.maxValue * 1.1, 1000000)]}
                    width={55}
                  />
                  <Tooltip
                    contentStyle={DARK_TOOLTIP_STYLE}
                    formatter={(value: number) => [formatCurrencyInCR(value)]}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Bar dataKey="sales" fill={TRADE_TYPE_COLORS.sell.hex} name="Sales" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="purchases" fill="#ef4444" name="Purchases" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="transferCharges" fill={TRADE_TYPE_COLORS.transfer.hex} name="Transfer Profit" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="profit" fill={TRADE_TYPE_COLORS.buy.hex} name="Net Profit" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Trade Type Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Trade Distribution</h3>
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <div className="w-full lg:w-1/2" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.tradeTypes}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {analytics.tradeTypes.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={DARK_TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full lg:w-1/2 space-y-2">
                {analytics.tradeTypes.map((type) => (
                  <div key={type.name} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: type.color }} />
                      <span className="text-xs text-gray-300">{type.name}</span>
                    </div>
                    <span className="text-xs font-medium text-white">{type.value} trades</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Profit Trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Profit Trend</h3>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCurrencyInCR(value)}
                    domain={[0, Math.max(analytics.maxValue * 1.1, 1000000)]}
                    width={55}
                  />
                  <Tooltip
                    contentStyle={DARK_TOOLTIP_STYLE}
                    formatter={(value: number) => [formatCurrencyInCR(value), 'Profit']}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke={TRADE_TYPE_COLORS.sell.hex}
                    strokeWidth={2}
                    dot={{ fill: TRADE_TYPE_COLORS.sell.hex, strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Metal Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Metal Distribution</h3>
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <div className="w-full lg:w-1/2" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.metalDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {analytics.metalDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={DARK_TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full lg:w-1/2 space-y-2">
                {analytics.metalDistribution.map((metal) => (
                  <div key={metal.name} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: metal.color }} />
                      <span className="text-xs text-gray-300">{metal.name}</span>
                    </div>
                    <span className="text-xs font-medium text-white">{metal.value} trades</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

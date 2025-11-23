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
import { Trade, Expense, Income } from '../../types';
import { TradeService } from '../../services/tradeService';
import { IncomeService } from '../../services/incomeService';
import { ExpensesService } from '../../services/expensesService';
import { StockService } from '../../services/stockService';
import { ManualNetProfitService } from '../../services/manualNetProfitService';
import { formatCurrency, formatCurrencyInCR } from '../../utils/calculations';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isWithinInterval } from 'date-fns';
// Button import removed as monthly view no longer uses buttons
import { Input } from '../ui/Input';

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
        console.log('📊 Analytics: Loading all data from database...');
        
        // Load trades with consistent cache key
        const { trades: dbTrades, error: tradesError } = await TradeService.getTrades();
        if (tradesError) {
          console.error('❌ Analytics: Error loading trades:', tradesError);
        } else {
          console.log('✅ Analytics: Loaded', dbTrades.length, 'trades from database');
          setTrades(dbTrades);
        }

        // Load expenses
        const { expenses: dbExpenses, error: expensesError } = await ExpensesService.getExpenses();
        if (expensesError) {
          console.error('❌ Analytics: Error loading expenses:', expensesError);
        } else {
          console.log('✅ Analytics: Loaded', dbExpenses.length, 'expenses from database');
          setExpenses(dbExpenses);
        }

        // Load income
        const { income: dbIncome, error: incomeError } = await IncomeService.getIncome();
        if (incomeError) {
          console.error('❌ Analytics: Error loading income:', incomeError);
        } else {
          console.log('✅ Analytics: Loaded', dbIncome.length, 'income from database');
          setIncome(dbIncome);
        }
      } catch (error) {
        console.error('❌ Analytics: Unexpected error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, []);

  // Monthly view only (clean UI)
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
        
        // Last day of end month
        const endMonthLastDay = endOfMonth(new Date(ey || today.getFullYear(), (em || 1) - 1, 1));
        
        // Last day of previous month (startMonth - 1)
        const startMonthDate = new Date(sy || today.getFullYear(), (sm || 1) - 1, 1);
        const previousMonthLastDay = endOfMonth(subMonths(startMonthDate, 1));

        // Fetch both snapshots
        const [endSnapshot, prevSnapshot] = await Promise.all([
          StockService.getStockSnapshot(endMonthLastDay),
          StockService.getStockSnapshot(previousMonthLastDay)
        ]);

        setStockSnapshots({
          endMonth: {
            goldGrams: endSnapshot.goldGrams,
            silverGrams: endSnapshot.silverGrams
          },
          previousMonth: {
            goldGrams: prevSnapshot.goldGrams,
            silverGrams: prevSnapshot.silverGrams
          }
        });
      } catch (error) {
        console.error('❌ Error loading stock snapshots:', error);
        setStockSnapshots({ endMonth: null, previousMonth: null });
      }
    };

    loadStockSnapshots();
  }, [monthRange]);

  // Load manual net profit when month range changes
  React.useEffect(() => {
    const loadManualNetProfit = async () => {
      try {
        // If startMonth and endMonth are the same, fetch single month
        // Otherwise, sum up all months in the range
        const { netProfit, error } = await ManualNetProfitService.getNetProfitForMonthRange(
          monthRange.startMonth,
          monthRange.endMonth
        );

        if (error) {
          console.error('❌ Error loading manual net profit:', error);
          setManualNetProfit(0);
        } else {
          setManualNetProfit(netProfit);
          console.log(`📊 Manual Net Profit for ${monthRange.startMonth} to ${monthRange.endMonth}: ${netProfit}`);
        }
      } catch (error) {
        console.error('❌ Unexpected error loading manual net profit:', error);
        setManualNetProfit(0);
      }
    };

    loadManualNetProfit();
  }, [monthRange]);

  const analytics = useMemo(() => {
    // Filter by selected month range only
    let filteredTrades = trades;
    let filteredExpenses = expenses;
    let filteredIncome = income;

    const [sy, sm] = monthRange.startMonth.split('-').map(Number);
    const [ey, em] = monthRange.endMonth.split('-').map(Number);
    // For trades filtering: use start of month (1st) to end of month (30th/31st)
    // This ensures we only count trades that actually occurred in the selected month
    const startDate = startOfMonth(new Date(sy || today.getFullYear(), (sm || 1) - 1, 1));
    const endDate = endOfMonth(new Date(ey || today.getFullYear(), (em || 1) - 1, 1));
    
    // Ensure startDate is at midnight (00:00:00) and endDate is at end of day (23:59:59)
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    filteredTrades = trades.filter(trade => {
      // Handle tradeDate - convert to Date object
      let tradeDateObj: Date | null = null;
      
      if (trade.tradeDate) {
        // tradeDate is a string or Date object
        tradeDateObj = typeof trade.tradeDate === 'string' 
          ? new Date(trade.tradeDate) 
          : (trade.tradeDate as any) instanceof Date 
            ? trade.tradeDate as Date
            : new Date(trade.tradeDate as any);
      } else if (trade.createdAt) {
        // Fallback to createdAt only if tradeDate is missing
        tradeDateObj = trade.createdAt instanceof Date 
          ? trade.createdAt 
          : new Date(trade.createdAt);
      }
      
      if (!tradeDateObj || isNaN(tradeDateObj.getTime())) {
        return false;
      }
      
      // Compare dates (year, month, day only - ignore time)
      const tradeYear = tradeDateObj.getFullYear();
      const tradeMonth = tradeDateObj.getMonth();
      const tradeDay = tradeDateObj.getDate();
      
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth();
      const startDay = startDate.getDate();
      
      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth();
      const endDay = endDate.getDate();
      
      // Create comparable date objects
      const tradeDateOnly = new Date(tradeYear, tradeMonth, tradeDay);
      const startDateOnly = new Date(startYear, startMonth, startDay);
      const endDateOnly = new Date(endYear, endMonth, endDay);
      
      return tradeDateOnly >= startDateOnly && tradeDateOnly <= endDateOnly;
    });
    
    // Additional debug: Check how many trades have tradeDate vs createdAt
    const tradesWithTradeDate = trades.filter(t => t.tradeDate).length;
    const tradesWithoutTradeDate = trades.filter(t => !t.tradeDate && t.createdAt).length;
    console.log(`🔍 Total trades loaded: ${trades.length}`);
    console.log(`🔍 Trades with tradeDate: ${tradesWithTradeDate}, without (using createdAt): ${tradesWithoutTradeDate}`);
    
    console.log(`📊 Analytics: Filtered ${filteredTrades.length} trades for ${monthRange.startMonth} to ${monthRange.endMonth}`);
    console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    // Debug: Check date distribution
    const dateStats = filteredTrades.reduce((acc, t) => {
      const d = t.tradeDate || t.createdAt;
      const month = d ? new Date(d).getMonth() + 1 : 'unknown';
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('📊 Trades by month:', dateStats);
    
    filteredExpenses = expenses.filter(expense => isWithinInterval(expense.date, { start: startDate, end: endDate }));
    filteredIncome = income.filter(incomeItem => isWithinInterval(incomeItem.date, { start: startDate, end: endDate }));

    // Calculate basic metrics
    const buyTrades = filteredTrades.filter(t => t.type === 'buy');
    const sellTrades = filteredTrades.filter(t => t.type === 'sell');
    const transferTrades = filteredTrades.filter(t => t.type === 'transfer');
    
    // Debug: Check null/undefined totalAmount
    const buyNullAmount = buyTrades.filter(t => !t.totalAmount || t.totalAmount === 0).length;
    const sellNullAmount = sellTrades.filter(t => !t.totalAmount || t.totalAmount === 0).length;
    console.log(`⚠️ Buy trades with null/0 totalAmount: ${buyNullAmount}/${buyTrades.length}`);
    console.log(`⚠️ Sell trades with null/0 totalAmount: ${sellNullAmount}/${sellTrades.length}`);
    
    const totalPurchases = buyTrades.reduce((sum, t) => {
      const amt = Number(t.totalAmount || 0);
      if (isNaN(amt)) {
        console.warn('⚠️ Invalid totalAmount in buy trade:', t.id, t.totalAmount);
        return sum;
      }
      return sum + amt;
    }, 0);
    const totalSales = sellTrades.reduce((sum, t) => {
      const amt = Number(t.totalAmount || 0);
      if (isNaN(amt)) {
        console.warn('⚠️ Invalid totalAmount in sell trade:', t.id, t.totalAmount);
        return sum;
      }
      return sum + amt;
    }, 0);
    
    console.log(`💰 Total Purchases: ${totalPurchases.toLocaleString('en-IN')} (${buyTrades.length} trades)`);
    console.log(`💰 Total Sales: ${totalSales.toLocaleString('en-IN')} (${sellTrades.length} trades)`);
    const totalTransferCharges = transferTrades.reduce((sum, t) => sum + Number(t.transferCharges || 0), 0);
    
    // New formulas per request
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalIncome = filteredIncome.reduce((sum, i) => sum + Number(i.amount), 0);
    // Gross Profit = total sales - total purchases + transfer income + other income - expenses
    const grossProfit = Number(totalSales) - Number(totalPurchases) + Number(totalTransferCharges) + Number(totalIncome) - Number(totalExpenses);

    // Net Profit = gross profit (purely monetary)
    const netProfit = Number(grossProfit);

    // Stock deltas: Last day of end month - Last day of previous month (startMonth - 1)
    const goldDeltaGrams = stockSnapshots.endMonth && stockSnapshots.previousMonth
      ? stockSnapshots.endMonth.goldGrams - stockSnapshots.previousMonth.goldGrams
      : 0;
    
    const silverDeltaGrams = stockSnapshots.endMonth && stockSnapshots.previousMonth
      ? stockSnapshots.endMonth.silverGrams - stockSnapshots.previousMonth.silverGrams
      : 0;
    
    // Convert silver to kg with 4 decimals
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
        // Use tradeDate if available, otherwise fallback to createdAt
        const tradeDate = new Date(trade.tradeDate || trade.createdAt);
        return tradeDate >= monthStart && tradeDate <= monthEnd;
      });
      
      const monthExpenses = filteredExpenses.filter(expense => {
        return expense.date >= monthStart && expense.date <= monthEnd;
      });

      const monthIncome = filteredIncome.filter(incomeItem => {
        return incomeItem.date >= monthStart && incomeItem.date <= monthEnd;
      });

      const sales = monthTrades.filter(t => t.type === 'sell').reduce((sum, t) => sum + Number(t.totalAmount), 0);
      const purchases = monthTrades.filter(t => t.type === 'buy').reduce((sum, t) => sum + Number(t.totalAmount), 0);
      const transferCharges = monthTrades.filter(t => t.type === 'transfer').reduce((sum, t) => sum + Number(t.transferCharges || 0), 0);
      
      // Calculate settlements impact for this month
      const monthSettlementImpact = monthTrades.filter(t => t.type === 'settlement').reduce((sum, t) => {
        const amount = Number(t.totalAmount || 0);
        return sum + (t.settlementDirection === 'receiving' ? amount : -amount);
      }, 0);
      
      const expenseAmount = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const incomeAmount = monthIncome.reduce((sum, i) => sum + Number(i.amount), 0);

      return {
        month: format(month, 'MMM yyyy'),
        sales,
        purchases,
        transferCharges,
        settlementImpact: monthSettlementImpact,
        expenses: expenseAmount,
        income: incomeAmount,
        // Keep chart "profit" aligned to new GP formula for monthly bars
        profit: sales - purchases + transferCharges + incomeAmount - expenseAmount,
      };
    });

    // Trade type distribution
    const tradeTypes = [
      { name: 'Buy', value: buyTrades.length, color: '#10b981' },
      { name: 'Sell', value: sellTrades.length, color: '#3b82f6' },
      { name: 'Transfer', value: trades.filter(t => t.type === 'transfer').length, color: '#8b5cf6' },
      { name: 'Settlement', value: trades.filter(t => t.type === 'settlement').length, color: '#f59e0b' },
    ];

    // Metal type distribution
    const goldTrades = trades.filter(t => t.metalType === 'gold');
    const silverTrades = trades.filter(t => t.metalType === 'silver');
    
    const metalDistribution = [
      { name: 'Gold', value: goldTrades.length, color: '#fbbf24' },
      { name: 'Silver', value: silverTrades.length, color: '#6b7280' },
    ];

    // Calculate max value for chart scaling
    const maxValue = Math.max(
      ...monthlyData.map(d => Math.max(d.sales, d.purchases, d.transferCharges, d.profit))
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
      totalTrades: trades.length,
      maxValue,
      // Expose deltas: gold in grams, silver in kg (for display)
      goldDeltaGrams: goldDeltaGrams,
      silverDeltaKg: silverDeltaKg,
    };
  }, [trades, expenses, income, monthRange, stockSnapshots]);

  // Build cards in requested order
  const topCards = [
    {
      title: 'Total Sales',
      value: analytics.totalSales,
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      change: '+12%',
    },
    {
      title: 'Total Purchases',
      value: analytics.totalPurchases,
      icon: TrendingDown,
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
      change: '+8%',
    },
    {
      title: 'Other Income',
      value: analytics.totalIncome,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
      change: '+5%',
    },
    {
      title: 'Net Expenses',
      value: analytics.totalExpenses,
      icon: TrendingDown,
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10',
      change: '-5%',
    },
    {
      title: 'Gross Profit',
      value: analytics.grossProfit,
      icon: DollarSign,
      color: analytics.grossProfit >= 0 ? 'text-green-400' : 'text-red-400',
      bgColor: analytics.grossProfit >= 0 ? 'bg-green-400/10' : 'bg-red-400/10',
      change: '+15%',
    },
  ];

  const bottomCards = [
    {
      title: 'Net Profit',
      value: analytics.netProfit,
      icon: BarChart3,
      color: analytics.netProfit >= 0 ? 'text-green-400' : 'text-red-400',
      bgColor: analytics.netProfit >= 0 ? 'bg-green-400/10' : 'bg-red-400/10',
      change: '+10%',
    },
  ];

  const manualCards = [
    {
      title: 'Final Net Profit in ₹',
      value: manualNetProfit, // Fetched from database based on month range
      icon: DollarSign,
      color: 'text-primary-400',
      bgColor: 'bg-primary-400/10',
    }
  ];


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center space-x-3"
      >
        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400">Business insights and performance metrics</p>
        </div>
      </motion.div>

      {/* Month Range Filter (elegant design) */}
      <Card className="p-6 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700/50 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 md:gap-20 lg:gap-24">
          {/* Icon and Label Section */}
          <div className="flex items-center gap-3 min-w-fit">
            <div className="p-2.5 bg-gradient-to-br from-primary-500/20 to-primary-600/20 rounded-lg border border-primary-500/30">
              <Calendar className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Month Range</h3>
              <p className="text-gray-400 text-xs mt-0.5">Select period for analysis</p>
            </div>
          </div>

          {/* Date Inputs Section */}
          <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:w-48">
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">From</label>
              <Input
                type="month"
                value={monthRange.startMonth}
                onChange={(e) => setMonthRange(prev => ({ ...prev, startMonth: e.target.value }))}
                className="w-full bg-gray-800/60 border-gray-600/50 hover:border-gray-500/70 focus:border-primary-400/70 focus:ring-2 focus:ring-primary-400/20 transition-all duration-200"
              />
            </div>
            
            <div className="hidden sm:flex items-center justify-center px-2">
              <div className="w-10 h-px bg-gradient-to-r from-transparent via-gray-500 to-transparent"></div>
            </div>
            
            <div className="relative flex-1 sm:flex-initial sm:w-48">
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">To</label>
              <Input
                type="month"
                value={monthRange.endMonth}
                onChange={(e) => setMonthRange(prev => ({ ...prev, endMonth: e.target.value }))}
                className="w-full bg-gray-800/60 border-gray-600/50 hover:border-gray-500/70 focus:border-primary-400/70 focus:ring-2 focus:ring-primary-400/20 transition-all duration-200"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Cards - Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {topCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card hover className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className={`text-xs ${stat.color}`}>{stat.change}</span>
              </div>
              <p className="text-sm text-gray-400 mb-1">{stat.title}</p>
              <p className="text-xl font-bold text-white">{formatCurrency(stat.value)}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Row 2: Net Profit cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4">
        {bottomCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card hover className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className={`text-xs ${stat.color}`}>{stat.change}</span>
              </div>
              <p className="text-sm text-gray-400 mb-1">{stat.title}</p>
              {/* Net Profit breakdown in bold format */}
              <p className="text-lg font-bold text-white mt-2">
                {(() => {
                  const fmtGold = (val: number) => {
                    const sign = val >= 0 ? '+' : '-';
                    const abs = Math.abs(val);
                    const formatted = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(abs);
                    return `${sign} ${formatted} gm`;
                  };
                  const fmtSilver = (val: number) => {
                    const sign = val >= 0 ? '+' : '-';
                    const abs = Math.abs(val);
                    const formatted = new Intl.NumberFormat('en-IN', { 
                      minimumFractionDigits: 4, 
                      maximumFractionDigits: 4 
                    }).format(abs);
                    return `${sign} ${formatted} kg`;
                  };
                  const grossFormatted = formatCurrency(analytics.grossProfit);
                  return `${grossFormatted} ${fmtGold(analytics.goldDeltaGrams)} Gold ${fmtSilver(analytics.silverDeltaKg)} Silver`;
                })()}
              </p>
            </Card>
          </motion.div>
        ))}

        {/* Manual Net Profit (Rupees) */}
        {manualCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card hover className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-1">{stat.title}</p>
              <p className="text-xl font-bold text-white">{formatCurrency(stat.value)}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Monthly Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
              <YAxis 
                stroke="#9ca3af" 
                fontSize={12}
                tickFormatter={(value) => formatCurrencyInCR(value)}
                domain={[0, Math.max(analytics.maxValue * 1.1, 1000000)]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [formatCurrencyInCR(value)]}
              />
              <Bar dataKey="sales" fill="#10b981" name="Sales" />
              <Bar dataKey="purchases" fill="#ef4444" name="Purchases" />
              <Bar dataKey="transferCharges" fill="#8b5cf6" name="Transfer Profit" />
              <Bar dataKey="profit" fill="#3b82f6" name="Net Profit" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Trade Type Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Trade Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.tradeTypes}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {analytics.tradeTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {analytics.tradeTypes.map((type) => (
              <div key={type.name} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: type.color }}
                />
                <span className="text-sm text-gray-300">{type.name}: {type.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Profit Trend */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Profit Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
              <YAxis 
                stroke="#9ca3af" 
                fontSize={12}
                tickFormatter={(value) => formatCurrencyInCR(value)}
                domain={[0, Math.max(analytics.maxValue * 1.1, 1000000)]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [formatCurrencyInCR(value), 'Profit']}
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Metal Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Metal Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.metalDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {analytics.metalDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {analytics.metalDistribution.map((metal) => (
              <div key={metal.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: metal.color }}
                  />
                  <span className="text-sm text-gray-300">{metal.name}</span>
                </div>
                <span className="text-sm text-white font-medium">{metal.value} trades</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

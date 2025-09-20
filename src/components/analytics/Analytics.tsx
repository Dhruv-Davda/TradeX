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
import { formatCurrency, formatCurrencyInCR } from '../../utils/calculations';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export const Analytics: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [showDateFilter, setShowDateFilter] = useState(false);

  const analytics = useMemo(() => {
    // Filter trades, expenses, and income by date range if specified
    let filteredTrades = trades;
    let filteredExpenses = expenses;
    let filteredIncome = income;

    if (dateRange.startDate && dateRange.endDate) {
      const startDate = startOfDay(new Date(dateRange.startDate));
      const endDate = endOfDay(new Date(dateRange.endDate));
      
      filteredTrades = trades.filter(trade => {
        // Use tradeDate if available, otherwise fallback to createdAt
        const tradeDate = trade.tradeDate || trade.createdAt;
        return isWithinInterval(new Date(tradeDate), { start: startDate, end: endDate });
      });
      filteredExpenses = expenses.filter(expense => 
        isWithinInterval(expense.date, { start: startDate, end: endDate })
      );
      filteredIncome = income.filter(incomeItem => 
        isWithinInterval(incomeItem.date, { start: startDate, end: endDate })
      );
    }

    // Calculate basic metrics
    const buyTrades = filteredTrades.filter(t => t.type === 'buy');
    const sellTrades = filteredTrades.filter(t => t.type === 'sell');
    const transferTrades = filteredTrades.filter(t => t.type === 'transfer');
    
    const totalPurchases = buyTrades.reduce((sum, t) => sum + Number(t.totalAmount), 0);
    const totalSales = sellTrades.reduce((sum, t) => sum + Number(t.totalAmount), 0);
    const totalTransferCharges = transferTrades.reduce((sum, t) => sum + Number(t.transferCharges || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalIncome = filteredIncome.reduce((sum, i) => sum + Number(i.amount), 0);
    const grossProfit = Number(totalSales) - Number(totalPurchases) + Number(totalTransferCharges);
    const netProfit = Number(grossProfit) - Number(totalExpenses) + Number(totalIncome);

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
      const expenseAmount = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const incomeAmount = monthIncome.reduce((sum, i) => sum + Number(i.amount), 0);

      return {
        month: format(month, 'MMM yyyy'),
        sales,
        purchases,
        transferCharges,
        expenses: expenseAmount,
        income: incomeAmount,
        profit: sales - purchases + transferCharges - expenseAmount + incomeAmount,
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
    };
  }, [trades, expenses, income, dateRange]);

  const statsCards = [
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
      title: 'Gross Profit',
      value: analytics.grossProfit,
      icon: DollarSign,
      color: analytics.grossProfit >= 0 ? 'text-green-400' : 'text-red-400',
      bgColor: analytics.grossProfit >= 0 ? 'bg-green-400/10' : 'bg-red-400/10',
      change: '+15%',
    },
    {
      title: 'Net Profit',
      value: analytics.netProfit,
      icon: BarChart3,
      color: analytics.netProfit >= 0 ? 'text-green-400' : 'text-red-400',
      bgColor: analytics.netProfit >= 0 ? 'bg-green-400/10' : 'bg-red-400/10',
      change: '+10%',
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

      {/* Date Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Calendar className="w-5 h-5 text-primary-400" />
              <span className="text-white font-medium">Date Range Filter</span>
              {dateRange.startDate && dateRange.endDate && (
                <span className="text-sm text-gray-400">
                  {format(new Date(dateRange.startDate), 'MMM dd, yyyy')} - {format(new Date(dateRange.endDate), 'MMM dd, yyyy')}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {showDateFilter ? (
                <>
                  <Input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-40"
                  />
                  <span className="text-gray-400">to</span>
                  <Input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-40"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDateRange({ startDate: '', endDate: '' });
                      setShowDateFilter(false);
                    }}
                  >
                    Clear
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDateFilter(true)}
                >
                  Filter by Date
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statsCards.map((stat, index) => (
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
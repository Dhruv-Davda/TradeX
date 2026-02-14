import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../utils/calculations';
import { DARK_TOOLTIP_STYLE } from '../../lib/constants';

interface MonthlyData {
  month: string;
  amount: number;
}

interface FinanceMonthlyTrendChartProps {
  data: MonthlyData[];
  barColor: string;
  title: string;
}

export const FinanceMonthlyTrendChart: React.FC<FinanceMonthlyTrendChartProps> = ({
  data,
  barColor,
  title,
}) => {
  if (data.length === 0) {
    return (
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
          No data for this period
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">{title}</h3>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#9ca3af"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => val.split(' ')[0]}
            />
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
              width={55}
            />
            <Tooltip
              contentStyle={DARK_TOOLTIP_STYLE}
              formatter={(value: number) => [formatCurrency(value), 'Amount']}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Bar
              dataKey="amount"
              fill={barColor}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

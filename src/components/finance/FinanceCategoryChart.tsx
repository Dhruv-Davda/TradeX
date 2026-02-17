import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../utils/calculations';
import { DARK_TOOLTIP_STYLE } from '../../lib/constants';

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface FinanceCategoryChartProps {
  data: CategoryData[];
  total: number;
  title: string;
}

export const FinanceCategoryChart: React.FC<FinanceCategoryChartProps> = ({
  data,
  total,
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
      <div className="flex flex-col lg:flex-row items-center gap-4">
        <div className="w-full lg:w-1/2" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={DARK_TOOLTIP_STYLE}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full lg:w-1/2 grid grid-cols-1 gap-1.5 max-h-52 overflow-y-auto">
          {data.map((item) => {
            const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
            return (
              <div key={item.name} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.02]">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-300 truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs text-gray-400">{pct}%</span>
                  <span className="text-xs font-medium text-white">{formatCurrency(item.value)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

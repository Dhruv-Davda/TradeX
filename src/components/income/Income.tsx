import React from 'react';
import { TrendingUp } from 'lucide-react';
import { FinancePage } from '../finance/FinancePage';
import { FinanceItem } from '../finance/useFinanceData';
import { IncomeService } from '../../services/incomeService';
import { INCOME_CATEGORIES, INCOME_CATEGORY_COLORS } from '../../lib/constants';
import { Income } from '../../types';

export const IncomeManagement: React.FC = () => {
  return (
    <FinancePage
      type="income"
      title="Income"
      subtitle="Track and analyze business income"
      icon={TrendingUp}
      iconGradient="from-green-500 to-emerald-600"
      chartColor="#10b981"
      statVariant="success"
      categories={INCOME_CATEGORIES}
      categoryColors={INCOME_CATEGORY_COLORS}
      loadFn={async () => {
        const { income, error } = await IncomeService.getIncome();
        return { data: income as FinanceItem[], error };
      }}
      addFn={async (item) => {
        const { income, error } = await IncomeService.addIncome({
          category: item.category,
          description: item.description,
          amount: item.amount,
          date: item.date instanceof Date ? item.date : new Date(item.date),
          paymentType: item.paymentType as any,
        });
        return { item: income as FinanceItem | null, error };
      }}
      updateFn={async (item) => {
        const { income, error } = await IncomeService.updateIncome({
          id: item.id,
          category: item.category,
          description: item.description,
          amount: item.amount,
          date: item.date instanceof Date ? item.date : new Date(item.date),
          paymentType: item.paymentType as any,
          createdAt: item.createdAt,
        } as Income);
        return { item: income as FinanceItem | null, error };
      }}
      deleteFn={async (id) => {
        return await IncomeService.deleteIncome(id);
      }}
    />
  );
};

import React from 'react';
import { Receipt } from 'lucide-react';
import { FinancePage } from '../finance/FinancePage';
import { FinanceItem } from '../finance/useFinanceData';
import { ExpensesService } from '../../services/expensesService';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_COLORS } from '../../lib/constants';
import { Expense } from '../../types';

export const Expenses: React.FC = () => {
  return (
    <FinancePage
      type="expense"
      title="Expenses"
      subtitle="Track and analyze business expenses"
      icon={Receipt}
      iconGradient="from-red-500 to-pink-600"
      chartColor="#ef4444"
      statVariant="danger"
      categories={EXPENSE_CATEGORIES}
      categoryColors={EXPENSE_CATEGORY_COLORS}
      loadFn={async () => {
        const { expenses, error } = await ExpensesService.getExpenses();
        return { data: expenses as FinanceItem[], error };
      }}
      addFn={async (item) => {
        const { expense, error } = await ExpensesService.addExpense({
          category: item.category,
          description: item.description,
          amount: item.amount,
          date: item.date instanceof Date ? item.date : new Date(item.date),
          paymentType: item.paymentType as any,
        });
        return { item: expense as FinanceItem | null, error };
      }}
      updateFn={async (item) => {
        const { expense, error } = await ExpensesService.updateExpense({
          id: item.id,
          category: item.category,
          description: item.description,
          amount: item.amount,
          date: item.date instanceof Date ? item.date : new Date(item.date),
          paymentType: item.paymentType as any,
          createdAt: item.createdAt,
        } as Expense);
        return { item: expense as FinanceItem | null, error };
      }}
      deleteFn={async (id) => {
        return await ExpensesService.deleteExpense(id);
      }}
    />
  );
};

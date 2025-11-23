import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { TrendingUp, Plus, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { Income, PaymentType } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { IncomeService } from '../../services/incomeService';

interface IncomeFormData {
  category: string;
  description: string;
  amount: number;
  date: string;
  paymentType: PaymentType;
}

const INCOME_CATEGORIES = [
  'Rent Income',
  'Interest on Loans',
  'F&O Trading',
  'IPO Gains',
  'Brokerage Income',
  'Dividend Income',
  'Capital Gains',
  'Consulting Fees',
  'Investment Returns',
  'Other Income',
];

export const IncomeManagement: React.FC = () => {
  const [income, setIncome] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  // Load income from database
  React.useEffect(() => {
    const loadIncome = async () => {
      try {
        console.log('💰 Income: Loading income from database...');
        const { income: dbIncome, error } = await IncomeService.getIncome();
        if (error) {
          console.error('❌ Income: Error loading income:', error);
        } else {
          console.log('✅ Income: Loaded', dbIncome.length, 'income records from database');
          setIncome(dbIncome);
        }
      } catch (error) {
        console.error('❌ Income: Unexpected error loading income:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadIncome();
  }, []);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<IncomeFormData>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      paymentType: 'cash',
    }
  });

  const onSubmit = async (data: IncomeFormData) => {
    if (editingIncome) {
      // Update existing income
      const updatedIncomeData: Income = {
        ...editingIncome,
        category: data.category,
        description: data.description,
        amount: data.amount,
        date: new Date(data.date),
        paymentType: data.paymentType,
      };

      console.log('📝 Updating income in database:', updatedIncomeData);
      
      try {
        const { income: savedIncome, error } = await IncomeService.updateIncome(updatedIncomeData);
        if (error) {
          console.error('❌ Error updating income:', error);
          alert('Error updating income: ' + error);
          return;
        }
        
        console.log('✅ Income updated successfully:', savedIncome);
        
        // Update local state for immediate UI update
        const updatedIncome = income.map(exp => 
          exp.id === editingIncome.id ? savedIncome! : exp
        );
        setIncome(updatedIncome);
        setEditingIncome(null);
      } catch (error) {
        console.error('❌ Unexpected error updating income:', error);
        alert('Unexpected error updating income');
        return;
      }
    } else {
      // Add new income
      const newIncomeData: Omit<Income, 'id' | 'createdAt'> = {
        category: data.category,
        description: data.description,
        amount: data.amount,
        date: new Date(data.date),
        paymentType: data.paymentType,
      };

      
      try {
        const { income: savedIncome, error } = await IncomeService.addIncome(newIncomeData);
        if (error) {
          console.error('❌ Error adding income:', error);
          alert('Error adding income: ' + error);
          return;
        }
        
        console.log('✅ Income added successfully:', savedIncome);
        
        // Update local state for immediate UI update
        setIncome([...income, savedIncome!]);
      } catch (error) {
        console.error('❌ Unexpected error adding income:', error);
        alert('Unexpected error adding income');
        return;
      }
    }
    
    reset();
    setShowAddModal(false);
  };

  const handleEdit = (incomeItem: Income) => {
    setEditingIncome(incomeItem);
    setValue('category', incomeItem.category);
    setValue('description', incomeItem.description);
    setValue('amount', incomeItem.amount);
    setValue('date', format(incomeItem.date, 'yyyy-MM-dd'));
    setValue('paymentType', incomeItem.paymentType);
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this income entry?')) {
      console.log('🗑️ Deleting income from database');
      
      try {
        const { error } = await IncomeService.deleteIncome(id);
        if (error) {
          console.error('❌ Error deleting income:', error);
          alert('Error deleting income: ' + error);
          return;
        }
        
        console.log('✅ Income deleted successfully');
        
        // Update local state for immediate UI update
        setIncome(income.filter(exp => exp.id !== id));
      } catch (error) {
        console.error('❌ Unexpected error deleting income:', error);
        alert('Unexpected error deleting income');
      }
    }
  };

  const handleAddNew = () => {
    setEditingIncome(null);
    reset();
    setShowAddModal(true);
  };

  const totalIncome = income.reduce((sum, exp) => Number(sum) + Number(exp.amount), 0);

  // Calculate this month's income (from 1st of current month to today)
  const thisMonthIncome = income
    .filter(incomeItem => {
      const incomeDate = new Date(incomeItem.date);
      const now = new Date();
      return incomeDate.getMonth() === now.getMonth() && 
             incomeDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, incomeItem) => Number(sum) + Number(incomeItem.amount), 0);

  // Group income by category
  const incomeByCategory = income.reduce((acc, incomeItem) => {
    acc[incomeItem.category] = Number((acc[incomeItem.category] || 0)) + Number(incomeItem.amount);
    return acc;
  }, {} as Record<string, number>);

  const categoryOptions = [
    { value: '', label: 'Select Category' },
    ...INCOME_CATEGORIES.map(cat => ({ value: cat, label: cat }))
  ];

  const paymentOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading income...</p>
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
        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Income</h1>
          <p className="text-gray-400">Track additional income sources</p>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Income</p>
              <p className="text-xl font-bold text-white">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">This Month</p>
              <p className="text-xl font-bold text-white">
                {formatCurrency(thisMonthIncome)}
              </p>
            </div>
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Categories</p>
              <p className="text-xl font-bold text-white">{Object.keys(incomeByCategory).length}</p>
            </div>
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Add Income Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex justify-end"
      >
        <Button onClick={handleAddNew} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Income</span>
        </Button>
      </motion.div>

      {/* Income List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Income History</h3>
          {income.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No income entries yet</p>
              <p className="text-sm text-gray-500">Add your first income source to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {income
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((incomeItem, index) => (
                  <motion.div
                    key={incomeItem.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{incomeItem.category}</h4>
                          <p className="text-sm text-gray-400">{incomeItem.description}</p>
                          <p className="text-xs text-gray-500">
                            {format(incomeItem.date, 'MMM dd, yyyy')} • {incomeItem.paymentType === 'cash' ? 'Cash' : 'Bank Transfer'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-bold text-green-400">
                        {formatCurrency(incomeItem.amount)}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(incomeItem)}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(incomeItem.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingIncome(null);
          reset();
        }}
        title={editingIncome ? 'Edit Income' : 'Add Income'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            options={categoryOptions}
            label="Category"
            {...register('category', { required: 'Category is required' })}
            error={errors.category?.message}
          />

          <Input
            label="Description"
            placeholder="Enter income description"
            {...register('description', { required: 'Description is required' })}
            error={errors.description?.message}
          />

          <Input
            label="Amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('amount', { 
              required: 'Amount is required',
              min: { value: 0.01, message: 'Amount must be greater than 0' }
            })}
            error={errors.amount?.message}
          />

          <Input
            label="Date"
            type="date"
            {...register('date', { required: 'Date is required' })}
            error={errors.date?.message}
          />

          <Select
            options={paymentOptions}
            label="Payment Method"
            {...register('paymentType', { required: 'Payment method is required' })}
            error={errors.paymentType?.message}
          />

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setEditingIncome(null);
                reset();
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editingIncome ? 'Update Income' : 'Add Income'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

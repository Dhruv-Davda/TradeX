import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { PAYMENT_TYPE_OPTIONS } from '../../lib/constants';
import { FinanceItem } from './useFinanceData';

interface FormData {
  category: string;
  description: string;
  amount: number;
  date: string;
  paymentType: string;
}

interface FinanceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  editingItem: FinanceItem | null;
  categories: readonly string[];
  title: string;
}

export const FinanceFormModal: React.FC<FinanceFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingItem,
  categories,
  title,
}) => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: {
      category: categories[0] as string,
      description: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      paymentType: 'cash',
    },
  });

  useEffect(() => {
    if (editingItem) {
      reset({
        category: editingItem.category,
        description: editingItem.description,
        amount: editingItem.amount,
        date: editingItem.date instanceof Date
          ? editingItem.date.toISOString().split('T')[0]
          : new Date(editingItem.date).toISOString().split('T')[0],
        paymentType: editingItem.paymentType,
      });
    } else {
      reset({
        category: categories[0] as string,
        description: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        paymentType: 'cash',
      });
    }
  }, [editingItem, isOpen, reset, categories]);

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Select
          label="Category"
          options={categories.map(c => ({ value: c, label: c }))}
          {...register('category', { required: 'Category is required' })}
          error={errors.category?.message}
        />
        <Input
          label="Description"
          placeholder="Enter description"
          {...register('description', { required: 'Description is required' })}
          error={errors.description?.message}
        />
        <Input
          label="Amount"
          type="number"
          placeholder="Enter amount"
          {...register('amount', {
            required: 'Amount is required',
            valueAsNumber: true,
            min: { value: 1, message: 'Amount must be positive' },
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
          label="Payment Type"
          options={PAYMENT_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          {...register('paymentType')}
        />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            {editingItem ? 'Update' : 'Add'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

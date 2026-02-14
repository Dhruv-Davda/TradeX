import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from './Modal';
import { Input } from './Input';
import { Select } from './Select';
import { Button } from './Button';
import { GhaatTransaction } from '../../types';
import { GhaatService } from '../../services/ghaatService';
import { DEFAULT_JEWELLERY_CATEGORIES } from '../../lib/constants';

interface EditGhaatFormData {
  category: string;
  units: number;
  grossWeightPerUnit: number;
  purity: number;
  laborType: string;
  laborAmount: number;
  amountReceived: number;
  date: string;
  notes: string;
}

interface GhaatEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: GhaatTransaction | null;
  onTransactionUpdated: (updated: GhaatTransaction) => void;
  onTransactionDeleted?: (id: string) => void;
  allCategories?: string[];
}

export const GhaatEditModal: React.FC<GhaatEditModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onTransactionUpdated,
  onTransactionDeleted,
  allCategories,
}) => {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EditGhaatFormData>();
  const watchedValues = watch();

  const categoryOptions = (allCategories || [...DEFAULT_JEWELLERY_CATEGORIES]).map(c => ({ value: c, label: c }));

  useEffect(() => {
    if (transaction && isOpen) {
      setValue('category', transaction.category);
      setValue('units', transaction.units);
      setValue('grossWeightPerUnit', transaction.grossWeightPerUnit);
      setValue('purity', transaction.purity);
      setValue('laborType', transaction.laborType || 'cash');
      setValue('laborAmount', transaction.laborAmount || 0);
      setValue('amountReceived', transaction.amountReceived || 0);
      setValue('notes', transaction.notes || '');

      const txnDate = transaction.transactionDate
        ? new Date(transaction.transactionDate).toISOString().split('T')[0]
        : new Date(transaction.createdAt).toISOString().split('T')[0];
      setValue('date', txnDate);
    }
  }, [transaction, isOpen, setValue]);

  // Auto-calculate display values
  const units = Number(watchedValues.units) || 0;
  const weightPerUnit = Number(watchedValues.grossWeightPerUnit) || 0;
  const purity = Number(watchedValues.purity) || 0;
  const totalGrossWeight = units * weightPerUnit;
  const fineGold = totalGrossWeight * purity / 100;

  const handleUpdate = async (data: EditGhaatFormData) => {
    if (!transaction) return;

    try {
      const totalGW = Number(data.units) * Number(data.grossWeightPerUnit);
      const fg = totalGW * Number(data.purity) / 100;

      const { transaction: updated, error } = await GhaatService.updateTransaction(transaction.id, {
        category: data.category,
        units: Number(data.units),
        grossWeightPerUnit: Number(data.grossWeightPerUnit),
        purity: Number(data.purity),
        totalGrossWeight: totalGW,
        fineGold: fg,
        laborType: data.laborType as 'cash' | 'gold',
        laborAmount: Number(data.laborAmount) || 0,
        amountReceived: transaction.type === 'sell' ? Number(data.amountReceived) || 0 : undefined,
        notes: data.notes || undefined,
        transactionDate: data.date,
      });

      if (error) {
        alert('Error updating transaction: ' + error);
        return;
      }

      if (updated) {
        onTransactionUpdated(updated);
        handleClose();
      }
    } catch (error) {
      alert('Unexpected error updating transaction');
    }
  };

  const handleDelete = async () => {
    if (!transaction || !onTransactionDeleted) return;
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const { error } = await GhaatService.deleteTransaction(transaction.id);
      if (error) {
        alert('Error deleting transaction: ' + error);
        return;
      }
      onTransactionDeleted(transaction.id);
      handleClose();
    } catch {
      alert('Unexpected error deleting transaction');
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Edit ${transaction?.type === 'buy' ? 'Buy' : 'Sell'} Transaction`}>
      <form onSubmit={handleSubmit(handleUpdate)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <Select
              {...register('category', { required: 'Category is required' })}
              options={categoryOptions}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
            <Input
              {...register('date', { required: 'Date is required' })}
              type="date"
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Units</label>
            <Input
              {...register('units', { required: true, min: 1 })}
              type="number"
              step="1"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Weight/Unit (gm)</label>
            <Input
              {...register('grossWeightPerUnit', { required: true, min: 0.001 })}
              type="number"
              step="0.001"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Purity %</label>
            <Input
              {...register('purity', { required: true, min: 1, max: 100 })}
              type="number"
              step="0.01"
              className="w-full"
            />
          </div>
        </div>

        {/* Auto-calculated display */}
        <div className="bg-white/5 rounded-lg p-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-400">Total Gross Weight:</span>
            <span className="text-white ml-2 font-medium">{totalGrossWeight.toFixed(3)} gm</span>
          </div>
          <div>
            <span className="text-gray-400">Fine Gold:</span>
            <span className="text-yellow-400 ml-2 font-medium">{fineGold.toFixed(3)} gm</span>
          </div>
        </div>

        {/* Labor */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Labor Type</label>
            <Select
              {...register('laborType')}
              options={[
                { value: 'cash', label: 'Cash (₹)' },
                { value: 'gold', label: 'Gold (gm)' },
              ]}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Labor Amount ({watchedValues.laborType === 'gold' ? 'gm' : '₹'})
            </label>
            <Input
              {...register('laborAmount')}
              type="number"
              step="0.01"
              className="w-full"
            />
          </div>
        </div>

        {/* Amount Received (sell only) */}
        {transaction?.type === 'sell' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Amount Received (₹)</label>
            <Input
              {...register('amountReceived')}
              type="number"
              step="0.01"
              className="w-full"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Notes (Optional)</label>
          <Input
            {...register('notes')}
            placeholder="Enter any notes"
            className="w-full"
          />
        </div>

        <div className="flex space-x-3 pt-4">
          {onTransactionDeleted && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              className="text-red-400 border-red-400/50 hover:bg-red-400/10"
            >
              Delete
            </Button>
          )}
          <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            Update
          </Button>
        </div>
      </form>
    </Modal>
  );
};

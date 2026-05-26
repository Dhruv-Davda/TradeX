import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from './Modal';
import { Input } from './Input';
import { Select } from './Select';
import { Button } from './Button';
import { GhaatTransaction } from '../../types';
import { GhaatService } from '../../services/ghaatService';
import { RawGoldLedgerService } from '../../services/rawGoldLedgerService';
import { DEFAULT_JEWELLERY_CATEGORIES } from '../../lib/constants';

interface EditGhaatFormData {
  category: string;
  units: number;
  totalGrossWeight: number;
  purity: number;
  laborType: string;
  laborAmount: number;
  date: string;
  notes: string;
  goldGivenWeight: number;
  goldGivenPurity: number;
  cashPaid: number;
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
      setValue('totalGrossWeight', transaction.totalGrossWeight);
      setValue('purity', transaction.purity);
      setValue('laborType', transaction.laborType || 'cash');
      setValue('laborAmount', transaction.laborAmount || 0);
      setValue('notes', transaction.notes || '');
      setValue('goldGivenWeight', transaction.goldGivenWeight || 0);
      setValue('goldGivenPurity', transaction.goldGivenPurity || 0);
      setValue('cashPaid', transaction.cashPaid || 0);

      const txnDate = transaction.transactionDate
        ? new Date(transaction.transactionDate).toISOString().split('T')[0]
        : new Date(transaction.createdAt).toISOString().split('T')[0];
      setValue('date', txnDate);
    }
  }, [transaction, isOpen, setValue]);

  // Auto-calculate display values
  const units = Number(watchedValues.units) || 0;
  const totalGrossWeight = Number(watchedValues.totalGrossWeight) || 0;
  const purity = Number(watchedValues.purity) || 0;
  const grossWeightPerUnit = units > 0 ? totalGrossWeight / units : 0;
  const fineGold = totalGrossWeight * purity / 100;
  const editGoldGivenWeight = Number(watchedValues.goldGivenWeight) || 0;
  const editGoldGivenPurity = Number(watchedValues.goldGivenPurity) || 0;
  const editGoldGivenFine = editGoldGivenWeight * editGoldGivenPurity / 100;

  const handleUpdate = async (data: EditGhaatFormData) => {
    if (!transaction) return;

    try {
      const totalGW = Number(data.totalGrossWeight);
      const numUnits = Number(data.units);
      const gwPerUnit = numUnits > 0 ? totalGW / numUnits : 0;
      const fg = totalGW * Number(data.purity) / 100;

      const goldGW = Number(data.goldGivenWeight) || 0;
      const goldGP = Number(data.goldGivenPurity) || 0;
      const goldGF = goldGW * goldGP / 100;
      const cp = Number(data.cashPaid) || 0;

      const { transaction: updated, error } = await GhaatService.updateTransaction(transaction.id, {
        category: data.category,
        units: numUnits,
        grossWeightPerUnit: gwPerUnit,
        purity: Number(data.purity),
        totalGrossWeight: totalGW,
        fineGold: fg,
        laborType: data.laborType as 'cash' | 'gold',
        laborAmount: Number(data.laborAmount) || 0,
        notes: data.notes || undefined,
        transactionDate: data.date,
        goldGivenWeight: transaction.type === 'buy' ? (goldGW || undefined) : undefined,
        goldGivenPurity: transaction.type === 'buy' ? (goldGP || undefined) : undefined,
        goldGivenFine: transaction.type === 'buy' ? (goldGF || undefined) : undefined,
        cashPaid: transaction.type === 'buy' ? (cp || undefined) : undefined,
      });

      // Sync raw gold ledger for buy transactions
      if (transaction.type === 'buy' && !error) {
        if (goldGF > 0) {
          // Update or create ledger entry
          await RawGoldLedgerService.updateByReferenceId(transaction.id, {
            grossWeight: goldGW,
            purity: goldGP,
            fineGold: goldGF,
            cashAmount: cp || undefined,
            transactionDate: data.date,
          });
        } else {
          // Remove ledger entry if gold given was cleared
          await RawGoldLedgerService.deleteByReferenceId(transaction.id);
        }
      }

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
      {transaction?.type === 'sell' && transaction.merchantName && (
        <div className="mb-4 text-sm text-gray-400">— {transaction.merchantName}</div>
      )}

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
            <label className="block text-sm font-medium text-gray-300 mb-2">Total Weight (gm)</label>
            <Input
              {...register('totalGrossWeight', { required: true, min: 0.001 })}
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

        {/* Payment to Karigar (buy transactions only) */}
        {transaction?.type === 'buy' && (
          <div className="border border-white/10 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Payment to Karigar</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Gold Given (gm)</label>
                <Input
                  {...register('goldGivenWeight')}
                  type="number"
                  step="0.001"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Gold Purity (%)</label>
                <Input
                  {...register('goldGivenPurity')}
                  type="number"
                  step="0.01"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Cash Paid (₹)</label>
                <Input
                  {...register('cashPaid')}
                  type="number"
                  step="1"
                  className="w-full"
                />
              </div>
            </div>
            {editGoldGivenFine > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-amber-400">Fine Gold Given:</span>
                  <span className="text-amber-300 font-bold">{editGoldGivenFine.toFixed(3)} gm</span>
                </div>
              </div>
            )}
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

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from './Modal';
import { Input } from './Input';
import { Select } from './Select';
import { Button } from './Button';
import { GhaatTransaction } from '../../types';
import { GhaatService } from '../../services/ghaatService';
import { RawGoldLedgerService } from '../../services/rawGoldLedgerService';
import { DEFAULT_JEWELLERY_CATEGORIES, GHAAT_STATUS_COLORS } from '../../lib/constants';
import { formatCurrency } from '../../utils/calculations';

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
      setValue('grossWeightPerUnit', transaction.grossWeightPerUnit);
      setValue('purity', transaction.purity);
      setValue('laborType', transaction.laborType || 'cash');
      setValue('laborAmount', transaction.laborAmount || 0);
      setValue('amountReceived', transaction.amountReceived || 0);
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

  const isSold = transaction?.type === 'sell' && transaction?.status === 'sold';
  const isPending = transaction?.type === 'sell' && transaction?.status === 'pending';

  // Auto-calculate display values
  const units = Number(watchedValues.units) || 0;
  const weightPerUnit = Number(watchedValues.grossWeightPerUnit) || 0;
  const purity = Number(watchedValues.purity) || 0;
  const totalGrossWeight = units * weightPerUnit;
  const fineGold = totalGrossWeight * purity / 100;
  const editGoldGivenWeight = Number(watchedValues.goldGivenWeight) || 0;
  const editGoldGivenPurity = Number(watchedValues.goldGivenPurity) || 0;
  const editGoldGivenFine = editGoldGivenWeight * editGoldGivenPurity / 100;

  const handleUpdate = async (data: EditGhaatFormData) => {
    if (!transaction) return;

    try {
      const totalGW = Number(data.units) * Number(data.grossWeightPerUnit);
      const fg = totalGW * Number(data.purity) / 100;

      const goldGW = Number(data.goldGivenWeight) || 0;
      const goldGP = Number(data.goldGivenPurity) || 0;
      const goldGF = goldGW * goldGP / 100;
      const cp = Number(data.cashPaid) || 0;

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
      {/* Status Badge */}
      {transaction?.type === 'sell' && transaction.status && (
        <div className="mb-4">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${GHAAT_STATUS_COLORS[transaction.status].bg} ${GHAAT_STATUS_COLORS[transaction.status].text} border ${GHAAT_STATUS_COLORS[transaction.status].border}`}>
            {transaction.status === 'pending' ? 'Pending with Merchant' : 'Sold & Confirmed'}
          </span>
          {transaction.merchantName && (
            <span className="ml-2 text-sm text-gray-400">— {transaction.merchantName}</span>
          )}
        </div>
      )}

      {/* Sold Transaction — Read-only Confirmation Details */}
      {isSold && (
        <div className="mb-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg space-y-3">
          <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Confirmation Details</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500 block">Rate / 10gm</span>
              <span className="text-white font-medium">{formatCurrency(transaction?.ratePer10gm || 0)}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Total Amount</span>
              <span className="text-white font-medium">{formatCurrency(transaction?.totalAmount || 0)}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Confirmed Units</span>
              <span className="text-white font-medium">{transaction?.confirmedUnits} pcs</span>
            </div>
            <div>
              <span className="text-gray-500 block">Confirmed Fine Gold</span>
              <span className="text-yellow-400 font-medium">{transaction?.confirmedFineGold?.toFixed(3)} gm</span>
            </div>
            <div>
              <span className="text-gray-500 block">Settlement</span>
              <span className="text-white font-medium capitalize">{transaction?.settlementType || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Confirmed Date</span>
              <span className="text-white font-medium">{transaction?.confirmedDate || '-'}</span>
            </div>
            {(transaction?.settlementType === 'gold' || transaction?.settlementType === 'mixed') && (
              <div>
                <span className="text-gray-500 block">Gold Returned</span>
                <span className="text-yellow-400 font-medium">
                  {transaction?.goldReturnedWeight?.toFixed(3)} gm @ {transaction?.goldReturnedPurity}% = {transaction?.goldReturnedFine?.toFixed(3)} gm fine
                </span>
              </div>
            )}
            {(transaction?.settlementType === 'cash' || transaction?.settlementType === 'mixed') && (
              <div>
                <span className="text-gray-500 block">Cash Received</span>
                <span className="text-green-400 font-medium">{formatCurrency(transaction?.cashReceived || 0)}</span>
              </div>
            )}
            {(transaction?.duesShortfall || 0) > 0 && (
              <div>
                <span className="text-gray-500 block">Dues Shortfall</span>
                <span className="text-red-400 font-medium">{formatCurrency(transaction?.duesShortfall || 0)}</span>
              </div>
            )}
          </div>
        </div>
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

        {/* Amount Received (legacy sell only — no status) */}
        {transaction?.type === 'sell' && !transaction.status && (
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
          <Button type="submit" className="flex-1" disabled={isSold}>
            {isSold ? 'Read Only' : 'Update'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

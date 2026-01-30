import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from './Modal';
import { Input } from './Input';
import { Select } from './Select';
import { Button } from './Button';
import { Trade, TradeType, MetalType } from '../../types';
import { TradeService } from '../../services/tradeService';

export interface EditTradeFormData {
  type: TradeType;
  merchantName: string;
  metalType: MetalType;
  weight: number;
  pricePerUnit: number;
  totalAmount: number;
  date: string;
  notes?: string;
}

interface TradeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: Trade | null;
  onTradeUpdated: (updatedTrade: Trade) => void;
  onTradeDeleted?: (tradeId: string) => void;
}

export const TradeEditModal: React.FC<TradeEditModalProps> = ({
  isOpen,
  onClose,
  trade,
  onTradeUpdated,
  onTradeDeleted
}) => {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EditTradeFormData>();
  const watchedValues = watch();

  // Populate form when trade changes
  useEffect(() => {
    if (trade && isOpen) {
      setValue('type', trade.type);
      setValue('merchantName', trade.merchantName);
      setValue('metalType', trade.metalType || 'gold');
      setValue('weight', trade.weight || 0);
      setValue('pricePerUnit', trade.pricePerUnit || 0);
      setValue('totalAmount', trade.totalAmount);

      // Format date for input field (YYYY-MM-DD format)
      const tradeDate = trade.tradeDate
        ? new Date(trade.tradeDate).toISOString().split('T')[0]
        : trade.createdAt
          ? new Date(trade.createdAt).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
      setValue('date', tradeDate);
      setValue('notes', trade.notes || '');
    }
  }, [trade, isOpen, setValue]);

  // Auto-calculate totalAmount when weight or price changes
  useEffect(() => {
    const weight = Number(watchedValues?.weight || 0);
    const rate = Number(watchedValues?.pricePerUnit || 0);
    const metalType = watchedValues?.metalType;
    const tradeType = watchedValues?.type;

    // Only auto-calculate for buy/sell trades with metal weight and rate
    if ((tradeType === 'buy' || tradeType === 'sell') && weight > 0 && rate > 0) {
      // Gold rate is per 10g, so divide by 10 to get per gram
      const amount = metalType === 'gold'
        ? weight * rate / 10
        : weight * rate;
      setValue('totalAmount', Number(amount.toFixed(2)), { shouldValidate: true, shouldDirty: true });
    }
  }, [watchedValues.weight, watchedValues.pricePerUnit, watchedValues.metalType, watchedValues.type, setValue]);

  const handleUpdate = async (data: EditTradeFormData) => {
    if (!trade) {
      console.error('No trade selected for editing');
      return;
    }

    try {
      const updatePayload = {
        type: data.type,
        merchantName: data.merchantName,
        metalType: data.metalType,
        weight: data.weight,
        pricePerUnit: data.pricePerUnit,
        totalAmount: data.totalAmount,
        date: data.date,
        notes: data.notes,
        updatedAt: new Date(),
      };

      const { trade: updatedTrade, error } = await TradeService.updateTrade(trade.id, updatePayload);

      if (error) {
        console.error('Error updating trade:', error);
        alert('Error updating trade: ' + error);
        return;
      }

      if (!updatedTrade) {
        console.error('No updated trade returned from service');
        alert('No updated trade returned from service');
        return;
      }

      console.log('Trade updated successfully:', updatedTrade);
      onTradeUpdated(updatedTrade);
      handleClose();
      alert('Trade updated successfully!');
    } catch (error) {
      console.error('Unexpected error updating trade:', error);
      alert('Unexpected error updating trade: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDelete = async () => {
    if (!trade || !onTradeDeleted) return;

    if (!window.confirm('Are you sure you want to delete this trade?')) return;

    try {
      const { error } = await TradeService.deleteTrade(trade.id);
      if (error) {
        console.error('Error deleting trade:', error);
        alert('Error deleting trade: ' + error);
        return;
      }

      console.log('Trade deleted successfully');
      onTradeDeleted(trade.id);
      handleClose();
      alert('Trade deleted successfully!');
    } catch (error) {
      console.error('Unexpected error deleting trade:', error);
      alert('Unexpected error deleting trade');
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Trade"
    >
      <form onSubmit={handleSubmit(handleUpdate)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Trade Type (Cannot be changed)
            </label>
            <Select
              {...register('type', { required: 'Trade type is required' })}
              className="w-full bg-gray-800 opacity-60 cursor-not-allowed"
              options={[
                { value: 'buy', label: 'Buy' },
                { value: 'sell', label: 'Sell' },
                { value: 'transfer', label: 'Transfer' },
                { value: 'settlement', label: 'Settlement' }
              ]}
              disabled
            />
            {errors.type && (
              <p className="text-red-400 text-sm mt-1">{errors.type.message}</p>
            )}
          </div>

          {/* Only show Metal Type for Buy/Sell/Transfer trades */}
          {watchedValues?.type !== 'settlement' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Metal Type
              </label>
              <Select
                {...register('metalType', {
                  required: watchedValues?.type !== 'settlement' ? 'Metal type is required' : false
                })}
                className="w-full"
                options={[
                  { value: 'gold', label: 'Gold' },
                  { value: 'silver', label: 'Silver' }
                ]}
              />
              {errors.metalType && (
                <p className="text-red-400 text-sm mt-1">{errors.metalType.message}</p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Merchant/Customer Name
          </label>
          <Input
            {...register('merchantName', { required: 'Merchant name is required' })}
            placeholder="Enter merchant name"
            className="w-full"
          />
          {errors.merchantName && (
            <p className="text-red-400 text-sm mt-1">{errors.merchantName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Trade Date
          </label>
          <Input
            {...register('date', { required: 'Trade date is required' })}
            type="date"
            className="w-full"
          />
          {errors.date && (
            <p className="text-red-400 text-sm mt-1">{errors.date.message}</p>
          )}
        </div>

        {/* Only show Weight, Price, and calculation for Buy/Sell trades */}
        {(watchedValues?.type === 'buy' || watchedValues?.type === 'sell') && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Weight ({watchedValues?.metalType === 'gold' ? 'grams' : 'kg'})
              </label>
              <Input
                {...register('weight', {
                  required: 'Weight is required',
                  min: { value: 0.0001, message: 'Weight must be positive' }
                })}
                type="number"
                step="0.0001"
                placeholder="0.0000"
                className="w-full"
              />
              {errors.weight && (
                <p className="text-red-400 text-sm mt-1">{errors.weight.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Price per {watchedValues?.metalType === 'gold' ? '10g' : 'kg'} (₹)
              </label>
              <Input
                {...register('pricePerUnit', {
                  required: 'Price per unit is required',
                  min: { value: 0, message: 'Price must be positive' }
                })}
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full"
              />
              {errors.pricePerUnit && (
                <p className="text-red-400 text-sm mt-1">{errors.pricePerUnit.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Total Amount (₹)
              </label>
              <Input
                {...register('totalAmount', {
                  required: 'Total amount is required',
                  min: { value: 0, message: 'Amount must be positive' }
                })}
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full"
              />
              {errors.totalAmount && (
                <p className="text-red-400 text-sm mt-1">{errors.totalAmount.message}</p>
              )}
            </div>
          </div>
        )}

        {/* For Settlement/Transfer trades, just show amount */}
        {(watchedValues?.type === 'settlement' || watchedValues?.type === 'transfer') && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount (₹)
            </label>
            <Input
              {...register('totalAmount', {
                required: 'Amount is required',
                min: { value: 0, message: 'Amount must be positive' }
              })}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="w-full"
            />
            {errors.totalAmount && (
              <p className="text-red-400 text-sm mt-1">{errors.totalAmount.message}</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Notes (Optional)
          </label>
          <Input
            {...register('notes')}
            placeholder="Enter any additional notes"
            className="w-full"
          />
        </div>

        <div className="flex space-x-3 pt-4">
          {onTradeDeleted && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              className="text-red-400 border-red-400/50 hover:bg-red-400/10"
            >
              Delete
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
          >
            Update Trade
          </Button>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { TrendingUp, Plus, Trash2, Eye } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { Trade, Merchant, MetalType } from '../../types';
import { generateId, formatCurrency } from '../../utils/calculations';
import { TradeService } from '../../services/tradeService';
import { MerchantsService } from '../../services/merchantsService';

interface SellFormData {
  merchantId: string;
  metalType: MetalType;
  weight: number;
  pricePerUnit: number;
  laborCharges: number;
  amountReceived: number;
  settlementType: 'bill' | 'cash';
  tradeDate: string;
  notes?: string;
}

interface PendingTrade {
  id: string;
  metalType: MetalType;
  weight: number;
  pricePerUnit: number;
  laborCharges: number;
  totalAmount: number;
  amountReceived: number;
  settlementType: 'bill' | 'cash';
  notes?: string;
}

export const Sell: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  // Stock is now managed by the database through StockService
  const [, setIsLoadingMerchants] = useState(true);
  const [showAddMerchant, setShowAddMerchant] = useState(false);
  const [newMerchant, setNewMerchant] = useState({ name: '', phone: '', email: '', olderDues: '' });
  
  // Multi-entry feature
  const [pendingTrades, setPendingTrades] = useState<PendingTrade[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load merchants and trades from database
  React.useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🏪 Sell: Loading merchants and trades from database...');
        
        // Load merchants
        const { merchants: dbMerchants, error: merchantsError } = await MerchantsService.getMerchants();
        if (merchantsError) {
          console.error('❌ Sell: Error loading merchants:', merchantsError);
        } else {
          console.log('✅ Sell: Loaded', dbMerchants.length, 'merchants from database');
          setMerchants(dbMerchants);
        }

        // Load trades
        const { trades: dbTrades, error: tradesError } = await TradeService.getTrades();
        if (tradesError) {
          console.error('❌ Sell: Error loading trades:', tradesError);
        } else {
          console.log('✅ Sell: Loaded', dbTrades.length, 'trades from database');
          setTrades(dbTrades);
        }
      } catch (error) {
        console.error('❌ Sell: Unexpected error loading data:', error);
      } finally {
        setIsLoadingMerchants(false);
      }
    };

    loadData();
  }, []);
  
  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<SellFormData>({
    defaultValues: {
      metalType: 'gold',
      settlementType: 'cash',
      laborCharges: 0,
      amountReceived: 0,
      tradeDate: new Date().toISOString().split('T')[0],
    }
  });

  const onError = (errors: any) => {
    console.log('Form validation errors:', errors);
  };

  const watchedValues = watch();
  //const metalValue = (watchedValues.weight || 0) * (watchedValues.pricePerUnit || 0);
  const metalValue = watchedValues.metalType === 'gold'  
  ? Number(watchedValues.weight || 0 )*Number(watchedValues.pricePerUnit || 0 )/10
  : Number(watchedValues.weight || 0 )*Number(watchedValues.pricePerUnit || 0);
  const totalAmount = Number(metalValue) + Number(watchedValues.laborCharges || 0);

  const onSubmit = async (data: SellFormData) => {
    const selectedMerchant = merchants.find(m => m.id === data.merchantId);
    if (!selectedMerchant) {
      console.log('Merchant not found');
      return;
    }

    // If there are already pending trades, show preview first
    if (pendingTrades.length > 0) {
      setShowPreview(true);
      return;
    }

    // Single trade submission (no pending trades)
    const newTrade: Trade = {
      id: generateId(),
      type: 'sell',
      merchantId: data.merchantId,
      merchantName: selectedMerchant.name,
      metalType: data.metalType,
      weight: data.weight,
      pricePerUnit: data.pricePerUnit,
      totalAmount,
      amountReceived: data.amountReceived,
      laborCharges: data.laborCharges,
      settlementType: data.settlementType as any,
      tradeDate: data.tradeDate,
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const { error } = await TradeService.addTrade(newTrade);
      if (error) {
        console.error('❌ Error saving trade:', error);
        alert('Error saving trade: ' + error);
        return;
      }
      
      // Update local state for immediate UI update
      setTrades([...trades, newTrade]);

      reset();
      alert('Sale recorded successfully! Customer debt updated.');
    } catch (error) {
      console.error('❌ Unexpected error saving trade:', error);
      alert('Unexpected error saving trade');
    }
  };

  // Add trade to pending list
  const handleAddToPending = (data: SellFormData) => {
    const newPendingTrade: PendingTrade = {
      id: generateId(),
      metalType: data.metalType,
      weight: data.weight,
      pricePerUnit: data.pricePerUnit,
      laborCharges: data.laborCharges,
      totalAmount,
      amountReceived: data.amountReceived,
      settlementType: data.settlementType,
      notes: data.notes,
    };

    setPendingTrades([...pendingTrades, newPendingTrade]);
    
    // Keep current merchant and date
    const currentMerchant = watchedValues.merchantId;
    const currentDate = watchedValues.tradeDate;
    
    // Reset form completely
    reset();
    
    // Then set merchant and date back
    setValue('merchantId', currentMerchant);
    setValue('tradeDate', currentDate);
    setValue('metalType', 'gold');
    setValue('settlementType', 'cash');
  };

  // Remove pending trade
  const handleRemovePending = (id: string) => {
    setPendingTrades(pendingTrades.filter(t => t.id !== id));
  };

  // Submit all trades (pending + current if any)
  const handleSubmitAll = async (data?: SellFormData) => {
    const merchantId = data?.merchantId || watchedValues.merchantId;
    const tradeDate = data?.tradeDate || watchedValues.tradeDate;
    
    const selectedMerchant = merchants.find(m => m.id === merchantId);
    if (!selectedMerchant) {
      alert('Merchant not found');
      return;
    }

    setIsSubmitting(true);

    try {
      const allTrades: Trade[] = [];
      
      // Add all pending trades
      for (const pending of pendingTrades) {
        const trade: Trade = {
          id: generateId(),
          type: 'sell',
          merchantId: merchantId,
          merchantName: selectedMerchant.name,
          metalType: pending.metalType,
          weight: pending.weight,
          pricePerUnit: pending.pricePerUnit,
          totalAmount: pending.totalAmount,
          amountReceived: pending.amountReceived,
          laborCharges: pending.laborCharges,
          settlementType: pending.settlementType as any,
          tradeDate: tradeDate,
          notes: pending.notes,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        allTrades.push(trade);
      }

      // Add current trade if form has data
      if (watchedValues.weight && watchedValues.pricePerUnit) {
        const currentTrade: Trade = {
          id: generateId(),
          type: 'sell',
          merchantId: merchantId,
          merchantName: selectedMerchant.name,
          metalType: watchedValues.metalType,
          weight: watchedValues.weight,
          pricePerUnit: watchedValues.pricePerUnit,
          totalAmount,
          amountReceived: watchedValues.amountReceived || 0,
          laborCharges: watchedValues.laborCharges || 0,
          settlementType: watchedValues.settlementType as any,
          tradeDate: tradeDate,
          notes: watchedValues.notes,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        allTrades.push(currentTrade);
      }

      // Submit all trades
      let successCount = 0;
      const errors: string[] = [];

      for (const trade of allTrades) {
        const { error } = await TradeService.addTrade(trade);
        if (error) {
          errors.push(`Failed to add trade: ${error}`);
        } else {
          successCount++;
        }
      }

      if (successCount === allTrades.length) {
        alert(`✅ Successfully added ${successCount} sale${successCount > 1 ? 's' : ''}!`);
        setPendingTrades([]);
        setTrades([...trades, ...allTrades]);
        reset();
        setShowPreview(false);
      } else if (successCount > 0) {
        alert(`⚠️ Added ${successCount} out of ${allTrades.length} trades.\n\nErrors:\n${errors.join('\n')}`);
        setPendingTrades([]);
        setShowPreview(false);
      } else {
        alert(`❌ Failed to add trades:\n${errors.join('\n')}`);
      }
    } catch (error) {
      console.error('❌ Unexpected error submitting trades:', error);
      alert('Unexpected error submitting trades');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMerchant = async () => {
    if (!newMerchant.name.trim()) return;

    // Parse older dues - if empty or invalid, default to 0
    const olderDuesAmount = newMerchant.olderDues.trim() === '' ? 0 : Number(newMerchant.olderDues) || 0;

    const merchantData: Omit<Merchant, 'id' | 'createdAt' | 'updatedAt'> = {
      name: newMerchant.name,
      phone: newMerchant.phone,
      email: newMerchant.email,
      totalDue: olderDuesAmount,
      totalOwe: 0,
    };

    
    try {
      const { merchant: savedMerchant, error } = await MerchantsService.addMerchant(merchantData);
      if (error) {
        console.error('❌ Error adding merchant:', error);
        alert('Error adding merchant: ' + error);
        return;
      }
      
      
      // Update local state for immediate UI update
      setMerchants([...merchants, savedMerchant!]);
      setNewMerchant({ name: '', phone: '', email: '', olderDues: '' });
      setShowAddMerchant(false);
    } catch (error) {
      console.error('❌ Unexpected error adding merchant:', error);
      alert('Unexpected error adding merchant');
    }
  };

  const merchantOptions = [
    { value: '', label: 'Select Customer' },
    ...merchants.map(merchant => ({
      value: merchant.id,
      label: merchant.name
    }))
  ];

  const metalOptions = [
    { value: 'gold', label: 'Gold' },
    { value: 'silver', label: 'Silver' },
  ];

  const settlementOptions = [
    { value: 'bill', label: 'Bill' },
    { value: 'cash', label: 'Cash' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center space-x-3"
      >
        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Sell Transaction</h1>
          <p className="text-gray-400">Record a sale to customer</p>
        </div>
      </motion.div>

      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Select
                label="Customer"
                options={merchantOptions}
                {...register('merchantId', { required: 'Please select a customer' })}
                error={errors.merchantId?.message}
                disabled={pendingTrades.length > 0}
              />
            </div>
            <Button
              type="button"
              onClick={() => setShowAddMerchant(true)}
              variant="outline"
              className="mt-6"
              disabled={pendingTrades.length > 0}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Metal Type"
              options={metalOptions}
              {...register('metalType')}
            />
            <Select
              label="Settlement Type"
              options={settlementOptions}
              {...register('settlementType')}
            />
          </div>

          <Input
            label="Trade Date"
            type="date"
            whiteBorder
            {...register('tradeDate', { required: 'Trade date is required' })}
            error={errors.tradeDate?.message}
            disabled={pendingTrades.length > 0}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
            label={`Weight (${watchedValues.metalType === 'gold' ? 'grams' : 'kg'})`}
            type="number"
            step="0.0001"
            placeholder="0.0000"
            whiteBorder
            {...register('weight', { 
              required: 'Weight is required',
              min: { value: 0.0001, message: 'Weight must be greater than 0' }
            })}
            error={errors.weight?.message}
          />
            <Input
              label={`Price per ${watchedValues.metalType === 'gold' ? '10g' : 'kg'}`}
              type="number"
              step="0.01"
              placeholder="0.00"
              whiteBorder
              {...register('pricePerUnit', { 
                required: 'Price is required',
                min: { value: 0.01, message: 'Price must be greater than 0' }
              })}
              error={errors.pricePerUnit?.message}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Labor Charges (Optional)"
              type="number"
              step="0.01"
              placeholder="0.00"
              whiteBorder
              {...register('laborCharges', { 
                min: { value: 0, message: 'Labor charges cannot be negative' }
              })}
              error={errors.laborCharges?.message}
            />
            <Input
              label="Amount Received"
              type="number"
              step="0.01"
              placeholder="0.00"
              whiteBorder
              {...register('amountReceived', { 
                min: { value: 0, message: 'Amount received cannot be negative' }
              })}
              error={errors.amountReceived?.message}
            />
          </div>

          {totalAmount > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gray-700 p-4 rounded-lg space-y-2"
            >
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Metal Value:</span>
                <span className="text-white">{formatCurrency(metalValue)}</span>
              </div>
              {watchedValues.laborCharges > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-300">Labor Charges:</span>
                  <span className="text-white">{formatCurrency(watchedValues.laborCharges)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-medium border-t border-gray-600 pt-2">
                <span className="text-gray-300">Total Amount:</span>
                <span className="text-white">{formatCurrency(totalAmount)}</span>
              </div>
            </motion.div>
          )}

          <Input
            label="Notes (Optional)"
            placeholder="Add any additional notes"
            whiteBorder
            {...register('notes')}
          />

          {/* Action buttons */}
          <div className="flex gap-3">
            {pendingTrades.length > 0 ? (
              <>
                <Button
                  type="button"
                  onClick={handleSubmit(handleAddToPending)}
                  variant="outline"
                  className="flex-1"
                  disabled={!watchedValues.weight || !watchedValues.pricePerUnit || watchedValues.amountReceived === undefined || watchedValues.amountReceived === null}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Submit All ({pendingTrades.length + (watchedValues.weight && watchedValues.pricePerUnit ? 1 : 0)})
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!watchedValues.merchantId || !watchedValues.weight || !watchedValues.pricePerUnit}
                >
                  Record Sale
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit(handleAddToPending)}
                  variant="outline"
                  className="px-6"
                  disabled={!watchedValues.merchantId || !watchedValues.weight || !watchedValues.pricePerUnit}
                  title="Add another sale for the same customer"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add More
                </Button>
              </>
            )}
          </div>
        </form>
      </Card>

      {/* Pending Trades List */}
      {pendingTrades.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              Pending Sales ({pendingTrades.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPendingTrades([])}
              className="text-red-400 hover:text-red-300"
            >
              Clear All
            </Button>
          </div>
          <div className="space-y-3">
            {pendingTrades.map((trade, index) => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-500 font-mono">#{index + 1}</span>
                    <span className="text-sm text-gray-300 capitalize">
                      {trade.metalType} • {trade.weight} {trade.metalType === 'gold' ? 'gm' : 'kg'}
                    </span>
                    <span className="text-sm text-gray-400">
                      @ {formatCurrency(trade.pricePerUnit)}/{trade.metalType === 'gold' ? '10g' : 'kg'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-sm text-gray-400">
                      Received: {formatCurrency(trade.amountReceived)}
                    </span>
                    {trade.notes && (
                      <span className="text-xs text-gray-500">• {trade.notes}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-bold text-white">
                    {formatCurrency(trade.totalAmount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePending(trade.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-600">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 font-medium">Total Amount:</span>
              <span className="text-white font-bold text-xl">
                {formatCurrency(pendingTrades.reduce((sum, t) => sum + t.totalAmount, 0))}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-300 font-medium">Total Received:</span>
              <span className="text-white font-bold text-xl">
                {formatCurrency(pendingTrades.reduce((sum, t) => sum + t.amountReceived, 0))}
              </span>
            </div>
          </div>
        </Card>
      )}

      <Modal
        isOpen={showAddMerchant}
        onClose={() => setShowAddMerchant(false)}
        title="Add New Customer"
      >
        <div className="space-y-4">
          <Input
            label="Customer Name"
            placeholder="Enter customer name"
            value={newMerchant.name}
            onChange={(e) => setNewMerchant({ ...newMerchant, name: e.target.value })}
            required
          />
          <Input
            label="Phone Number (Optional)"
            placeholder="Enter phone number"
            value={newMerchant.phone}
            onChange={(e) => setNewMerchant({ ...newMerchant, phone: e.target.value })}
          />
          <Input
            label="Email (Optional)"
            type="email"
            placeholder="Enter email"
            value={newMerchant.email}
            onChange={(e) => setNewMerchant({ ...newMerchant, email: e.target.value })}
          />
          <Input
            label="Older Dues (Optional)"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={newMerchant.olderDues}
            onChange={(e) => setNewMerchant({ ...newMerchant, olderDues: e.target.value })}
          />
          <Button onClick={addMerchant} className="w-full">
            Add Customer
          </Button>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Review & Submit Sales"
        className="max-w-3xl"
      >
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Customer</p>
                <p className="text-white font-medium">
                  {merchants.find(m => m.id === watchedValues.merchantId)?.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Date</p>
                <p className="text-white font-medium">
                  {new Date(watchedValues.tradeDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Trades List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pendingTrades.map((trade, index) => (
              <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-500 font-mono">#{index + 1}</span>
                  <div>
                    <span className="text-sm text-gray-300 capitalize">
                      {trade.metalType} • {trade.weight} {trade.metalType === 'gold' ? 'gm' : 'kg'}
                    </span>
                    <p className="text-xs text-gray-500">
                      Received: {formatCurrency(trade.amountReceived)} / {formatCurrency(trade.totalAmount)}
                    </p>
                  </div>
                </div>
                <span className="text-white font-medium">
                  {formatCurrency(trade.totalAmount)}
                </span>
              </div>
            ))}
            {watchedValues.weight && watchedValues.pricePerUnit && (
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded border-2 border-primary-500/30">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-500 font-mono">#{pendingTrades.length + 1}</span>
                  <div>
                    <span className="text-sm text-gray-300 capitalize">
                      {watchedValues.metalType} • {watchedValues.weight} {watchedValues.metalType === 'gold' ? 'gm' : 'kg'}
                    </span>
                    <p className="text-xs text-gray-500">
                      Received: {formatCurrency(watchedValues.amountReceived || 0)} / {formatCurrency(totalAmount)}
                    </p>
                  </div>
                </div>
                <span className="text-white font-medium">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="bg-gray-700 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 font-medium">Total Trades:</span>
              <span className="text-white font-bold">
                {pendingTrades.length + (watchedValues.weight && watchedValues.pricePerUnit ? 1 : 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 font-medium">Total Amount:</span>
              <span className="text-white font-bold text-xl">
                {formatCurrency(
                  pendingTrades.reduce((sum, t) => sum + t.totalAmount, 0) + 
                  (watchedValues.weight && watchedValues.pricePerUnit ? totalAmount : 0)
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 font-medium">Total Received:</span>
              <span className="text-white font-bold text-xl">
                {formatCurrency(
                  pendingTrades.reduce((sum, t) => sum + t.amountReceived, 0) + 
                  (watchedValues.weight && watchedValues.pricePerUnit ? (watchedValues.amountReceived || 0) : 0)
                )}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
              className="flex-1"
            >
              Back to Edit
            </Button>
            <Button
              onClick={() => handleSubmitAll()}
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600"
            >
              {isSubmitting ? 'Submitting...' : `Submit All Sales`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
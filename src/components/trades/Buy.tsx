import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { ShoppingCart, Plus, Trash2, Eye } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { Trade, Merchant, MetalType, SettlementType } from '../../types';
import { generateId, formatCurrency } from '../../utils/calculations';
import { TradeService } from '../../services/tradeService';
import { MerchantsService } from '../../services/merchantsService';

interface BuyFormData {
  merchantId: string;
  metalType: MetalType;
  weight: number;
  pricePerUnit: number;
  laborCharges: number;
  amountPaid: number;
  settlementType: SettlementType;
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
  amountPaid: number;
  settlementType: SettlementType;
  notes?: string;
}

export const Buy: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  // Stock is now managed by the database through StockService
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(true);
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
        console.log('🏪 Buy: Loading merchants and trades from database...');
        
        // Load merchants
        const { merchants: dbMerchants, error: merchantsError } = await MerchantsService.getMerchants();
        if (merchantsError) {
          console.error('❌ Buy: Error loading merchants:', merchantsError);
        } else {
          console.log('✅ Buy: Loaded', dbMerchants.length, 'merchants from database');
          setMerchants(dbMerchants);
        }

        // Load trades
        const { trades: dbTrades, error: tradesError } = await TradeService.getTrades();
        if (tradesError) {
          console.error('❌ Buy: Error loading trades:', tradesError);
        } else {
          console.log('✅ Buy: Loaded', dbTrades.length, 'trades from database');
          setTrades(dbTrades);
        }
      } catch (error) {
        console.error('❌ Buy: Unexpected error loading data:', error);
      } finally {
        setIsLoadingMerchants(false);
      }
    };

    loadData();
  }, []);
  
  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<BuyFormData>({
    defaultValues: {
      metalType: 'gold',
      settlementType: 'cash',
      tradeDate: new Date().toISOString().split('T')[0],
    }
  });

  const onError = (errors: any) => {
    console.log('Form validation errors:', errors);
    console.log('Current form values:', watchedValues);
  };

  const watchedValues = watch();
  // Calculate metal value
  const metalValue = watchedValues.metalType === 'gold'
  ? Number(watchedValues.weight || 0) * Number(watchedValues.pricePerUnit || 0) / 10
  : Number(watchedValues.weight || 0) * Number(watchedValues.pricePerUnit || 0);
  
  // Calculate total amount including labor charges
  const laborCharges = Number(watchedValues.laborCharges || 0);
  const totalAmount = metalValue + laborCharges;
  const remainingAmount = Number(totalAmount) - Number(watchedValues.amountPaid || 0);

  const onSubmit = async (data: BuyFormData) => {
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
      type: 'buy',
      merchantId: data.merchantId,
      merchantName: selectedMerchant.name,
      metalType: data.metalType,
      weight: data.weight,
      pricePerUnit: data.pricePerUnit,
      totalAmount,
      amountPaid: data.amountPaid,
      laborCharges: data.laborCharges,
      settlementType: data.settlementType,
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
      alert('Purchase recorded successfully! Merchant debt updated.');
    } catch (error) {
      console.error('❌ Unexpected error saving trade:', error);
      alert('Unexpected error saving trade');
    }
  };

  // Add trade to pending list
  const handleAddToPending = (data: BuyFormData) => {
    const newPendingTrade: PendingTrade = {
      id: generateId(),
      metalType: data.metalType,
      weight: data.weight,
      pricePerUnit: data.pricePerUnit,
      laborCharges: data.laborCharges,
      totalAmount,
      amountPaid: data.amountPaid,
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
  const handleSubmitAll = async (data?: BuyFormData) => {
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
          type: 'buy',
          merchantId: merchantId,
          merchantName: selectedMerchant.name,
          metalType: pending.metalType,
          weight: pending.weight,
          pricePerUnit: pending.pricePerUnit,
          totalAmount: pending.totalAmount,
          amountPaid: pending.amountPaid,
          laborCharges: pending.laborCharges,
          settlementType: pending.settlementType,
          tradeDate: tradeDate,
          notes: pending.notes,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        allTrades.push(trade);
      }

      // Add current trade if form has data
      if (watchedValues.weight && watchedValues.pricePerUnit && watchedValues.amountPaid !== undefined && watchedValues.amountPaid !== null) {
        const currentTrade: Trade = {
          id: generateId(),
          type: 'buy',
          merchantId: merchantId,
          merchantName: selectedMerchant.name,
          metalType: watchedValues.metalType,
          weight: watchedValues.weight,
          pricePerUnit: watchedValues.pricePerUnit,
          totalAmount,
          amountPaid: watchedValues.amountPaid,
          laborCharges: watchedValues.laborCharges || 0,
          settlementType: watchedValues.settlementType,
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
        alert(`✅ Successfully added ${successCount} purchase${successCount > 1 ? 's' : ''}!`);
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
    { value: '', label: 'Select Merchant' },
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
    { value: 'cash', label: 'Cash' },
    { value: 'bill', label: 'Bill' },
  ];

  if (isLoadingMerchants) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading merchants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center space-x-3"
      >
        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
          <ShoppingCart className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Buy Transaction</h1>
          <p className="text-gray-400">Record a purchase from merchant</p>
        </div>
      </motion.div>

      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Select
                label="Merchant"
                options={merchantOptions}
                {...register('merchantId', { required: 'Please select a merchant' })}
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
              label="Amount Paid"
              type="number"
              step="0.01"
              placeholder="0.00"
              whiteBorder
              {...register('amountPaid', { 
                required: 'Amount paid is required',
                min: { value: 0, message: 'Amount cannot be negative' }
              })}
              error={errors.amountPaid?.message}
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
                <span className="text-white font-medium">{formatCurrency(metalValue)}</span>
              </div>
              {laborCharges > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-300">Labor Charges:</span>
                  <span className="text-white font-medium">{formatCurrency(laborCharges)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-600">
                <span className="text-gray-300 font-medium">Total Amount:</span>
                <span className="text-white font-bold">{formatCurrency(totalAmount)}</span>
              </div>
            </motion.div>
          )}

          {remainingAmount > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg"
            >
              <p className="text-orange-400 text-sm">
                Remaining Amount: {formatCurrency(remainingAmount)}
              </p>
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
                  disabled={!watchedValues.weight || !watchedValues.pricePerUnit || watchedValues.amountPaid === undefined || watchedValues.amountPaid === null}
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
                  disabled={!watchedValues.merchantId || !watchedValues.weight || !watchedValues.pricePerUnit || watchedValues.amountPaid === undefined || watchedValues.amountPaid === null}
                >
                  Record Purchase
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit(handleAddToPending)}
                  variant="outline"
                  className="px-6"
                  disabled={!watchedValues.merchantId || !watchedValues.weight || !watchedValues.pricePerUnit || watchedValues.amountPaid === undefined || watchedValues.amountPaid === null}
                  title="Add another purchase for the same merchant"
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
              Pending Purchases ({pendingTrades.length})
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
                      Paid: {formatCurrency(trade.amountPaid)}
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
              <span className="text-gray-300 font-medium">Total Paid:</span>
              <span className="text-white font-bold text-xl">
                {formatCurrency(pendingTrades.reduce((sum, t) => sum + t.amountPaid, 0))}
              </span>
            </div>
          </div>
        </Card>
      )}

      <Modal
        isOpen={showAddMerchant}
        onClose={() => setShowAddMerchant(false)}
        title="Add New Merchant"
      >
        <div className="space-y-4">
          <Input
            label="Merchant Name"
            placeholder="Enter merchant name"
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
            Add Merchant
          </Button>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Review & Submit Purchases"
        className="max-w-3xl"
      >
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Merchant</p>
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
                      Paid: {formatCurrency(trade.amountPaid)} / {formatCurrency(trade.totalAmount)}
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
                      Paid: {formatCurrency(watchedValues.amountPaid || 0)} / {formatCurrency(totalAmount)}
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
              <span className="text-gray-300 font-medium">Total Paid:</span>
              <span className="text-white font-bold text-xl">
                {formatCurrency(
                  pendingTrades.reduce((sum, t) => sum + t.amountPaid, 0) + 
                  (watchedValues.weight && watchedValues.pricePerUnit ? (watchedValues.amountPaid || 0) : 0)
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
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600"
            >
              {isSubmitting ? 'Submitting...' : `Submit All Purchases`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
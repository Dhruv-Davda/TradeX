import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { ShoppingCart, Plus } from 'lucide-react';
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

export const Buy: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  // Stock is now managed by the database through StockService
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(true);
  const [showAddMerchant, setShowAddMerchant] = useState(false);
  const [newMerchant, setNewMerchant] = useState({ name: '', phone: '', email: '', olderDues: '' });

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
  
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<BuyFormData>({
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
      const { trade: savedTrade, error } = await TradeService.addTrade(newTrade);
      if (error) {
        console.error('❌ Error saving trade:', error);
        alert('Error saving trade: ' + error);
        return;
      }
      
      
      // Note: Merchant debt is now calculated dynamically from trades table
      // No need to update merchant.totalDue field to avoid double counting
      
      // Update local state for immediate UI update
      setTrades([...trades, newTrade]);

      reset();
      alert('Purchase recorded successfully! Merchant debt updated.');
    } catch (error) {
      console.error('❌ Unexpected error saving trade:', error);
      alert('Unexpected error saving trade');
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
              />
            </div>
            <Button
              type="button"
              onClick={() => setShowAddMerchant(true)}
              variant="outline"
              className="mt-6"
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

          <div>
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

          <Button
            type="submit"
            className="w-full"
            disabled={!watchedValues.merchantId || !watchedValues.weight || !watchedValues.pricePerUnit || !watchedValues.amountPaid}
          >
            Record Purchase
          </Button>
        </form>
      </Card>

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
    </div>
  );
};
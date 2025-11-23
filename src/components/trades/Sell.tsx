import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { TrendingUp, Plus } from 'lucide-react';
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

export const Sell: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  // Stock is now managed by the database through StockService
  const [, setIsLoadingMerchants] = useState(true);
  const [showAddMerchant, setShowAddMerchant] = useState(false);
  const [newMerchant, setNewMerchant] = useState({ name: '', phone: '', email: '', olderDues: '' });

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
  
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<SellFormData>({
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
      alert('Sale recorded successfully! Customer debt updated.');
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
              label="AMT RECEIVED"
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

          <Button
            type="submit"
            className="w-full"
            disabled={!watchedValues.merchantId || !watchedValues.weight || !watchedValues.pricePerUnit}
          >
            Record Sale
          </Button>
        </form>
      </Card>

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
    </div>
  );
};
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { RefreshCw, Plus } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { Trade, Merchant } from '../../types';
import { generateId, formatCurrency } from '../../utils/calculations';
import { TradeService } from '../../services/tradeService';
import { MerchantsService } from '../../services/merchantsService';

interface TransferFormData {
  merchantId: string;
  pickupLocation: string;
  dropLocation: string;
  totalAmount: number;
  transferCharges: number;
  tradeDate: string;
  notes?: string;
}

export const Transfer: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [, setIsLoadingMerchants] = useState(true);
  const [showAddMerchant, setShowAddMerchant] = useState(false);
  const [newMerchant, setNewMerchant] = useState({ name: '', phone: '', email: '', olderDues: '' });

  // Load merchants and trades from database
  React.useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🏪 Transfer: Loading merchants and trades from database...');
        
        // Load merchants
        const { merchants: dbMerchants, error: merchantsError } = await MerchantsService.getMerchants();
        if (merchantsError) {
          console.error('❌ Transfer: Error loading merchants:', merchantsError);
        } else {
          console.log('✅ Transfer: Loaded', dbMerchants.length, 'merchants from database');
          setMerchants(dbMerchants);
        }

        // Load trades
        const { trades: dbTrades, error: tradesError } = await TradeService.getTrades();
        if (tradesError) {
          console.error('❌ Transfer: Error loading trades:', tradesError);
        } else {
          console.log('✅ Transfer: Loaded', dbTrades.length, 'trades from database');
          setTrades(dbTrades);
        }
      } catch (error) {
        console.error('❌ Transfer: Unexpected error loading data:', error);
      } finally {
        setIsLoadingMerchants(false);
      }
    };

    loadData();
  }, []);
  
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<TransferFormData>({
    defaultValues: {
      transferCharges: 0,
      tradeDate: new Date().toISOString().split('T')[0],
    }
  });

  const onError = (errors: any) => {
    console.log('Form validation errors:', errors);
  };

  const watchedValues = watch();
  const transferAmount = Number(watchedValues.totalAmount || 0);
  const transferCharges = Number(watchedValues.transferCharges || 0);
  const netAmount = transferAmount + transferCharges;

  const onSubmit = async (data: TransferFormData) => {
    const selectedMerchant = merchants.find(m => m.id === data.merchantId);
    if (!selectedMerchant) {
      console.log('Merchant not found');
      return;
    }

    const newTrade: Trade = {
      id: generateId(),
      type: 'transfer',
      merchantId: data.merchantId,
      merchantName: selectedMerchant.name,
      totalAmount: netAmount,
      pickupLocation: data.pickupLocation,
      dropLocation: data.dropLocation,
      transferCharges: data.transferCharges,
      tradeDate: data.tradeDate,
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    
    try {
      const { trade: savedTrade, error } = await TradeService.addTrade(newTrade);
      if (error) {
        console.error('❌ Error saving transfer:', error);
        alert('Error saving transfer: ' + error);
        return;
      }
      
      console.log('✅ Transfer saved successfully:', savedTrade);
      
      // Update local state for immediate UI update
      setTrades([...trades, newTrade]);
      reset();
      alert('Transfer recorded successfully!');
    } catch (error) {
      console.error('❌ Unexpected error saving transfer:', error);
      alert('Unexpected error saving transfer');
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
      
      console.log('✅ Merchant added successfully:', savedMerchant);
      
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center space-x-3"
      >
        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Transfer Transaction</h1>
          <p className="text-gray-400">Record metal transfer</p>
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

          <Input
            label="Transfer Date"
            type="date"
            whiteBorder
            {...register('tradeDate', { required: 'Transfer date is required' })}
            error={errors.tradeDate?.message}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Pickup Location"
              placeholder="Enter pickup address"
              whiteBorder
              {...register('pickupLocation', { required: 'Pickup location is required' })}
              error={errors.pickupLocation?.message}
            />
            <Input
              label="Drop Location"
              placeholder="Enter drop address"
              whiteBorder
              {...register('dropLocation', { required: 'Drop location is required' })}
              error={errors.dropLocation?.message}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Transfer Amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              whiteBorder
              {...register('totalAmount', { 
                required: 'Amount is required',
                min: { value: 0.01, message: 'Amount must be greater than 0' }
              })}
              error={errors.totalAmount?.message}
            />
            <Input
              label="Transfer Charges (Your Profit)"
              type="number"
              step="0.01"
              placeholder="0.00"
              whiteBorder
              {...register('transferCharges', { 
                min: { value: 0, message: 'Charges cannot be negative' }
              })}
              error={errors.transferCharges?.message}
            />
          </div>

          {netAmount > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gradient-to-r from-secondary-800 to-secondary-700 p-4 rounded-lg space-y-2 border border-white/10"
            >
              <div className="flex justify-between items-center text-sm">
                <span className="text-secondary-300">Transfer Amount:</span>
                <span className="text-white font-medium">{formatCurrency(transferAmount)}</span>
              </div>
              {transferCharges > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-secondary-300">Transfer Charges (Your Profit):</span>
                  <span className="text-success-400 font-medium">{formatCurrency(transferCharges)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-bold border-t border-white/20 pt-2">
                <span className="text-secondary-300">Total Amount to Collect:</span>
                <span className="text-white">{formatCurrency(netAmount)}</span>
              </div>
              {transferCharges > 0 && (
                <div className="mt-2 p-2 bg-success-500/10 rounded border border-success-500/20">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-success-300">Your Profit:</span>
                    <span className="text-success-400 font-bold">{formatCurrency(transferCharges)}</span>
                  </div>
                </div>
              )}
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
            disabled={!watchedValues.merchantId || !watchedValues.pickupLocation || !watchedValues.dropLocation || !watchedValues.totalAmount}
          >
            Record Transfer
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
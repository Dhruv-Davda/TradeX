import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { DollarSign, Plus } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { Trade, Merchant } from '../../types';
import { generateId } from '../../utils/calculations';
import { TradeService } from '../../services/tradeService';
import { MerchantsService } from '../../services/merchantsService';

interface SettlementFormData {
  merchantId: string;
  settlementType: 'cash' | 'bank';
  settlementDirection: 'receiving' | 'paying';
  amount: number;
  tradeDate: string;
  notes?: string;
}

export const Settlement: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [, setIsLoadingMerchants] = useState(true);
  const [showAddMerchant, setShowAddMerchant] = useState(false);
  const [newMerchant, setNewMerchant] = useState({ name: '', phone: '', email: '', olderDues: '' });

  // Load merchants and trades from database
  React.useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🏪 Settlement: Loading merchants and trades from database...');
        
        // Load merchants
        const { merchants: dbMerchants, error: merchantsError } = await MerchantsService.getMerchants();
        if (merchantsError) {
          console.error('❌ Settlement: Error loading merchants:', merchantsError);
        } else {
          console.log('✅ Settlement: Loaded', dbMerchants.length, 'merchants from database');
          setMerchants(dbMerchants);
        }

        // Load trades
        const { trades: dbTrades, error: tradesError } = await TradeService.getTrades();
        if (tradesError) {
          console.error('❌ Settlement: Error loading trades:', tradesError);
        } else {
          console.log('✅ Settlement: Loaded', dbTrades.length, 'trades from database');
          setTrades(dbTrades);
        }
      } catch (error) {
        console.error('❌ Settlement: Unexpected error loading data:', error);
      } finally {
        setIsLoadingMerchants(false);
      }
    };

    loadData();
  }, []);
  
  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<SettlementFormData>({
    defaultValues: {
      settlementType: 'cash',
      tradeDate: new Date().toISOString().split('T')[0],
    }
  });

  const onError = (errors: any) => {
    console.log('Form validation errors:', errors);
  };

  const watchedValues = watch();

  const onSubmit = async (data: SettlementFormData) => {
    const selectedMerchant = merchants.find(m => m.id === data.merchantId);
    if (!selectedMerchant) {
      console.log('Merchant not found');
      return;
    }

    const newTrade: Trade = {
      id: generateId(),
      type: 'settlement',
      merchantId: data.merchantId,
      merchantName: selectedMerchant.name,
      totalAmount: data.amount,
      settlementType: data.settlementType,
      settlementDirection: data.settlementDirection,
      tradeDate: data.tradeDate,
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    
    try {
      const { trade: savedTrade, error } = await TradeService.addTrade(newTrade);
      if (error) {
        console.error('❌ Error saving settlement:', error);
        alert('Error saving settlement: ' + error);
        return;
      }
      
      // Update local state for immediate UI update
      setTrades([...trades, newTrade]);
      reset();
      alert('Settlement recorded successfully!');
    } catch (error) {
      console.error('❌ Unexpected error saving settlement:', error);
      alert('Unexpected error saving settlement');
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

  const settlementOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank', label: 'Bank Transfer' },
  ];


  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center space-x-3"
      >
        <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
          <DollarSign className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Settlement</h1>
          <p className="text-gray-400">Record due settlements</p>
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

          <Select
            label="Settlement Type"
            options={settlementOptions}
            {...register('settlementType')}
          />

          <Select
            label="Settlement Direction"
            options={[
              { value: 'receiving', label: 'Receiving (Customer pays you)' },
              { value: 'paying', label: 'Paying (You pay customer advance)' }
            ]}
            {...register('settlementDirection', { required: 'Please select settlement direction' })}
            error={errors.settlementDirection?.message}
          />

          <Input
            label="Settlement Date"
            type="date"
            whiteBorder
            {...register('tradeDate', { required: 'Settlement date is required' })}
            error={errors.tradeDate?.message}
          />

          <Input
            label="Amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            whiteBorder
            {...register('amount', { 
              required: 'Amount is required',
              min: { value: 0.01, message: 'Amount must be greater than 0' }
            })}
            error={errors.amount?.message}
          />

          <Input
            label="Notes (Optional)"
            placeholder="Add any additional notes"
            whiteBorder
            {...register('notes')}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={!watchedValues.merchantId || !watchedValues.amount || !watchedValues.settlementDirection}
          >
            Record Settlement
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
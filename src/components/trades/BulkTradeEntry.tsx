import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Layers, Plus, Trash2, Edit2, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { Trade, Merchant, MetalType, TradeType, SettlementType } from '../../types';
import { formatCurrency, generateId } from '../../utils/calculations';
import { TradeService } from '../../services/tradeService';
import { MerchantsService } from '../../services/merchantsService';
import { useNavigate } from 'react-router-dom';

interface BulkTradeItem {
  id: string;
  type: TradeType;
  metalType?: MetalType;
  weight?: number;
  pricePerUnit?: number;
  totalAmount: number;
  amountPaid?: number;
  amountReceived?: number;
  laborCharges?: number;
  settlementType?: SettlementType;
  settlementDirection?: 'receiving' | 'paying';
  notes?: string;
}

interface TradeFormData {
  type: TradeType;
  metalType?: MetalType;
  weight?: number;
  pricePerUnit?: number;
  totalAmount: number;
  amountPaid?: number;
  amountReceived?: number;
  laborCharges?: number;
  settlementType?: SettlementType;
  settlementDirection?: 'receiving' | 'paying';
  notes?: string;
}

export const BulkTradeEntry: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(true);
  const [showAddMerchant, setShowAddMerchant] = useState(false);
  const [newMerchant, setNewMerchant] = useState({ name: '', phone: '', email: '', olderDues: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Merchant & Date
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0]);

  // Step 2 & 3: Trades List
  const [bulkTrades, setBulkTrades] = useState<BulkTradeItem[]>([]);
  const [showAddTradeModal, setShowAddTradeModal] = useState(false);
  const [editingTradeIndex, setEditingTradeIndex] = useState<number | null>(null);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<TradeFormData>({
    defaultValues: {
      type: 'buy',
      metalType: 'gold',
      settlementType: 'cash',
    }
  });

  // Load merchants
  React.useEffect(() => {
    const loadMerchants = async () => {
      try {
        const { merchants: dbMerchants, error } = await MerchantsService.getMerchants();
        if (error) {
          console.error('❌ Error loading merchants:', error);
        } else {
          setMerchants(dbMerchants);
        }
      } catch (error) {
        console.error('❌ Unexpected error loading merchants:', error);
      } finally {
        setIsLoadingMerchants(false);
      }
    };
    loadMerchants();
  }, []);

  const watchedValues = watch();

  // Auto-calculate amount for Buy/Sell trades
  React.useEffect(() => {
    const { type, metalType, weight, pricePerUnit, laborCharges } = watchedValues;
    
    if ((type === 'buy' || type === 'sell') && weight && pricePerUnit) {
      const metalValue = metalType === 'gold' 
        ? Number(weight) * Number(pricePerUnit) / 10 
        : Number(weight) * Number(pricePerUnit);
      
      const totalAmount = metalValue + Number(laborCharges || 0);
      setValue('totalAmount', Number(totalAmount.toFixed(2)));
    }
  }, [watchedValues.type, watchedValues.metalType, watchedValues.weight, watchedValues.pricePerUnit, watchedValues.laborCharges, setValue]);

  const addMerchant = async () => {
    if (!newMerchant.name.trim()) return;

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
      setMerchants([...merchants, savedMerchant!]);
      setNewMerchant({ name: '', phone: '', email: '', olderDues: '' });
      setShowAddMerchant(false);
      setSelectedMerchantId(savedMerchant!.id);
    } catch (error) {
      console.error('❌ Unexpected error adding merchant:', error);
      alert('Unexpected error adding merchant');
    }
  };

  const handleAddTrade = (data: TradeFormData) => {
    const newTrade: BulkTradeItem = {
      id: generateId(),
      type: data.type,
      metalType: data.metalType,
      weight: data.weight,
      pricePerUnit: data.pricePerUnit,
      totalAmount: data.totalAmount,
      amountPaid: data.amountPaid,
      amountReceived: data.amountReceived,
      laborCharges: data.laborCharges,
      settlementType: data.settlementType,
      settlementDirection: data.settlementDirection,
      notes: data.notes,
    };

    if (editingTradeIndex !== null) {
      // Update existing trade
      const updatedTrades = [...bulkTrades];
      updatedTrades[editingTradeIndex] = newTrade;
      setBulkTrades(updatedTrades);
      setEditingTradeIndex(null);
    } else {
      // Add new trade
      setBulkTrades([...bulkTrades, newTrade]);
    }

    reset({
      type: 'buy',
      metalType: 'gold',
      settlementType: 'cash',
    });
    setShowAddTradeModal(false);
  };

  const handleEditTrade = (index: number) => {
    const trade = bulkTrades[index];
    setEditingTradeIndex(index);
    setValue('type', trade.type);
    setValue('metalType', trade.metalType || 'gold');
    setValue('weight', trade.weight || 0);
    setValue('pricePerUnit', trade.pricePerUnit || 0);
    setValue('totalAmount', trade.totalAmount);
    setValue('amountPaid', trade.amountPaid || 0);
    setValue('amountReceived', trade.amountReceived || 0);
    setValue('laborCharges', trade.laborCharges || 0);
    setValue('settlementType', trade.settlementType || 'cash');
    setValue('settlementDirection', trade.settlementDirection || 'receiving');
    setValue('notes', trade.notes || '');
    setShowAddTradeModal(true);
  };

  const handleDeleteTrade = (index: number) => {
    setBulkTrades(bulkTrades.filter((_, i) => i !== index));
  };

  const handleSubmitAll = async () => {
    if (bulkTrades.length === 0) {
      alert('Please add at least one trade');
      return;
    }

    const selectedMerchant = merchants.find(m => m.id === selectedMerchantId);
    if (!selectedMerchant) {
      alert('Merchant not found');
      return;
    }

    setIsSubmitting(true);

    try {
      let successCount = 0;
      const errors: string[] = [];

      for (const bulkTrade of bulkTrades) {
        const trade: Trade = {
          id: generateId(),
          type: bulkTrade.type,
          merchantId: selectedMerchantId,
          merchantName: selectedMerchant.name,
          metalType: bulkTrade.metalType,
          weight: bulkTrade.weight,
          pricePerUnit: bulkTrade.pricePerUnit,
          totalAmount: bulkTrade.totalAmount,
          amountPaid: bulkTrade.amountPaid,
          amountReceived: bulkTrade.amountReceived,
          laborCharges: bulkTrade.laborCharges,
          settlementType: bulkTrade.settlementType,
          settlementDirection: bulkTrade.settlementDirection,
          tradeDate: tradeDate,
          notes: bulkTrade.notes,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const { error } = await TradeService.addTrade(trade);
        if (error) {
          errors.push(`Failed to add ${bulkTrade.type} trade: ${error}`);
        } else {
          successCount++;
        }
      }

      if (successCount === bulkTrades.length) {
        alert(`✅ Successfully added ${successCount} trade${successCount > 1 ? 's' : ''}!`);
        navigate('/history');
      } else if (successCount > 0) {
        alert(`⚠️ Added ${successCount} out of ${bulkTrades.length} trades.\n\nErrors:\n${errors.join('\n')}`);
        navigate('/history');
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

  const merchantOptions = [
    { value: '', label: 'Select Merchant' },
    ...merchants.map(m => ({ value: m.id, label: m.name }))
  ];

  const totalAmount = bulkTrades.reduce((sum, trade) => sum + trade.totalAmount, 0);

  if (isLoadingMerchants) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Bulk Trade Entry</h1>
            <p className="text-gray-400">Add multiple trades for the same merchant</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </motion.div>

      {/* Progress Steps */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3].map((stepNum) => (
            <React.Fragment key={stepNum}>
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                  step >= stepNum 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {step > stepNum ? <Check className="w-5 h-5" /> : stepNum}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${step >= stepNum ? 'text-white' : 'text-gray-400'}`}>
                    {stepNum === 1 && 'Select Merchant'}
                    {stepNum === 2 && 'Add Trades'}
                    {stepNum === 3 && 'Review & Submit'}
                  </p>
                </div>
              </div>
              {stepNum < 3 && (
                <div className={`flex-1 h-1 mx-4 rounded ${
                  step > stepNum ? 'bg-primary-500' : 'bg-gray-700'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Step 1: Select Merchant & Date */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">Step 1: Select Merchant & Date</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <Select
                    label="Merchant"
                    options={merchantOptions}
                    value={selectedMerchantId}
                    onChange={(e) => setSelectedMerchantId(e.target.value)}
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
                label="Trade Date"
                type="date"
                value={tradeDate}
                onChange={(e) => setTradeDate(e.target.value)}
                whiteBorder
              />

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedMerchantId || !tradeDate}
                >
                  Next: Add Trades
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Step 2: Add Trades */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Step 2: Add Trades</h2>
              <Button onClick={() => setShowAddTradeModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Trade
              </Button>
            </div>

            {bulkTrades.length === 0 ? (
              <div className="text-center py-8">
                <Layers className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">No trades added yet</p>
                <p className="text-sm text-gray-500 mb-4">Click "Add Trade" to start</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bulkTrades.map((trade, index) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          trade.type === 'buy' ? 'bg-green-500/20 text-green-400' :
                          trade.type === 'sell' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-orange-500/20 text-orange-400'
                        }`}>
                          {trade.type.toUpperCase()}
                        </span>
                        {trade.metalType && (
                          <span className="text-sm text-gray-300 capitalize">
                            {trade.metalType} • {trade.weight} {trade.metalType === 'gold' ? 'gm' : 'kg'}
                          </span>
                        )}
                      </div>
                      {trade.notes && (
                        <p className="text-sm text-gray-400 mt-2">{trade.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-lg font-bold text-white">
                        {formatCurrency(trade.totalAmount)}
                      </span>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTrade(index)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTrade(index)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-6 border-t border-gray-700 mt-6">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={bulkTrades.length === 0}
              >
                Next: Review
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <Card className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">Step 3: Review & Submit</h2>
            
            <div className="bg-gray-700 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Merchant</p>
                  <p className="text-white font-medium">
                    {merchants.find(m => m.id === selectedMerchantId)?.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Date</p>
                  <p className="text-white font-medium">
                    {new Date(tradeDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Trades</p>
                  <p className="text-white font-medium">{bulkTrades.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Amount</p>
                  <p className="text-white font-bold text-lg">{formatCurrency(totalAmount)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {bulkTrades.map((trade, index) => (
                <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-500 font-mono">#{index + 1}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      trade.type === 'buy' ? 'bg-green-500/20 text-green-400' :
                      trade.type === 'sell' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>
                      {trade.type}
                    </span>
                    {trade.metalType && (
                      <span className="text-sm text-gray-300">
                        {trade.metalType} {trade.weight}{trade.metalType === 'gold' ? 'gm' : 'kg'}
                      </span>
                    )}
                  </div>
                  <span className="text-white font-medium">
                    {formatCurrency(trade.totalAmount)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-700">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleSubmitAll}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-green-500 to-green-600"
              >
                {isSubmitting ? 'Submitting...' : `Submit ${bulkTrades.length} Trade${bulkTrades.length > 1 ? 's' : ''}`}
                <Check className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Add Merchant Modal */}
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

      {/* Add/Edit Trade Modal */}
      <Modal
        isOpen={showAddTradeModal}
        onClose={() => {
          setShowAddTradeModal(false);
          setEditingTradeIndex(null);
          reset();
        }}
        title={editingTradeIndex !== null ? 'Edit Trade' : 'Add Trade'}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit(handleAddTrade)} className="space-y-4">
          <Select
            label="Trade Type"
            options={[
              { value: 'buy', label: 'Buy' },
              { value: 'sell', label: 'Sell' },
              { value: 'settlement', label: 'Settlement' },
            ]}
            {...register('type', { required: 'Trade type is required' })}
            error={errors.type?.message}
          />

          {(watchedValues.type === 'buy' || watchedValues.type === 'sell') && (
            <>
              <Select
                label="Metal Type"
                options={[
                  { value: 'gold', label: 'Gold' },
                  { value: 'silver', label: 'Silver' },
                ]}
                {...register('metalType')}
              />

              <div className="grid grid-cols-2 gap-4">
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

              <Input
                label="Labor Charges (Optional)"
                type="number"
                step="0.01"
                placeholder="0.00"
                whiteBorder
                {...register('laborCharges', {
                  min: { value: 0, message: 'Cannot be negative' }
                })}
                error={errors.laborCharges?.message}
              />
            </>
          )}

          {watchedValues.type === 'settlement' && (
            <>
              <Select
                label="Settlement Type"
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'bank', label: 'Bank Transfer' },
                ]}
                {...register('settlementType')}
              />

              <Select
                label="Direction"
                options={[
                  { value: 'receiving', label: 'Receiving (Customer pays you)' },
                  { value: 'paying', label: 'Paying (You pay customer advance)' },
                ]}
                {...register('settlementDirection')}
              />
            </>
          )}

          <Input
            label="Total Amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            whiteBorder
            {...register('totalAmount', {
              required: 'Amount is required',
              min: { value: 0.01, message: 'Amount must be greater than 0' }
            })}
            error={errors.totalAmount?.message}
            readOnly={watchedValues.type === 'buy' || watchedValues.type === 'sell'}
            className={watchedValues.type === 'buy' || watchedValues.type === 'sell' ? 'bg-gray-800' : ''}
          />

          {watchedValues.type === 'buy' && (
            <Input
              label="Amount Paid"
              type="number"
              step="0.01"
              placeholder="0.00"
              whiteBorder
              {...register('amountPaid', {
                min: { value: 0, message: 'Cannot be negative' }
              })}
              error={errors.amountPaid?.message}
            />
          )}

          {watchedValues.type === 'sell' && (
            <Input
              label="Amount Received"
              type="number"
              step="0.01"
              placeholder="0.00"
              whiteBorder
              {...register('amountReceived', {
                min: { value: 0, message: 'Cannot be negative' }
              })}
              error={errors.amountReceived?.message}
            />
          )}

          <Input
            label="Notes (Optional)"
            placeholder="Add any notes"
            whiteBorder
            {...register('notes')}
          />

          <div className="flex space-x-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingTradeIndex !== null ? 'Update Trade' : 'Add Trade'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddTradeModal(false);
                setEditingTradeIndex(null);
                reset();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};



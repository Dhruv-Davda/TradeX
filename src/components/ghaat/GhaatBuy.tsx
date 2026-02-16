import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { ShoppingCart, Plus, Trash2, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { PageSkeleton } from '../ui/Skeleton';
import { Karigar } from '../../types';
import { generateId } from '../../utils/calculations';
import { GhaatService } from '../../services/ghaatService';
import { RawGoldLedgerService } from '../../services/rawGoldLedgerService';
import { KarigarsService } from '../../services/karigarsService';
import { JewelleryCategoryService } from '../../services/jewelleryCategoryService';
import { DEFAULT_JEWELLERY_CATEGORIES } from '../../lib/constants';

interface GhaatBuyFormData {
  karigarId: string;
  category: string;
  units: number;
  grossWeightPerUnit: number;
  purity: number;
  laborType: string;
  laborAmount: number;
  transactionDate: string;
  notes?: string;
  goldGivenWeight?: number;
  goldGivenPurity?: number;
  cashPaid?: number;
}

interface PendingGhaatBuy {
  id: string;
  category: string;
  units: number;
  grossWeightPerUnit: number;
  purity: number;
  totalGrossWeight: number;
  fineGold: number;
  laborType: string;
  laborAmount: number;
  notes?: string;
  goldGivenWeight?: number;
  goldGivenPurity?: number;
  goldGivenFine?: number;
  cashPaid?: number;
}

export const GhaatBuy: React.FC = () => {
  const [karigars, setKarigars] = useState<Karigar[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddKarigar, setShowAddKarigar] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newKarigar, setNewKarigar] = useState({ name: '', phone: '', address: '' });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [pendingTrades, setPendingTrades] = useState<PendingGhaatBuy[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<GhaatBuyFormData>({
    defaultValues: {
      purity: 92,
      laborType: 'cash',
      units: 1,
      transactionDate: new Date().toISOString().split('T')[0],
    }
  });

  const watchedValues = watch();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [karigarResult, categoryResult] = await Promise.all([
          KarigarsService.getKarigars(),
          JewelleryCategoryService.getCategories(),
        ]);
        if (!karigarResult.error) setKarigars(karigarResult.karigars);
        if (!categoryResult.error) setCustomCategories(categoryResult.categories.map(c => c.name));
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Calculations
  const units = Number(watchedValues.units) || 0;
  const weightPerUnit = Number(watchedValues.grossWeightPerUnit) || 0;
  const purity = Number(watchedValues.purity) || 0;
  const totalGrossWeight = units * weightPerUnit;
  const fineGold = totalGrossWeight * purity / 100;
  const goldGivenWeight = Number(watchedValues.goldGivenWeight) || 0;
  const goldGivenPurity = Number(watchedValues.goldGivenPurity) || 0;
  const goldGivenFine = goldGivenWeight * goldGivenPurity / 100;
  const cashPaid = Number(watchedValues.cashPaid) || 0;

  const allCategories = [...new Set([...DEFAULT_JEWELLERY_CATEGORIES, ...customCategories])];
  const categoryOptions = [
    { value: '', label: 'Select Category' },
    ...allCategories.map(c => ({ value: c, label: c })),
  ];

  const karigarOptions = [
    { value: '', label: 'Select Karigar' },
    ...karigars.map(k => ({ value: k.id, label: k.name })),
  ];

  const onSubmit = async (data: GhaatBuyFormData) => {
    if (pendingTrades.length > 0) {
      setShowPreview(true);
      return;
    }

    const selectedKarigar = karigars.find(k => k.id === data.karigarId);
    if (!selectedKarigar) return;

    try {
      const { transaction, error } = await GhaatService.addTransaction({
        type: 'buy',
        karigarId: data.karigarId,
        karigarName: selectedKarigar.name,
        category: data.category,
        units: Number(data.units),
        grossWeightPerUnit: Number(data.grossWeightPerUnit),
        purity: Number(data.purity),
        totalGrossWeight,
        fineGold,
        laborType: data.laborType as 'cash' | 'gold',
        laborAmount: Number(data.laborAmount) || 0,
        transactionDate: data.transactionDate,
        notes: data.notes,
        goldGivenWeight: goldGivenWeight || undefined,
        goldGivenPurity: goldGivenPurity || undefined,
        goldGivenFine: goldGivenFine || undefined,
        cashPaid: cashPaid || undefined,
      });

      if (error) {
        alert('Error saving transaction: ' + error);
        return;
      }

      // Create raw gold ledger entry if gold was given to karigar
      if (goldGivenFine > 0 && transaction) {
        await RawGoldLedgerService.addEntry({
          type: 'out',
          source: 'karigar_payment',
          referenceId: transaction.id,
          grossWeight: goldGivenWeight,
          purity: goldGivenPurity,
          fineGold: goldGivenFine,
          cashAmount: cashPaid || undefined,
          counterpartyName: selectedKarigar.name,
          counterpartyId: data.karigarId,
          transactionDate: data.transactionDate,
          notes: `Gold given to ${selectedKarigar.name} for purchase`,
        });
      }

      reset({ purity: 92, laborType: 'cash', units: 1, transactionDate: new Date().toISOString().split('T')[0] });
      setShowPayment(false);
      alert('Jewellery purchase recorded successfully!');
    } catch (error) {
      alert('Unexpected error saving transaction');
    }
  };

  const handleAddToPending = (data: GhaatBuyFormData) => {
    const pending: PendingGhaatBuy = {
      id: generateId(),
      category: data.category,
      units: Number(data.units),
      grossWeightPerUnit: Number(data.grossWeightPerUnit),
      purity: Number(data.purity),
      totalGrossWeight,
      fineGold,
      laborType: data.laborType,
      laborAmount: Number(data.laborAmount) || 0,
      notes: data.notes,
      goldGivenWeight: goldGivenWeight || undefined,
      goldGivenPurity: goldGivenPurity || undefined,
      goldGivenFine: goldGivenFine || undefined,
      cashPaid: cashPaid || undefined,
    };

    setPendingTrades([...pendingTrades, pending]);
    const currentKarigar = watchedValues.karigarId;
    const currentDate = watchedValues.transactionDate;
    reset();
    setValue('karigarId', currentKarigar);
    setValue('transactionDate', currentDate);
    setValue('purity', 92);
    setValue('laborType', 'cash');
    setValue('units', 1);
    setShowPayment(false);
  };

  const handleSubmitAll = async () => {
    const selectedKarigar = karigars.find(k => k.id === watchedValues.karigarId);
    if (!selectedKarigar) {
      alert('Karigar not found');
      return;
    }

    setIsSubmitting(true);
    try {
      let successCount = 0;
      const allItems = [...pendingTrades];

      // Add current form if filled
      if (watchedValues.grossWeightPerUnit && watchedValues.category) {
        allItems.push({
          id: generateId(),
          category: watchedValues.category,
          units: Number(watchedValues.units),
          grossWeightPerUnit: Number(watchedValues.grossWeightPerUnit),
          purity: Number(watchedValues.purity),
          totalGrossWeight,
          fineGold,
          laborType: watchedValues.laborType,
          laborAmount: Number(watchedValues.laborAmount) || 0,
          notes: watchedValues.notes,
          goldGivenWeight: goldGivenWeight || undefined,
          goldGivenPurity: goldGivenPurity || undefined,
          goldGivenFine: goldGivenFine || undefined,
          cashPaid: cashPaid || undefined,
        });
      }

      for (const item of allItems) {
        const { transaction, error } = await GhaatService.addTransaction({
          type: 'buy',
          karigarId: watchedValues.karigarId,
          karigarName: selectedKarigar.name,
          category: item.category,
          units: item.units,
          grossWeightPerUnit: item.grossWeightPerUnit,
          purity: item.purity,
          totalGrossWeight: item.totalGrossWeight,
          fineGold: item.fineGold,
          laborType: item.laborType as 'cash' | 'gold',
          laborAmount: item.laborAmount,
          transactionDate: watchedValues.transactionDate,
          notes: item.notes,
          goldGivenWeight: item.goldGivenWeight,
          goldGivenPurity: item.goldGivenPurity,
          goldGivenFine: item.goldGivenFine,
          cashPaid: item.cashPaid,
        });
        if (!error) {
          successCount++;
          // Create raw gold ledger entry if gold was given
          if (item.goldGivenFine && item.goldGivenFine > 0 && transaction) {
            await RawGoldLedgerService.addEntry({
              type: 'out',
              source: 'karigar_payment',
              referenceId: transaction.id,
              grossWeight: item.goldGivenWeight || 0,
              purity: item.goldGivenPurity || 0,
              fineGold: item.goldGivenFine,
              cashAmount: item.cashPaid || undefined,
              counterpartyName: selectedKarigar.name,
              counterpartyId: watchedValues.karigarId,
              transactionDate: watchedValues.transactionDate,
              notes: `Gold given to ${selectedKarigar.name} for purchase`,
            });
          }
        }
      }

      if (successCount === allItems.length) {
        alert(`Successfully added ${successCount} purchase${successCount > 1 ? 's' : ''}!`);
        setPendingTrades([]);
        reset({ purity: 92, laborType: 'cash', units: 1, transactionDate: new Date().toISOString().split('T')[0] });
        setShowPreview(false);
        setShowPayment(false);
      } else {
        alert(`Added ${successCount} out of ${allItems.length} transactions.`);
      }
    } catch (error) {
      alert('Unexpected error submitting transactions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addKarigar = async () => {
    if (!newKarigar.name.trim()) return;
    try {
      const { karigar, error } = await KarigarsService.addKarigar({
        name: newKarigar.name,
        phone: newKarigar.phone || undefined,
        address: newKarigar.address || undefined,
      });
      if (error) {
        alert('Error adding karigar: ' + error);
        return;
      }
      if (karigar) {
        setKarigars([...karigars, karigar]);
        setNewKarigar({ name: '', phone: '', address: '' });
        setShowAddKarigar(false);
      }
    } catch {
      alert('Unexpected error adding karigar');
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const { error } = await JewelleryCategoryService.addCategory(newCategoryName.trim());
      if (error) {
        alert('Error adding category: ' + error);
        return;
      }
      setCustomCategories([...customCategories, newCategoryName.trim()]);
      setNewCategoryName('');
      setShowAddCategory(false);
    } catch {
      alert('Unexpected error adding category');
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
          <ShoppingCart className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Buy Jewellery from Karigar</h1>
          <p className="text-gray-400">Record jewellery purchase with purity tracking</p>
        </div>
      </motion.div>

      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Karigar Selection */}
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Select
                label="Karigar"
                options={karigarOptions}
                {...register('karigarId', { required: 'Please select a karigar' })}
                error={errors.karigarId?.message}
                disabled={pendingTrades.length > 0}
              />
            </div>
            <Button type="button" onClick={() => setShowAddKarigar(true)} variant="outline" className="mt-6" disabled={pendingTrades.length > 0}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Category Selection */}
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Select
                label="Category"
                options={categoryOptions}
                {...register('category', { required: 'Please select a category' })}
                error={errors.category?.message}
              />
            </div>
            <Button type="button" onClick={() => setShowAddCategory(true)} variant="outline" className="mt-6">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <Input
            label="Transaction Date"
            type="date"
            whiteBorder
            {...register('transactionDate', { required: 'Date is required' })}
            error={errors.transactionDate?.message}
            disabled={pendingTrades.length > 0}
          />

          {/* Units, Weight, Purity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Units"
              type="number"
              step="1"
              placeholder="1"
              whiteBorder
              {...register('units', { required: 'Units required', min: { value: 1, message: 'Min 1' } })}
              error={errors.units?.message}
            />
            <Input
              label="Weight per Unit (gm)"
              type="number"
              step="0.001"
              placeholder="0.000"
              whiteBorder
              {...register('grossWeightPerUnit', { required: 'Weight required', min: { value: 0.001, message: 'Must be > 0' } })}
              error={errors.grossWeightPerUnit?.message}
            />
            <Input
              label="Purity %"
              type="number"
              step="0.01"
              placeholder="92"
              whiteBorder
              {...register('purity', { required: 'Purity required', min: { value: 1, message: 'Min 1%' }, max: { value: 100, message: 'Max 100%' } })}
              error={errors.purity?.message}
            />
          </div>

          {/* Auto-calculated values */}
          {totalGrossWeight > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gray-700 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Total Gross Weight:</span>
                <span className="text-white font-medium">{totalGrossWeight.toFixed(3)} gm</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-600">
                <span className="text-gray-300 font-medium">Fine Gold:</span>
                <span className="text-yellow-400 font-bold">{fineGold.toFixed(3)} gm</span>
              </div>
            </motion.div>
          )}

          {/* Labor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Labor Type"
              options={[
                { value: 'cash', label: 'Cash (₹)' },
                { value: 'gold', label: 'Gold (gm)' },
              ]}
              {...register('laborType')}
            />
            <Input
              label={`Labor Amount (${watchedValues.laborType === 'gold' ? 'gm' : '₹'})`}
              type="number"
              step="0.01"
              placeholder="0.00"
              whiteBorder
              {...register('laborAmount', { min: { value: 0, message: 'Cannot be negative' } })}
              error={errors.laborAmount?.message}
            />
          </div>

          {/* Payment to Karigar (Collapsible) */}
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPayment(!showPayment)}
              className="w-full px-4 py-3 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span className="text-sm font-medium text-gray-300">Payment to Karigar (Optional)</span>
              {showPayment ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {showPayment && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-4 border-t border-white/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Gold Given (gm)"
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    whiteBorder
                    {...register('goldGivenWeight', { min: { value: 0, message: 'Cannot be negative' } })}
                  />
                  <Input
                    label="Gold Purity (%)"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    whiteBorder
                    {...register('goldGivenPurity', { min: { value: 0, message: 'Min 0%' }, max: { value: 100, message: 'Max 100%' } })}
                  />
                </div>
                {goldGivenFine > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-amber-400">Fine Gold Given:</span>
                      <span className="text-amber-300 font-bold">{goldGivenFine.toFixed(3)} gm</span>
                    </div>
                  </div>
                )}
                <Input
                  label="Cash Paid (₹)"
                  type="number"
                  step="1"
                  placeholder="0"
                  whiteBorder
                  {...register('cashPaid', { min: { value: 0, message: 'Cannot be negative' } })}
                />
              </motion.div>
            )}
          </div>

          <Input label="Notes (Optional)" placeholder="Add any notes" whiteBorder {...register('notes')} />

          {/* Action buttons */}
          <div className="flex gap-3">
            {pendingTrades.length > 0 ? (
              <>
                <Button type="button" onClick={handleSubmit(handleAddToPending)} variant="outline" className="flex-1">
                  <Plus className="w-4 h-4 mr-2" /> Add Another
                </Button>
                <Button type="button" onClick={() => setShowPreview(true)} className="flex-1">
                  <Eye className="w-4 h-4 mr-2" /> Submit All ({pendingTrades.length + (watchedValues.grossWeightPerUnit ? 1 : 0)})
                </Button>
              </>
            ) : (
              <>
                <Button type="submit" className="flex-1" disabled={!watchedValues.karigarId || !watchedValues.category || !watchedValues.grossWeightPerUnit}>
                  Record Purchase
                </Button>
                <Button type="button" onClick={handleSubmit(handleAddToPending)} variant="outline" className="px-6"
                  disabled={!watchedValues.karigarId || !watchedValues.category || !watchedValues.grossWeightPerUnit}>
                  <Plus className="w-5 h-5 mr-2" /> Add More
                </Button>
              </>
            )}
          </div>
        </form>
      </Card>

      {/* Pending list */}
      {pendingTrades.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Pending Purchases ({pendingTrades.length})</h3>
            <Button variant="ghost" size="sm" onClick={() => setPendingTrades([])} className="text-red-400 hover:text-red-300">
              Clear All
            </Button>
          </div>
          <div className="space-y-3">
            {pendingTrades.map((trade, index) => (
              <motion.div key={trade.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-500 font-mono">#{index + 1}</span>
                    <span className="text-sm text-white font-medium">{trade.category}</span>
                    <span className="text-sm text-gray-300">{trade.units} pcs × {trade.grossWeightPerUnit} gm</span>
                  </div>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-xs text-gray-400">Purity: {trade.purity}%</span>
                    <span className="text-xs text-yellow-400">Fine Gold: {trade.fineGold.toFixed(3)} gm</span>
                    {trade.laborAmount > 0 && (
                      <span className="text-xs text-gray-400">Labor: {trade.laborAmount} {trade.laborType === 'gold' ? 'gm' : '₹'}</span>
                    )}
                  </div>
                  {(trade.goldGivenFine || trade.cashPaid) && (
                    <div className="flex items-center space-x-4 mt-1">
                      {trade.goldGivenFine ? (
                        <span className="text-xs text-amber-400">Gold Given: {trade.goldGivenFine.toFixed(3)} gm</span>
                      ) : null}
                      {trade.cashPaid ? (
                        <span className="text-xs text-green-400">Cash: ₹{trade.cashPaid.toLocaleString('en-IN')}</span>
                      ) : null}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setPendingTrades(pendingTrades.filter(t => t.id !== trade.id))}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-600 flex justify-between items-center">
            <span className="text-gray-300 font-medium">Total Fine Gold:</span>
            <span className="text-yellow-400 font-bold text-xl">{pendingTrades.reduce((s, t) => s + t.fineGold, 0).toFixed(3)} gm</span>
          </div>
        </Card>
      )}

      {/* Add Karigar Modal */}
      <Modal isOpen={showAddKarigar} onClose={() => setShowAddKarigar(false)} title="Add New Karigar">
        <div className="space-y-4">
          <Input label="Karigar Name" placeholder="Enter name" value={newKarigar.name}
            onChange={e => setNewKarigar({ ...newKarigar, name: e.target.value })} required />
          <Input label="Phone (Optional)" placeholder="Enter phone" value={newKarigar.phone}
            onChange={e => setNewKarigar({ ...newKarigar, phone: e.target.value })} />
          <Input label="Address (Optional)" placeholder="Enter address" value={newKarigar.address}
            onChange={e => setNewKarigar({ ...newKarigar, address: e.target.value })} />
          <Button onClick={addKarigar} className="w-full">Add Karigar</Button>
        </div>
      </Modal>

      {/* Add Category Modal */}
      <Modal isOpen={showAddCategory} onClose={() => setShowAddCategory(false)} title="Add Custom Category">
        <div className="space-y-4">
          <Input label="Category Name" placeholder="e.g., Toe Rings" value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)} required />
          <Button onClick={addCategory} className="w-full">Add Category</Button>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Review & Submit Purchases" className="max-w-3xl">
        <div className="space-y-4">
          <div className="bg-gray-700 p-4 rounded-lg grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Karigar</p>
              <p className="text-white font-medium">{karigars.find(k => k.id === watchedValues.karigarId)?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Date</p>
              <p className="text-white font-medium">{watchedValues.transactionDate}</p>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pendingTrades.map((trade, index) => (
              <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-500 font-mono">#{index + 1}</span>
                  <div>
                    <span className="text-sm text-white">{trade.category}</span>
                    <p className="text-xs text-gray-400">{trade.units} pcs × {trade.grossWeightPerUnit} gm @ {trade.purity}%</p>
                  </div>
                </div>
                <span className="text-yellow-400 font-medium">{trade.fineGold.toFixed(3)} gm</span>
              </div>
            ))}
          </div>

          <div className="bg-gray-700 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Items:</span>
              <span className="text-white font-bold">{pendingTrades.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Fine Gold:</span>
              <span className="text-yellow-400 font-bold text-xl">{pendingTrades.reduce((s, t) => s + t.fineGold, 0).toFixed(3)} gm</span>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowPreview(false)} className="flex-1">Back to Edit</Button>
            <Button onClick={handleSubmitAll} disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600">
              {isSubmitting ? 'Submitting...' : 'Submit All Purchases'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

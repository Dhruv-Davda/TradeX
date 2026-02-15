import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { TrendingUp, Plus, Trash2, Eye, Clock, CheckCircle, Package } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { PageSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { GhaatConfirmSaleModal } from '../ui/GhaatConfirmSaleModal';
import { Merchant, PendingGhaatSaleGroup } from '../../types';
import { generateId } from '../../utils/calculations';
import { GhaatService } from '../../services/ghaatService';
import { MerchantsService } from '../../services/merchantsService';
import { JewelleryCategoryService } from '../../services/jewelleryCategoryService';
import { DEFAULT_JEWELLERY_CATEGORIES } from '../../lib/constants';

type SellTab = 'give' | 'pending';

interface GiveToMerchantFormData {
  merchantId: string;
  category: string;
  units: number;
  grossWeightPerUnit: number;
  purity: number;
  transactionDate: string;
  notes?: string;
}

interface LocalPendingItem {
  id: string;
  category: string;
  units: number;
  grossWeightPerUnit: number;
  purity: number;
  totalGrossWeight: number;
  fineGold: number;
  notes?: string;
}

export const GhaatSell: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SellTab>('give');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // "Give to Merchant" tab state
  const [localPendingItems, setLocalPendingItems] = useState<LocalPendingItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddMerchant, setShowAddMerchant] = useState(false);
  const [newMerchant, setNewMerchant] = useState({ name: '', phone: '', email: '', olderDues: '' });

  // "Pending Sales" tab state
  const [pendingSaleGroups, setPendingSaleGroups] = useState<PendingGhaatSaleGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<PendingGhaatSaleGroup | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<GiveToMerchantFormData>({
    defaultValues: {
      purity: 95,
      units: 1,
      transactionDate: new Date().toISOString().split('T')[0],
    }
  });

  const watchedValues = watch();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [merchantResult, categoryResult] = await Promise.all([
          MerchantsService.getMerchants(),
          JewelleryCategoryService.getCategories(),
        ]);
        if (!merchantResult.error) setMerchants(merchantResult.merchants);
        if (!categoryResult.error) setCustomCategories(categoryResult.categories.map(c => c.name));
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const loadPendingSales = async () => {
    setPendingLoading(true);
    try {
      const { groups, error } = await GhaatService.getPendingSales();
      if (!error) setPendingSaleGroups(groups);
    } catch (error) {
      console.error('Error loading pending sales:', error);
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pending') {
      loadPendingSales();
    }
  }, [activeTab]);

  const units = Number(watchedValues.units) || 0;
  const weightPerUnit = Number(watchedValues.grossWeightPerUnit) || 0;
  const purity = Number(watchedValues.purity) || 0;
  const totalGrossWeight = units * weightPerUnit;
  const fineGold = totalGrossWeight * purity / 100;

  const allCategories = [...new Set([...DEFAULT_JEWELLERY_CATEGORIES, ...customCategories])];
  const categoryOptions = [
    { value: '', label: 'Select Category' },
    ...allCategories.map(c => ({ value: c, label: c })),
  ];

  const merchantOptions = [
    { value: '', label: 'Select Merchant' },
    ...merchants.map(m => ({ value: m.id, label: m.name })),
  ];

  const handleAddToPending = (data: GiveToMerchantFormData) => {
    const pending: LocalPendingItem = {
      id: generateId(),
      category: data.category,
      units: Number(data.units),
      grossWeightPerUnit: Number(data.grossWeightPerUnit),
      purity: Number(data.purity),
      totalGrossWeight,
      fineGold,
      notes: data.notes,
    };

    setLocalPendingItems([...localPendingItems, pending]);
    const currentMerchant = watchedValues.merchantId;
    const currentDate = watchedValues.transactionDate;
    reset();
    setValue('merchantId', currentMerchant);
    setValue('transactionDate', currentDate);
    setValue('purity', 95);
    setValue('units', 1);
  };

  const onSubmit = async (data: GiveToMerchantFormData) => {
    if (localPendingItems.length > 0) {
      setShowPreview(true);
      return;
    }

    // Single item submission
    const selectedMerchant = merchants.find(m => m.id === data.merchantId);
    if (!selectedMerchant) return;

    setIsSubmitting(true);
    try {
      const { error } = await GhaatService.addTransaction({
        type: 'sell',
        status: 'pending',
        groupId: generateId(),
        merchantId: data.merchantId,
        merchantName: selectedMerchant.name,
        category: data.category,
        units: Number(data.units),
        grossWeightPerUnit: Number(data.grossWeightPerUnit),
        purity: Number(data.purity),
        totalGrossWeight,
        fineGold,
        transactionDate: data.transactionDate,
        notes: data.notes,
      });

      if (error) {
        alert('Error saving: ' + error);
        return;
      }

      reset({ purity: 95, units: 1, transactionDate: new Date().toISOString().split('T')[0] });
      alert('Jewellery given to merchant (pending)!');
    } catch {
      alert('Unexpected error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAll = async () => {
    const selectedMerchant = merchants.find(m => m.id === watchedValues.merchantId);
    if (!selectedMerchant) { alert('Merchant not found'); return; }

    setIsSubmitting(true);
    try {
      const groupId = generateId();
      let successCount = 0;
      const allItems = [...localPendingItems];

      if (watchedValues.grossWeightPerUnit && watchedValues.category) {
        allItems.push({
          id: generateId(),
          category: watchedValues.category,
          units: Number(watchedValues.units),
          grossWeightPerUnit: Number(watchedValues.grossWeightPerUnit),
          purity: Number(watchedValues.purity),
          totalGrossWeight,
          fineGold,
          notes: watchedValues.notes,
        });
      }

      for (const item of allItems) {
        const { error } = await GhaatService.addTransaction({
          type: 'sell',
          status: 'pending',
          groupId,
          merchantId: watchedValues.merchantId,
          merchantName: selectedMerchant.name,
          category: item.category,
          units: item.units,
          grossWeightPerUnit: item.grossWeightPerUnit,
          purity: item.purity,
          totalGrossWeight: item.totalGrossWeight,
          fineGold: item.fineGold,
          transactionDate: watchedValues.transactionDate,
          notes: item.notes,
        });
        if (!error) successCount++;
      }

      if (successCount === allItems.length) {
        alert(`${successCount} item${successCount > 1 ? 's' : ''} given to merchant (pending)!`);
        setLocalPendingItems([]);
        reset({ purity: 95, units: 1, transactionDate: new Date().toISOString().split('T')[0] });
        setShowPreview(false);
      } else {
        alert(`Recorded ${successCount} out of ${allItems.length} items.`);
      }
    } catch { alert('Unexpected error'); }
    finally { setIsSubmitting(false); }
  };

  const addMerchant = async () => {
    if (!newMerchant.name.trim()) return;
    const olderDues = newMerchant.olderDues.trim() === '' ? 0 : Number(newMerchant.olderDues) || 0;
    try {
      const { merchant, error } = await MerchantsService.addMerchant({
        name: newMerchant.name,
        phone: newMerchant.phone || undefined,
        email: newMerchant.email || undefined,
        totalDue: olderDues,
        totalOwe: 0,
      });
      if (error) { alert('Error: ' + error); return; }
      if (merchant) {
        setMerchants([...merchants, merchant]);
        setNewMerchant({ name: '', phone: '', email: '', olderDues: '' });
        setShowAddMerchant(false);
      }
    } catch { alert('Unexpected error adding merchant'); }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Ghaat Sell</h1>
          <p className="text-gray-400">Give jewellery to merchants & manage pending sales</p>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('give')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'give' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" /> Give to Merchant
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'pending' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" /> Pending Sales
          {pendingSaleGroups.length > 0 && (
            <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 ml-1">
              {pendingSaleGroups.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Give to Merchant */}
      {activeTab === 'give' && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <Card className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Merchant Selection */}
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <Select
                    label="Merchant"
                    options={merchantOptions}
                    {...register('merchantId', { required: 'Please select a merchant' })}
                    error={errors.merchantId?.message}
                    disabled={localPendingItems.length > 0}
                  />
                </div>
                <Button type="button" onClick={() => setShowAddMerchant(true)} variant="outline" className="mt-6" disabled={localPendingItems.length > 0}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <Select
                label="Category"
                options={categoryOptions}
                {...register('category', { required: 'Please select a category' })}
                error={errors.category?.message}
              />

              <Input
                label="Transaction Date"
                type="date"
                whiteBorder
                {...register('transactionDate', { required: 'Date is required' })}
                error={errors.transactionDate?.message}
                disabled={localPendingItems.length > 0}
              />

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
                  placeholder="95"
                  whiteBorder
                  {...register('purity', { required: 'Purity required', min: { value: 1, message: 'Min 1%' }, max: { value: 100, message: 'Max 100%' } })}
                  error={errors.purity?.message}
                />
              </div>

              {totalGrossWeight > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gray-700 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-300">Total Gross Weight:</span>
                    <span className="text-white font-medium">{totalGrossWeight.toFixed(3)} gm</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-600">
                    <span className="text-gray-300 font-medium">Fine Gold Charged:</span>
                    <span className="text-yellow-400 font-bold">{fineGold.toFixed(3)} gm</span>
                  </div>
                </motion.div>
              )}

              <Input label="Notes (Optional)" placeholder="Add any notes" whiteBorder {...register('notes')} />

              <div className="flex gap-3">
                {localPendingItems.length > 0 ? (
                  <>
                    <Button type="button" onClick={handleSubmit(handleAddToPending)} variant="outline" className="flex-1">
                      <Plus className="w-4 h-4 mr-2" /> Add Another
                    </Button>
                    <Button type="button" onClick={() => setShowPreview(true)} className="flex-1">
                      <Eye className="w-4 h-4 mr-2" /> Submit All ({localPendingItems.length + (watchedValues.grossWeightPerUnit ? 1 : 0)})
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="submit" className="flex-1" disabled={isSubmitting || !watchedValues.merchantId || !watchedValues.category || !watchedValues.grossWeightPerUnit}>
                      {isSubmitting ? 'Saving...' : 'Give to Merchant'}
                    </Button>
                    <Button type="button" onClick={handleSubmit(handleAddToPending)} variant="outline" className="px-6"
                      disabled={!watchedValues.merchantId || !watchedValues.category || !watchedValues.grossWeightPerUnit}>
                      <Plus className="w-5 h-5 mr-2" /> Add More
                    </Button>
                  </>
                )}
              </div>
            </form>
          </Card>

          {/* Local pending list */}
          {localPendingItems.length > 0 && (
            <Card className="p-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Items to Give ({localPendingItems.length})</h3>
                <Button variant="ghost" size="sm" onClick={() => setLocalPendingItems([])} className="text-red-400 hover:text-red-300">
                  Clear All
                </Button>
              </div>
              <div className="space-y-3">
                {localPendingItems.map((trade, index) => (
                  <motion.div key={trade.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-500 font-mono">#{index + 1}</span>
                        <span className="text-sm text-white font-medium">{trade.category}</span>
                        <span className="text-sm text-gray-300">{trade.units} pcs × {trade.grossWeightPerUnit} gm @ {trade.purity}%</span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-yellow-400">Fine Gold: {trade.fineGold.toFixed(3)} gm</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setLocalPendingItems(localPendingItems.filter(t => t.id !== trade.id))}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-600 flex justify-between items-center">
                <span className="text-gray-300 font-medium">Total Fine Gold:</span>
                <span className="text-yellow-400 font-bold text-xl">{localPendingItems.reduce((s, t) => s + t.fineGold, 0).toFixed(3)} gm</span>
              </div>
            </Card>
          )}
        </motion.div>
      )}

      {/* Tab 2: Pending Sales */}
      {activeTab === 'pending' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          {pendingLoading ? (
            <PageSkeleton cards={2} />
          ) : pendingSaleGroups.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No Pending Sales"
              description="Give jewellery to a merchant to create pending sales."
              action={{ label: 'Give to Merchant', onClick: () => setActiveTab('give') }}
            />
          ) : (
            <div className="space-y-4">
              {pendingSaleGroups.map((group) => (
                <Card key={group.groupId} className="p-0 overflow-hidden">
                  {/* Group Header */}
                  <div className="p-4 bg-gray-800/50 flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">{group.merchantName}</h3>
                      <p className="text-sm text-gray-400">
                        Given on {group.dateGiven} | {group.items.length} item{group.items.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <Button
                      onClick={() => { setSelectedGroup(group); setShowConfirmModal(true); }}
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600"
                      size="sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Confirm Sale
                    </Button>
                  </div>
                  {/* Line items */}
                  <div className="divide-y divide-gray-700/50">
                    {group.items.map((item, idx) => (
                      <div key={item.id} className="p-3 px-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-mono text-xs">#{idx + 1}</span>
                          <span className="text-white text-sm">{item.category}</span>
                          <span className="text-gray-400 text-sm">
                            {item.units} pcs × {item.grossWeightPerUnit} gm @ {item.purity}%
                          </span>
                        </div>
                        <span className="text-yellow-400 font-medium text-sm">
                          {item.fineGold.toFixed(3)} gm
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Group Footer */}
                  <div className="p-3 px-4 bg-gray-800/30 flex justify-between items-center border-t border-gray-700/50">
                    <span className="text-gray-300 font-medium text-sm">Total Fine Gold:</span>
                    <span className="text-yellow-400 font-bold">{group.totalFineGold.toFixed(3)} gm</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Add Merchant Modal */}
      <Modal isOpen={showAddMerchant} onClose={() => setShowAddMerchant(false)} title="Add New Merchant">
        <div className="space-y-4">
          <Input label="Merchant Name" placeholder="Enter name" value={newMerchant.name}
            onChange={e => setNewMerchant({ ...newMerchant, name: e.target.value })} required />
          <Input label="Phone (Optional)" placeholder="Enter phone" value={newMerchant.phone}
            onChange={e => setNewMerchant({ ...newMerchant, phone: e.target.value })} />
          <Input label="Email (Optional)" type="email" placeholder="Enter email" value={newMerchant.email}
            onChange={e => setNewMerchant({ ...newMerchant, email: e.target.value })} />
          <Input label="Older Dues (Optional)" type="number" step="0.01" placeholder="0.00" value={newMerchant.olderDues}
            onChange={e => setNewMerchant({ ...newMerchant, olderDues: e.target.value })} />
          <Button onClick={addMerchant} className="w-full">Add Merchant</Button>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Review & Submit" className="max-w-3xl">
        <div className="space-y-4">
          <div className="bg-gray-700 p-4 rounded-lg grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Merchant</p>
              <p className="text-white font-medium">{merchants.find(m => m.id === watchedValues.merchantId)?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Date</p>
              <p className="text-white font-medium">{watchedValues.transactionDate}</p>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {localPendingItems.map((trade, index) => (
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
              <span className="text-white font-bold">{localPendingItems.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Fine Gold:</span>
              <span className="text-yellow-400 font-bold text-xl">{localPendingItems.reduce((s, t) => s + t.fineGold, 0).toFixed(3)} gm</span>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowPreview(false)} className="flex-1">Back to Edit</Button>
            <Button onClick={handleSubmitAll} disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600">
              {isSubmitting ? 'Submitting...' : 'Give to Merchant (Pending)'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Sale Modal */}
      <GhaatConfirmSaleModal
        isOpen={showConfirmModal}
        onClose={() => { setShowConfirmModal(false); setSelectedGroup(null); }}
        group={selectedGroup}
        onSaleConfirmed={() => {
          setShowConfirmModal(false);
          setSelectedGroup(null);
          loadPendingSales();
        }}
      />
    </div>
  );
};

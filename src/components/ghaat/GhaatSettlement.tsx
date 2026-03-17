import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Scale, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { PageSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { Merchant, Karigar, GhaatTransaction, GhaatSettlement as GhaatSettlementType, GhaatPartyType } from '../../types';
import { GhaatService } from '../../services/ghaatService';
import { GhaatSettlementService, MerchantGhaatBalance, KarigarGhaatBalance } from '../../services/ghaatSettlementService';
import { MerchantsService } from '../../services/merchantsService';
import { KarigarsService } from '../../services/karigarsService';
import { formatCurrency } from '../../utils/calculations';

interface SettlementFormData {
  direction: 'receiving' | 'paying';
  settlementDate: string;
  goldWeight: number;
  goldPurity: number;
  ratePer10gm: number;
  cashAmount: number;
  notes?: string;
}

export const GhaatSettlement: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [partyType, setPartyType] = useState<GhaatPartyType>('merchant');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [karigars, setKarigars] = useState<Karigar[]>([]);
  const [transactions, setTransactions] = useState<GhaatTransaction[]>([]);
  const [settlements, setSettlements] = useState<GhaatSettlementType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<SettlementFormData>({
    defaultValues: {
      direction: 'receiving',
      settlementDate: new Date().toISOString().split('T')[0],
      goldPurity: 92,
    }
  });

  const watchedValues = watch();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [merchantResult, karigarResult, txnResult, settlementResult] = await Promise.all([
          MerchantsService.getMerchants(),
          KarigarsService.getKarigars(),
          GhaatService.getTransactions(),
          GhaatSettlementService.getSettlements(),
        ]);
        if (!merchantResult.error) setMerchants(merchantResult.merchants);
        if (!karigarResult.error) setKarigars(karigarResult.karigars);
        if (!txnResult.error) setTransactions(txnResult.transactions);
        if (!settlementResult.error) setSettlements(settlementResult.settlements);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Reset party selection when switching type
  useEffect(() => {
    setSelectedPartyId('');
  }, [partyType]);

  // Calculations
  const goldWeight = Number(watchedValues.goldWeight) || 0;
  const goldPurity = Number(watchedValues.goldPurity) || 0;
  const goldFine = goldWeight * goldPurity / 100;
  const ratePer10gm = Number(watchedValues.ratePer10gm) || 0;
  const goldValue = ratePer10gm > 0 ? goldFine * ratePer10gm / 10 : 0;
  const cashAmount = Number(watchedValues.cashAmount) || 0;

  const partyOptions = useMemo(() => {
    const list = partyType === 'merchant'
      ? merchants.map(m => ({ value: m.id, label: m.name }))
      : karigars.map(k => ({ value: k.id, label: k.name }));
    return [{ value: '', label: `Select ${partyType === 'merchant' ? 'Merchant' : 'Karigar'}` }, ...list];
  }, [partyType, merchants, karigars]);

  const selectedPartyName = useMemo(() => {
    if (!selectedPartyId) return '';
    if (partyType === 'merchant') return merchants.find(m => m.id === selectedPartyId)?.name || '';
    return karigars.find(k => k.id === selectedPartyId)?.name || '';
  }, [selectedPartyId, partyType, merchants, karigars]);

  // Balance for selected party
  const merchantBalance: MerchantGhaatBalance | null = useMemo(() => {
    if (partyType !== 'merchant' || !selectedPartyId) return null;
    return GhaatSettlementService.calculateMerchantGhaatBalance(selectedPartyId, transactions, settlements);
  }, [partyType, selectedPartyId, transactions, settlements]);

  const karigarBalance: KarigarGhaatBalance | null = useMemo(() => {
    if (partyType !== 'karigar' || !selectedPartyId) return null;
    return GhaatSettlementService.calculateKarigarGhaatBalance(selectedPartyId, transactions, settlements);
  }, [partyType, selectedPartyId, transactions, settlements]);

  // Settlement history for selected party
  const partySettlements = useMemo(() => {
    if (!selectedPartyId) return [];
    return settlements
      .filter(s => s.partyType === partyType && s.partyId === selectedPartyId)
      .sort((a, b) => b.settlementDate.localeCompare(a.settlementDate));
  }, [settlements, partyType, selectedPartyId]);

  const onSubmit = async (data: SettlementFormData) => {
    if (!selectedPartyId || !selectedPartyName) return;
    if (goldFine <= 0 && cashAmount <= 0) {
      alert('Enter gold or cash amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const { settlement, error } = await GhaatSettlementService.addSettlement({
        partyType,
        partyId: selectedPartyId,
        partyName: selectedPartyName,
        direction: data.direction,
        cashAmount: cashAmount,
        goldWeight: goldWeight,
        goldPurity: goldPurity,
        goldFine: goldFine,
        ratePer10gm: ratePer10gm || undefined,
        goldValue: goldValue || undefined,
        notes: data.notes,
        settlementDate: data.settlementDate,
      });

      if (error) {
        alert('Error: ' + error);
        return;
      }

      if (settlement) {
        setSettlements([settlement, ...settlements]);
        reset({
          direction: 'receiving',
          settlementDate: new Date().toISOString().split('T')[0],
          goldPurity: 92,
        });
        alert('Settlement recorded!');
      }
    } catch {
      alert('Unexpected error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this settlement?')) return;
    const { error } = await GhaatSettlementService.deleteSettlement(id);
    if (error) {
      alert('Error: ' + error);
      return;
    }
    setSettlements(settlements.filter(s => s.id !== id));
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Scale className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Ghaat Settlement</h1>
          <p className="text-gray-400">Settle dues with merchants & karigars in cash or gold</p>
        </div>
      </motion.div>

      {/* Party Type Toggle */}
      <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1">
        {(['merchant', 'karigar'] as const).map(type => (
          <button
            key={type}
            onClick={() => setPartyType(type)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              partyType === type ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {type === 'merchant' ? 'Merchant' : 'Karigar'}
          </button>
        ))}
      </div>

      {/* Party Selection */}
      <Card className="p-4">
        <Select
          label={partyType === 'merchant' ? 'Select Merchant' : 'Select Karigar'}
          options={partyOptions}
          value={selectedPartyId}
          onChange={e => setSelectedPartyId(e.target.value)}
        />
      </Card>

      {/* Balance Card */}
      {selectedPartyId && partyType === 'merchant' && merchantBalance && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-4 border-purple-500/20">
            <h3 className="text-sm font-semibold text-purple-400 mb-3">Balance with {selectedPartyName}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs text-gray-500">Pending Gold</p>
                <p className="text-sm font-bold text-yellow-400">{merchantBalance.fineGoldPending.toFixed(3)} gm</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs text-gray-500">Cash Shortfall</p>
                <p className="text-sm font-bold text-red-400">{formatCurrency(merchantBalance.cashDue)}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs text-gray-500">Net Cash Due</p>
                <p className={`text-sm font-bold ${merchantBalance.netCashDue > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {formatCurrency(Math.abs(merchantBalance.netCashDue))}
                  {merchantBalance.netCashDue < 0 ? ' (advance)' : ''}
                </p>
              </div>
              {merchantBalance.cashSettled > 0 && (
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Cash Settled</p>
                  <p className="text-sm font-bold text-green-400">{formatCurrency(merchantBalance.cashSettled)}</p>
                </div>
              )}
              {merchantBalance.goldSettled > 0 && (
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Gold Settled</p>
                  <p className="text-sm font-bold text-yellow-400">{merchantBalance.goldSettled.toFixed(3)} gm</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {selectedPartyId && partyType === 'karigar' && karigarBalance && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-4 border-purple-500/20">
            <h3 className="text-sm font-semibold text-purple-400 mb-3">Balance with {selectedPartyName}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs text-gray-500">Jewellery Received</p>
                <p className="text-sm font-bold text-yellow-400">{karigarBalance.jewelleryReceived.toFixed(3)} gm</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs text-gray-500">Gold Given</p>
                <p className="text-sm font-bold text-amber-400">{karigarBalance.goldGiven.toFixed(3)} gm</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs text-gray-500">Net Gold Balance</p>
                <p className={`text-sm font-bold ${karigarBalance.netGoldBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {karigarBalance.netGoldBalance >= 0 ? '+' : ''}{karigarBalance.netGoldBalance.toFixed(3)} gm
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs text-gray-500">Cash Paid</p>
                <p className="text-sm font-bold text-green-400">{formatCurrency(karigarBalance.cashPaid)}</p>
              </div>
              {karigarBalance.goldSettled > 0 && (
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Gold Settled</p>
                  <p className="text-sm font-bold text-yellow-400">{karigarBalance.goldSettled.toFixed(3)} gm</p>
                </div>
              )}
              {karigarBalance.cashSettled > 0 && (
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Cash Settled</p>
                  <p className="text-sm font-bold text-green-400">{formatCurrency(karigarBalance.cashSettled)}</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Settlement Form */}
      {selectedPartyId && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Record Settlement</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Direction */}
              <Select
                label="Direction"
                options={[
                  { value: 'receiving', label: `Receiving from ${selectedPartyName}` },
                  { value: 'paying', label: `Paying to ${selectedPartyName}` },
                ]}
                {...register('direction', { required: true })}
              />

              <Input
                label="Settlement Date"
                type="date"
                whiteBorder
                {...register('settlementDate', { required: 'Date is required' })}
                error={errors.settlementDate?.message}
              />

              {/* Gold Section */}
              <div className="border border-white/10 rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-medium text-gray-400">Gold</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Weight (gm)"
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    whiteBorder
                    {...register('goldWeight', { min: { value: 0, message: 'Cannot be negative' } })}
                  />
                  <Input
                    label="Purity (%)"
                    type="number"
                    step="0.01"
                    placeholder="92"
                    whiteBorder
                    {...register('goldPurity', { min: { value: 0, message: 'Min 0%' }, max: { value: 100, message: 'Max 100%' } })}
                  />
                </div>
                {goldFine > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-yellow-400">Fine Gold:</span>
                      <span className="text-yellow-300 font-bold">{goldFine.toFixed(3)} gm</span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Rate / 10gm (optional)"
                    type="number"
                    step="1"
                    placeholder="0"
                    whiteBorder
                    {...register('ratePer10gm', { min: { value: 0, message: 'Cannot be negative' } })}
                  />
                  {goldValue > 0 && (
                    <div className="flex items-end pb-2">
                      <p className="text-sm text-gray-400">Gold Value: <span className="text-white font-medium">{formatCurrency(goldValue)}</span></p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cash Section */}
              <Input
                label="Cash Amount (₹)"
                type="number"
                step="1"
                placeholder="0"
                whiteBorder
                {...register('cashAmount', { min: { value: 0, message: 'Cannot be negative' } })}
              />

              <Input label="Notes (Optional)" placeholder="Add any notes" whiteBorder {...register('notes')} />

              {/* Summary */}
              {(goldFine > 0 || cashAmount > 0) && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-purple-400">Settlement Summary</h4>
                  <div className="text-sm space-y-1">
                    <p className="text-gray-300">
                      {watchedValues.direction === 'receiving' ? 'Receiving from' : 'Paying to'} <span className="text-white font-medium">{selectedPartyName}</span>
                    </p>
                    {goldFine > 0 && (
                      <p className="text-yellow-400">Gold: {goldFine.toFixed(3)} gm fine ({goldWeight} gm @ {goldPurity}%){goldValue > 0 ? ` = ${formatCurrency(goldValue)}` : ''}</p>
                    )}
                    {cashAmount > 0 && (
                      <p className="text-green-400">Cash: {formatCurrency(cashAmount)}</p>
                    )}
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting || (goldFine <= 0 && cashAmount <= 0)}>
                {isSubmitting ? 'Recording...' : 'Record Settlement'}
              </Button>
            </form>
          </Card>
        </motion.div>
      )}

      {/* Settlement History */}
      {selectedPartyId && (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">Settlement History</h3>
            <p className="text-xs text-gray-500">{partySettlements.length} settlement{partySettlements.length !== 1 ? 's' : ''} with {selectedPartyName}</p>
          </div>
          {partySettlements.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No settlements recorded yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="text-left p-3 text-gray-400 font-medium">Date</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Direction</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Gold (fine)</th>
                    <th className="text-right p-3 text-gray-400 font-medium">Cash</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Notes</th>
                    <th className="text-center p-3 text-gray-400 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {partySettlements.map(s => (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3 text-gray-300 whitespace-nowrap">
                        {format(new Date(s.settlementDate), 'dd MMM yyyy')}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          s.direction === 'receiving'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {s.direction === 'receiving' ? 'Received' : 'Paid'}
                        </span>
                      </td>
                      <td className="p-3 text-right text-yellow-400">
                        {s.goldFine > 0 ? `${s.goldFine.toFixed(3)} gm` : '—'}
                      </td>
                      <td className="p-3 text-right text-green-400">
                        {s.cashAmount > 0 ? formatCurrency(s.cashAmount) : '—'}
                      </td>
                      <td className="p-3 text-gray-400 max-w-[150px] truncate">
                        {s.notes || '—'}
                      </td>
                      <td className="p-3 text-center">
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}
                          className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Empty state when no party selected */}
      {!selectedPartyId && (
        <EmptyState
          icon={Scale}
          title="Select a Party"
          description="Choose a merchant or karigar above to view their balance and record settlements."
        />
      )}
    </div>
  );
};

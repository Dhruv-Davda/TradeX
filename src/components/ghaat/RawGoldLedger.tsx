import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Coins, Plus, ArrowDownCircle, ArrowUpCircle, Trash2, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { StatCard } from '../ui/StatCard';
import { EmptyState } from '../ui/EmptyState';
import { PageSkeleton } from '../ui/Skeleton';
import { RawGoldLedgerEntry } from '../../types';
import { RawGoldLedgerService } from '../../services/rawGoldLedgerService';

const SOURCE_LABELS: Record<string, string> = {
  merchant_return: 'Merchant Gold Return',
  karigar_payment: 'Paid to Karigar',
  manual_adjustment: 'Manual Adjustment',
  initial_balance: 'Opening Balance',
};

export const RawGoldLedger: React.FC = () => {
  const [entries, setEntries] = useState<RawGoldLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  // Manual entry form state
  const [formData, setFormData] = useState({
    type: 'in' as 'in' | 'out',
    source: 'initial_balance' as 'initial_balance' | 'manual_adjustment',
    grossWeight: '',
    purity: '',
    notes: '',
    transactionDate: new Date().toISOString().split('T')[0],
  });

  const loadData = async () => {
    try {
      const { entries: data, error } = await RawGoldLedgerService.getEntries();
      if (!error) setEntries(data);
    } catch (error) {
      console.error('Error loading raw gold ledger:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Filtered entries by date range
  const filteredEntries = useMemo(() => {
    let filtered = [...entries];
    if (dateRange.startDate) {
      filtered = filtered.filter(e => e.transactionDate >= dateRange.startDate);
    }
    if (dateRange.endDate) {
      filtered = filtered.filter(e => e.transactionDate <= dateRange.endDate);
    }
    return filtered;
  }, [entries, dateRange]);

  // Stats
  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    for (const e of entries) {
      if (e.type === 'in') totalIn += e.fineGold;
      else totalOut += e.fineGold;
    }
    return { totalIn, totalOut, balance: totalIn - totalOut, count: entries.length };
  }, [entries]);

  // Compute running balance (chronological order)
  const entriesWithBalance = useMemo(() => {
    const sorted = [...filteredEntries].sort((a, b) => {
      const dateCompare = a.transactionDate.localeCompare(b.transactionDate);
      if (dateCompare !== 0) return dateCompare;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    let running = 0;
    // First compute starting balance from entries BEFORE the filter range
    if (dateRange.startDate) {
      for (const e of entries) {
        if (e.transactionDate < dateRange.startDate) {
          running += e.type === 'in' ? e.fineGold : -e.fineGold;
        }
      }
    }

    const result = sorted.map(entry => {
      running += entry.type === 'in' ? entry.fineGold : -entry.fineGold;
      return { ...entry, runningBalance: running };
    });

    // Reverse for display (newest first)
    return result.reverse();
  }, [filteredEntries, entries, dateRange]);

  const formFineGold = (Number(formData.grossWeight) || 0) * (Number(formData.purity) || 0) / 100;

  const handleAddManualEntry = async () => {
    const grossWeight = Number(formData.grossWeight);
    const purity = Number(formData.purity);
    if (!grossWeight || !purity) {
      alert('Please enter gross weight and purity');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await RawGoldLedgerService.addEntry({
        type: formData.type,
        source: formData.source,
        grossWeight,
        purity,
        fineGold: formFineGold,
        counterpartyName: '',
        transactionDate: formData.transactionDate,
        notes: formData.notes || undefined,
      });

      if (error) {
        alert('Error adding entry: ' + error);
        return;
      }

      setShowAddModal(false);
      setFormData({
        type: 'in',
        source: 'initial_balance',
        grossWeight: '',
        purity: '',
        notes: '',
        transactionDate: new Date().toISOString().split('T')[0],
      });
      await loadData();
    } catch {
      alert('Unexpected error adding entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (entry: RawGoldLedgerEntry) => {
    if (entry.referenceId) {
      alert('Cannot delete auto-generated entries. Edit the original transaction instead.');
      return;
    }
    if (!window.confirm('Delete this manual entry?')) return;

    const { error } = await RawGoldLedgerService.deleteEntry(entry.id);
    if (error) {
      alert('Error deleting entry: ' + error);
      return;
    }
    setEntries(entries.filter(e => e.id !== entry.id));
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center">
            <Coins className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Raw Gold Balance</h1>
            <p className="text-gray-400">Track loose gold given to karigars and received from merchants</p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> Manual Entry
        </Button>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Current Balance"
          value={`${stats.balance.toFixed(3)} gm`}
          icon={Coins}
          variant={stats.balance >= 0 ? 'gold' : 'danger'}
          animationDelay={0}
        />
        <StatCard
          label="Total Gold In"
          value={`${stats.totalIn.toFixed(3)} gm`}
          icon={ArrowDownCircle}
          variant="success"
          animationDelay={0.05}
        />
        <StatCard
          label="Total Gold Out"
          value={`${stats.totalOut.toFixed(3)} gm`}
          icon={ArrowUpCircle}
          variant="warning"
          animationDelay={0.1}
        />
        <StatCard
          label="Total Entries"
          value={String(stats.count)}
          icon={Coins}
          variant="info"
          animationDelay={0.15}
        />
      </div>

      {/* Date Filter */}
      {entries.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <CalendarDays className="w-5 h-5 text-gray-400" />
            <Input type="date" placeholder="Start" value={dateRange.startDate}
              onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })} className="w-auto" />
            <span className="text-gray-400">to</span>
            <Input type="date" placeholder="End" value={dateRange.endDate}
              onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })} className="w-auto" />
            {(dateRange.startDate || dateRange.endDate) && (
              <Button variant="ghost" size="sm" onClick={() => setDateRange({ startDate: '', endDate: '' })}>Clear</Button>
            )}
          </div>
        </Card>
      )}

      {/* Ledger Table */}
      {entries.length === 0 ? (
        <EmptyState
          icon={Coins}
          title="No Raw Gold Entries"
          description="Gold entries will appear here when you pay karigars with gold or receive gold from merchants. You can also add manual entries."
          action={{ label: 'Add Opening Balance', onClick: () => setShowAddModal(true) }}
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="text-left p-3 text-gray-400 font-medium">Date</th>
                  <th className="text-center p-3 text-gray-400 font-medium">Type</th>
                  <th className="text-left p-3 text-gray-400 font-medium">Source</th>
                  <th className="text-left p-3 text-gray-400 font-medium">Counterparty</th>
                  <th className="text-right p-3 text-gray-400 font-medium">Gross Wt</th>
                  <th className="text-right p-3 text-gray-400 font-medium">Purity</th>
                  <th className="text-right p-3 text-gray-400 font-medium">Fine Gold</th>
                  <th className="text-right p-3 text-gray-400 font-medium">Balance</th>
                  <th className="text-center p-3 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entriesWithBalance.length === 0 ? (
                  <tr><td colSpan={9} className="text-center p-8 text-gray-500">No entries in selected range</td></tr>
                ) : (
                  entriesWithBalance.map(entry => (
                    <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3 text-gray-300">
                        {format(new Date(entry.transactionDate), 'dd MMM yyyy')}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.type === 'in'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {entry.type === 'in' ? 'IN' : 'OUT'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-300 text-xs">
                        {SOURCE_LABELS[entry.source] || entry.source}
                      </td>
                      <td className="p-3 text-white font-medium">
                        {entry.counterpartyName || '—'}
                      </td>
                      <td className="p-3 text-right text-gray-300">{entry.grossWeight.toFixed(3)} gm</td>
                      <td className="p-3 text-right text-gray-300">{entry.purity}%</td>
                      <td className={`p-3 text-right font-medium ${
                        entry.type === 'in' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {entry.type === 'in' ? '+' : '-'}{entry.fineGold.toFixed(3)} gm
                      </td>
                      <td className={`p-3 text-right font-bold ${
                        entry.runningBalance >= 0 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {entry.runningBalance.toFixed(3)} gm
                      </td>
                      <td className="p-3 text-center">
                        {!entry.referenceId && (
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteEntry(entry)}
                            className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Manual Entry Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Manual Gold Entry">
        <div className="space-y-4">
          {/* Type toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'in' })}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  formData.type === 'in'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                Gold In
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'out' })}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  formData.type === 'out'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                Gold Out
              </button>
            </div>
          </div>

          <Select
            label="Source"
            options={[
              { value: 'initial_balance', label: 'Opening Balance' },
              { value: 'manual_adjustment', label: 'Manual Adjustment' },
            ]}
            value={formData.source}
            onChange={e => setFormData({ ...formData, source: e.target.value as 'initial_balance' | 'manual_adjustment' })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Gross Weight (gm)"
              type="number"
              step="0.001"
              placeholder="0.000"
              value={formData.grossWeight}
              onChange={e => setFormData({ ...formData, grossWeight: e.target.value })}
              required
            />
            <Input
              label="Purity (%)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.purity}
              onChange={e => setFormData({ ...formData, purity: e.target.value })}
              required
            />
          </div>

          {formFineGold > 0 && (
            <div className={`p-3 rounded-lg ${
              formData.type === 'in'
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : 'bg-amber-500/10 border border-amber-500/20'
            }`}>
              <div className="flex justify-between items-center text-sm">
                <span className={formData.type === 'in' ? 'text-emerald-400' : 'text-amber-400'}>
                  Fine Gold:
                </span>
                <span className={`font-bold ${formData.type === 'in' ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {formData.type === 'in' ? '+' : '-'}{formFineGold.toFixed(3)} gm
                </span>
              </div>
            </div>
          )}

          <Input
            label="Date"
            type="date"
            value={formData.transactionDate}
            onChange={e => setFormData({ ...formData, transactionDate: e.target.value })}
            required
          />

          <Input
            label="Notes (Optional)"
            placeholder="Add any notes"
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
          />

          <Button onClick={handleAddManualEntry} disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Adding...' : 'Add Entry'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

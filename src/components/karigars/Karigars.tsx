import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Hammer, Plus, Edit, Trash2, Phone, MapPin, Search, History, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { StatCard } from '../ui/StatCard';
import { EmptyState } from '../ui/EmptyState';
import { PageSkeleton } from '../ui/Skeleton';
import { GhaatEditModal } from '../ui/GhaatEditModal';
import { Karigar, GhaatTransaction } from '../../types';
import { KarigarsService } from '../../services/karigarsService';
import { GhaatService } from '../../services/ghaatService';
import { GHAAT_TRANSACTION_COLORS } from '../../lib/constants';

export const Karigars: React.FC = () => {
  const [karigars, setKarigars] = useState<Karigar[]>([]);
  const [transactions, setTransactions] = useState<GhaatTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingKarigar, setEditingKarigar] = useState<Karigar | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKarigar, setSelectedKarigar] = useState<Karigar | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [editingTxn, setEditingTxn] = useState<GhaatTransaction | null>(null);
  const [showTxnEditModal, setShowTxnEditModal] = useState(false);

  const [formData, setFormData] = useState({ name: '', phone: '', address: '', notes: '' });

  const loadData = async () => {
    try {
      const [karigarResult, txnResult] = await Promise.all([
        KarigarsService.getKarigars(),
        GhaatService.getTransactions(),
      ]);
      if (!karigarResult.error) setKarigars(karigarResult.karigars);
      if (!txnResult.error) setTransactions(txnResult.transactions);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => { loadData(); }, []);

  React.useEffect(() => {
    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const filteredKarigars = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return karigars;
    return karigars.filter(k =>
      k.name.toLowerCase().includes(q) ||
      (k.phone && k.phone.includes(q)) ||
      (k.address && k.address.toLowerCase().includes(q))
    );
  }, [karigars, searchQuery]);

  // Get stats for a karigar
  const getKarigarStats = (karigarId: string) => {
    const txns = transactions.filter(t => t.karigarId === karigarId);
    let totalGoldGiven = 0;
    let totalPiecesReceived = 0;
    let cashLaborPaid = 0;
    let goldLaborPaid = 0;

    for (const t of txns) {
      if (t.type === 'buy') {
        totalGoldGiven += t.fineGold;
        totalPiecesReceived += t.units;
        if (t.laborType === 'cash' && t.laborAmount) cashLaborPaid += t.laborAmount;
        if (t.laborType === 'gold' && t.laborAmount) goldLaborPaid += t.laborAmount;
      }
    }

    return { totalGoldGiven, totalPiecesReceived, cashLaborPaid, goldLaborPaid, txnCount: txns.length };
  };

  // Total stats
  const totalStats = useMemo(() => {
    let goldGiven = 0, piecesReceived = 0, cashLabor = 0, goldLabor = 0;
    for (const t of transactions) {
      if (t.type === 'buy') {
        goldGiven += t.fineGold;
        piecesReceived += t.units;
        if (t.laborType === 'cash' && t.laborAmount) cashLabor += t.laborAmount;
        if (t.laborType === 'gold' && t.laborAmount) goldLabor += t.laborAmount;
      }
    }
    return { goldGiven, piecesReceived, cashLabor, goldLabor };
  }, [transactions]);

  // Filtered history for selected karigar
  const karigarHistory = useMemo(() => {
    if (!selectedKarigar) return [];
    let txns = transactions.filter(t => t.karigarId === selectedKarigar.id);

    if (dateRange.startDate) {
      txns = txns.filter(t => {
        const d = t.transactionDate || t.createdAt.toISOString().split('T')[0];
        return d >= dateRange.startDate;
      });
    }
    if (dateRange.endDate) {
      txns = txns.filter(t => {
        const d = t.transactionDate || t.createdAt.toISOString().split('T')[0];
        return d <= dateRange.endDate;
      });
    }

    return txns.sort((a, b) => {
      const da = a.transactionDate || a.createdAt.toISOString();
      const db = b.transactionDate || b.createdAt.toISOString();
      return db.localeCompare(da);
    });
  }, [selectedKarigar, transactions, dateRange]);

  const handleAddKarigar = async () => {
    if (!formData.name.trim()) return;
    const { karigar, error } = await KarigarsService.addKarigar({
      name: formData.name,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
      notes: formData.notes || undefined,
    });
    if (error) { alert('Error: ' + error); return; }
    if (karigar) {
      setKarigars([...karigars, karigar]);
      setFormData({ name: '', phone: '', address: '', notes: '' });
      setShowAddModal(false);
    }
  };

  const handleEditKarigar = async () => {
    if (!editingKarigar || !formData.name.trim()) return;
    const { karigar, error } = await KarigarsService.updateKarigar({
      ...editingKarigar,
      name: formData.name,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
      notes: formData.notes || undefined,
    });
    if (error) { alert('Error: ' + error); return; }
    if (karigar) {
      setKarigars(karigars.map(k => k.id === karigar.id ? karigar : k));
      setEditingKarigar(null);
      setFormData({ name: '', phone: '', address: '', notes: '' });
    }
  };

  const handleDeleteKarigar = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this karigar?')) return;
    const { error } = await KarigarsService.deleteKarigar(id);
    if (error) { alert(error); return; }
    setKarigars(karigars.filter(k => k.id !== id));
  };

  if (isLoading) return <PageSkeleton />;

  // Trade History View
  if (showHistory && selectedKarigar) {
    const stats = getKarigarStats(selectedKarigar.id);

    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={() => { setShowHistory(false); setSelectedKarigar(null); }}>
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">{selectedKarigar.name}</h1>
              <p className="text-gray-400">Transaction History</p>
            </div>
          </div>
        </motion.div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-gray-400">Gold Given</p>
            <p className="text-lg font-bold text-yellow-400">{stats.totalGoldGiven.toFixed(3)} gm</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-gray-400">Pieces Received</p>
            <p className="text-lg font-bold text-white">{stats.totalPiecesReceived}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-gray-400">Cash Labor</p>
            <p className="text-lg font-bold text-green-400">₹{stats.cashLaborPaid.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-gray-400">Gold Labor</p>
            <p className="text-lg font-bold text-yellow-400">{stats.goldLaborPaid.toFixed(3)} gm</p>
          </div>
        </div>

        {/* Date range filter */}
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

        {/* Transaction table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="text-left p-3 text-gray-400 font-medium">Date</th>
                  <th className="text-left p-3 text-gray-400 font-medium">Category</th>
                  <th className="text-right p-3 text-gray-400 font-medium">Units</th>
                  <th className="text-right p-3 text-gray-400 font-medium">Gross Wt</th>
                  <th className="text-right p-3 text-gray-400 font-medium">Purity</th>
                  <th className="text-right p-3 text-gray-400 font-medium">Fine Gold</th>
                  <th className="text-left p-3 text-gray-400 font-medium">Labor</th>
                  <th className="text-center p-3 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {karigarHistory.length === 0 ? (
                  <tr><td colSpan={8} className="text-center p-8 text-gray-500">No transactions found</td></tr>
                ) : (
                  karigarHistory.map(txn => (
                    <tr key={txn.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3 text-gray-300">
                        {txn.transactionDate ? format(new Date(txn.transactionDate), 'dd MMM yyyy') : format(new Date(txn.createdAt), 'dd MMM yyyy')}
                      </td>
                      <td className="p-3 text-white font-medium">{txn.category}</td>
                      <td className="p-3 text-right text-white">{txn.units}</td>
                      <td className="p-3 text-right text-gray-300">{txn.totalGrossWeight.toFixed(3)} gm</td>
                      <td className="p-3 text-right text-gray-300">{txn.purity}%</td>
                      <td className="p-3 text-right text-yellow-400 font-medium">{txn.fineGold.toFixed(3)} gm</td>
                      <td className="p-3 text-gray-300">
                        {txn.laborAmount ? `${txn.laborAmount} ${txn.laborType === 'gold' ? 'gm' : '₹'}` : '—'}
                      </td>
                      <td className="p-3 text-center">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingTxn(txn); setShowTxnEditModal(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Edit Modal */}
        <GhaatEditModal
          isOpen={showTxnEditModal}
          onClose={() => { setShowTxnEditModal(false); setEditingTxn(null); }}
          transaction={editingTxn}
          onTransactionUpdated={(updated) => {
            setTransactions(transactions.map(t => t.id === updated.id ? updated : t));
            setShowTxnEditModal(false);
            setEditingTxn(null);
          }}
          onTransactionDeleted={(id) => {
            setTransactions(transactions.filter(t => t.id !== id));
            setShowTxnEditModal(false);
            setEditingTxn(null);
          }}
        />
      </div>
    );
  }

  // Main Karigars List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
            <Hammer className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Karigars</h1>
            <p className="text-gray-400">Manage your jewellery artisans</p>
          </div>
        </div>
        <Button onClick={() => { setFormData({ name: '', phone: '', address: '', notes: '' }); setShowAddModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Karigar
        </Button>
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Karigars" value={String(karigars.length)} icon={Hammer} variant="warning" animationDelay={0} />
        <StatCard label="Gold Given" value={`${totalStats.goldGiven.toFixed(3)} gm`} icon={Hammer} variant="gold" animationDelay={0.05} />
        <StatCard label="Pieces Received" value={String(totalStats.piecesReceived)} icon={Hammer} variant="info" animationDelay={0.1} />
        <StatCard label="Gold Labor" value={`${totalStats.goldLabor.toFixed(3)} gm`} icon={Hammer} variant="purple" animationDelay={0.15} />
      </div>

      {/* Search */}
      {karigars.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search karigars..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
          />
        </div>
      )}

      {/* Karigars Grid */}
      {filteredKarigars.length === 0 ? (
        <EmptyState
          icon={Hammer}
          title={searchQuery ? 'No karigars match your search' : 'No Karigars Added'}
          description={searchQuery ? 'Try a different search term' : 'Add your first karigar to start tracking jewellery purchases.'}
          action={!searchQuery ? { label: 'Add Karigar', onClick: () => setShowAddModal(true) } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKarigars.map((karigar, index) => {
            const stats = getKarigarStats(karigar.id);

            return (
              <motion.div
                key={karigar.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="p-5 cursor-pointer"
                  hover
                  onClick={() => { setSelectedKarigar(karigar); setShowHistory(true); setDateRange({ startDate: '', endDate: '' }); }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">{karigar.name}</h3>
                    <div className="flex space-x-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditingKarigar(karigar);
                        setFormData({ name: karigar.name, phone: karigar.phone || '', address: karigar.address || '', notes: karigar.notes || '' });
                      }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteKarigar(karigar.id)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Contact info */}
                  {karigar.phone && (
                    <div className="flex items-center text-sm text-gray-400 mb-1">
                      <Phone className="w-3.5 h-3.5 mr-2" /> {karigar.phone}
                    </div>
                  )}
                  {karigar.address && (
                    <div className="flex items-center text-sm text-gray-400 mb-3">
                      <MapPin className="w-3.5 h-3.5 mr-2" /> {karigar.address}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10">
                    <div>
                      <p className="text-xs text-gray-500">Gold Given</p>
                      <p className="text-sm font-semibold text-yellow-400">{stats.totalGoldGiven.toFixed(3)} gm</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Pieces</p>
                      <p className="text-sm font-semibold text-white">{stats.totalPiecesReceived}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Cash Labor</p>
                      <p className="text-sm font-semibold text-green-400">₹{stats.cashLaborPaid.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Gold Labor</p>
                      <p className="text-sm font-semibold text-yellow-400">{stats.goldLaborPaid.toFixed(3)} gm</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center text-xs text-gray-500">
                    <History className="w-3 h-3 mr-1" /> {stats.txnCount} transactions
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Karigar Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Karigar">
        <div className="space-y-4">
          <Input label="Name" placeholder="Karigar name" value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Phone (Optional)" placeholder="Phone number" value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          <Input label="Address (Optional)" placeholder="Address" value={formData.address}
            onChange={e => setFormData({ ...formData, address: e.target.value })} />
          <Input label="Notes (Optional)" placeholder="Any notes" value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })} />
          <Button onClick={handleAddKarigar} className="w-full">Add Karigar</Button>
        </div>
      </Modal>

      {/* Edit Karigar Modal */}
      <Modal isOpen={!!editingKarigar} onClose={() => setEditingKarigar(null)} title="Edit Karigar">
        <div className="space-y-4">
          <Input label="Name" placeholder="Karigar name" value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Phone (Optional)" placeholder="Phone number" value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          <Input label="Address (Optional)" placeholder="Address" value={formData.address}
            onChange={e => setFormData({ ...formData, address: e.target.value })} />
          <Input label="Notes (Optional)" placeholder="Any notes" value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })} />
          <Button onClick={handleEditKarigar} className="w-full">Update Karigar</Button>
        </div>
      </Modal>
    </div>
  );
};

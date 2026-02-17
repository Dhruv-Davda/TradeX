import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Edit, Trash2, Phone, Mail, MapPin, Search, History, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { TradeEditModal } from '../ui/TradeEditModal';
import { Merchant, Trade, GhaatTransaction } from '../../types';
import { formatCurrency, calculateMerchantBalance, calculateTradesWithRunningBalance, TradeWithBalance } from '../../utils/calculations';
import { TradeService } from '../../services/tradeService';
import { MerchantsService } from '../../services/merchantsService';
import { GhaatService } from '../../services/ghaatService';

export const Merchants: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [ghaatTransactions, setGhaatTransactions] = useState<GhaatTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [showMerchantDetailsModal, setShowMerchantDetailsModal] = useState(false);
  const [showTradeHistoryView, setShowTradeHistoryView] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [showTradeEditModal, setShowTradeEditModal] = useState(false);

  // Load merchants and trades from database
  const loadAllData = async () => {
    try {
      
      // Load merchants
      const { merchants: dbMerchants, error: merchantsError } = await MerchantsService.getMerchants();
      if (merchantsError) {
        console.error('❌ Merchants: Error loading merchants:', merchantsError);
      } else {
        setMerchants(dbMerchants);
      }

      // Load trades
      const { trades: dbTrades, error: tradesError } = await TradeService.getTrades();
      if (tradesError) {
        console.error('❌ Merchants: Error loading trades:', tradesError);
      } else {
        setTrades(dbTrades);
      }

      // Load ghaat transactions for jewellery dues
      const { transactions: ghaatTxns, error: ghaatError } = await GhaatService.getTransactions();
      if (!ghaatError) {
        setGhaatTransactions(ghaatTxns);
      }
    } catch (error) {
      console.error('❌ Merchants: Unexpected error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadAllData();
  }, []);

  // Refresh data when page comes into focus
  React.useEffect(() => {
    const handleFocus = () => {
      loadAllData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Sort merchants by priority (due + owe) in decreasing order
  const sortedMerchants = useMemo(() => {
    if (!merchants.length) {
      return merchants;
    }
    
    const sorted = [...merchants].sort((a, b) => {
      const balanceA = calculateMerchantBalance(a.id, trades, a.totalDue, a.totalOwe);
      const balanceB = calculateMerchantBalance(b.id, trades, b.totalDue, b.totalOwe);
      
      // Calculate priority: due + owe (higher priority = higher amount)
      const priorityA = balanceA.due + balanceA.owe;
      const priorityB = balanceB.due + balanceB.owe;
      
      
      // Sort in decreasing order (highest priority first)
      return priorityB - priorityA;
    });
    
    return sorted;
  }, [merchants, trades]);

  // Filter merchants by search query
  const filteredMerchants = useMemo(() => {
    if (!searchQuery.trim()) {
      return sortedMerchants;
    }
    const query = searchQuery.toLowerCase();
    return sortedMerchants.filter(merchant => 
      merchant.name.toLowerCase().includes(query) ||
      merchant.email?.toLowerCase().includes(query) ||
      merchant.phone?.toLowerCase().includes(query) ||
      merchant.address?.toLowerCase().includes(query)
    );
  }, [sortedMerchants, searchQuery]);

  // Handle merchant click
  const handleMerchantClick = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setShowMerchantDetailsModal(true);
    setShowTradeHistoryView(false);
    setDateRange({ startDate: '', endDate: '' });
  };

  // Handle view trade history
  const handleViewTradeHistory = () => {
    setShowTradeHistoryView(true);
  };

  // Handle back to merchant details
  const handleBackToMerchantDetails = () => {
    setShowTradeHistoryView(false);
  };

  // Handle clear date range
  const handleClearDateRange = () => {
    setDateRange({ startDate: '', endDate: '' });
  };

  // Handle edit trade from merchant view
  const handleEditTradeFromMerchant = (trade: Trade) => {
    setEditingTrade(trade);
    setShowTradeEditModal(true);
  };

  // Handle trade updated callback
  const handleTradeUpdated = (updatedTrade: Trade) => {
    setTrades(trades.map(t => t.id === updatedTrade.id ? updatedTrade : t));
    setEditingTrade(null);
  };

  // Handle trade deleted callback
  const handleTradeDeleted = (tradeId: string) => {
    setTrades(trades.filter(t => t.id !== tradeId));
    setEditingTrade(null);
  };

  // Get filtered trades for selected merchant with running balances
  const selectedMerchantTrades = useMemo(() => {
    if (!selectedMerchant) return [];
    
    // Calculate trades with running balances (includes all trades for the merchant)
    const tradesWithBalance = calculateTradesWithRunningBalance(
      selectedMerchant.id,
      trades,
      selectedMerchant.totalDue || 0,
      selectedMerchant.totalOwe || 0
    );

    // Apply date range filter if set
    let filteredTrades: TradeWithBalance[] = tradesWithBalance;
    if (dateRange.startDate || dateRange.endDate) {
      filteredTrades = tradesWithBalance.filter(trade => {
        const tradeDate = trade.tradeDate ? new Date(trade.tradeDate) : new Date(trade.createdAt);
        const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
        const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
        
        if (startDate && tradeDate < startDate) return false;
        if (endDate && tradeDate > endDate) return false;
        return true;
      });
    }

    return filteredTrades;
  }, [selectedMerchant, trades, dateRange]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    olderDues: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingMerchant) {
      // Update existing merchant
      // Parse older dues - if empty or invalid, default to 0
      const olderDuesAmount = formData.olderDues.trim() === '' ? 0 : Number(formData.olderDues) || 0;
      
      const updatedMerchantData: Merchant = {
        ...editingMerchant,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        totalDue: olderDuesAmount, // Update older dues as totalDue
        updatedAt: new Date(),
      };

      
      try {
        const { merchant: savedMerchant, error } = await MerchantsService.updateMerchant(updatedMerchantData);
        if (error) {
          console.error('❌ Error updating merchant:', error);
          alert('Error updating merchant: ' + error);
          return;
        }
        
        
        // Update local state for immediate UI update
        const updatedMerchants = merchants.map(merchant =>
          merchant.id === editingMerchant.id ? savedMerchant! : merchant
        );
        setMerchants(updatedMerchants);
        setEditingMerchant(null);
      } catch (error) {
        console.error('❌ Unexpected error updating merchant:', error);
        alert('Unexpected error updating merchant');
        return;
      }
    } else {
      // Add new merchant
      // Parse older dues - if empty or invalid, default to 0
      const olderDuesAmount = formData.olderDues.trim() === '' ? 0 : Number(formData.olderDues) || 0;
      
      const newMerchantData: Omit<Merchant, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        totalDue: olderDuesAmount, // Set older dues as totalDue
        totalOwe: 0,
      };

      
      try {
        const { merchant: savedMerchant, error } = await MerchantsService.addMerchant(newMerchantData);
        if (error) {
          console.error('❌ Error adding merchant:', error);
          alert('Error adding merchant: ' + error);
          return;
        }
        
        
        // Update local state for immediate UI update
        setMerchants([...merchants, savedMerchant!]);
        
        // Also reload data from database to ensure consistency
        setTimeout(() => {
          loadAllData();
        }, 100);
      } catch (error) {
        console.error('❌ Unexpected error adding merchant:', error);
        alert('Unexpected error adding merchant');
        return;
      }
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', address: '', olderDues: '' });
    setShowAddModal(false);
    setEditingMerchant(null);
  };

  const editMerchant = (merchant: Merchant) => {
    setEditingMerchant(merchant);
    setFormData({
      name: merchant.name,
      email: merchant.email || '',
      phone: merchant.phone || '',
      address: merchant.address || '',
      olderDues: merchant.totalDue.toString(), // Show existing totalDue as older dues
    });
    setShowAddModal(true);
  };

  const deleteMerchant = async (merchantId: string) => {
    const merchantTrades = trades.filter(trade => trade.merchantId === merchantId);
    
    if (merchantTrades.length > 0) {
      alert('Cannot delete merchant with existing trades. Please delete all trades first.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this merchant?')) {
      
      try {
        const { error } = await MerchantsService.deleteMerchant(merchantId);
        if (error) {
          console.error('❌ Error deleting merchant:', error);
          alert('Error deleting merchant: ' + error);
          return;
        }
        
        
        // Update local state for immediate UI update
        setMerchants(merchants.filter(merchant => merchant.id !== merchantId));
      } catch (error) {
        console.error('❌ Unexpected error deleting merchant:', error);
        alert('Unexpected error deleting merchant');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (isLoading) {
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
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Merchants</h1>
            <p className="text-gray-400">Manage your business partners</p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Merchant
        </Button>
      </motion.div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search merchants by name, email, phone, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800/60 border-gray-600/50 focus:border-primary-400/70"
          />
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Merchants</p>
              <p className="text-xl font-bold text-white">{merchants.length}</p>
            </div>
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Dues</p>
              <p className="text-xl font-bold text-green-400">
                {formatCurrency(
                  merchants.reduce((sum, merchant) => {
                    const balance = calculateMerchantBalance(merchant.id, trades, merchant.totalDue, merchant.totalOwe);
                    return sum + balance.due;
                  }, 0)
                )}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Owes</p>
              <p className="text-xl font-bold text-red-400">
                {formatCurrency(
                  merchants.reduce((sum, merchant) => {
                    const balance = calculateMerchantBalance(merchant.id, trades, merchant.totalDue, merchant.totalOwe);
                    return sum + balance.owe;
                  }, 0)
                )}
              </p>
            </div>
            <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-red-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Merchants List */}
      {filteredMerchants.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Merchants</h2>
            <p className="text-sm text-gray-400">
              {searchQuery ? `Found ${filteredMerchants.length} merchant(s)` : `Sorted by priority (due + owe) - ${filteredMerchants.length} merchants`}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMerchants.map((merchant, index) => {
            const balance = calculateMerchantBalance(merchant.id, trades, merchant.totalDue, merchant.totalOwe);
            const merchantTradeCount = trades.filter(trade => trade.merchantId === merchant.id).length;
            const jewelleryDues = GhaatService.calculateMerchantJewelleryDues(merchant.id, ghaatTransactions);
            
            
            return (
              <motion.div
                key={merchant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card hover className="p-4 cursor-pointer" onClick={() => handleMerchantClick(merchant)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editMerchant(merchant)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMerchant(merchant.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-2">{merchant.name}</h3>
                  
                  <div className="space-y-2 mb-4">
                    {merchant.phone && (
                      <div className="flex items-center text-sm text-gray-400">
                        <Phone className="w-4 h-4 mr-2" />
                        {merchant.phone}
                      </div>
                    )}
                    {merchant.email && (
                      <div className="flex items-center text-sm text-gray-400">
                        <Mail className="w-4 h-4 mr-2" />
                        {merchant.email}
                      </div>
                    )}
                    {merchant.address && (
                      <div className="flex items-center text-sm text-gray-400">
                        <MapPin className="w-4 h-4 mr-2" />
                        {merchant.address}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Due Amount:</span>
                      <span className="text-green-400 font-medium">
                        {formatCurrency(balance.due)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Owe Amount:</span>
                      <span className="text-red-400 font-medium">
                        {formatCurrency(balance.owe)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Total Trades:</span>
                      <span className="text-white font-medium">{merchantTradeCount}</span>
                    </div>
                  </div>

                  {/* Jewellery Dues */}
                  {(jewelleryDues.fineGoldPending > 0 || jewelleryDues.cashDue > 0) && (
                    <div className="space-y-1.5 mb-4 p-2.5 bg-amber-500/5 border border-amber-500/15 rounded-lg">
                      <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Jewellery</span>
                      {jewelleryDues.fineGoldPending > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">Pending Gold:</span>
                          <span className="text-yellow-400 font-medium">{jewelleryDues.fineGoldPending.toFixed(3)} gm</span>
                        </div>
                      )}
                      {jewelleryDues.cashDue > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">Cash Shortfall:</span>
                          <span className="text-red-400 font-medium">{formatCurrency(jewelleryDues.cashDue)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-500">
                      Added {new Date(merchant.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">No merchants added yet</p>
          <p className="text-sm text-gray-500 mb-4">Start by adding your first business partner</p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Merchant
          </Button>
        </Card>
      )}

      {/* Add/Edit Merchant Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={resetForm}
        title={editingMerchant ? 'Edit Merchant' : 'Add New Merchant'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Merchant Name"
            name="name"
            placeholder="Enter merchant name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />

          <Input
            label="Phone Number (Optional)"
            name="phone"
            placeholder="Enter phone number"
            value={formData.phone}
            onChange={handleInputChange}
          />

          <Input
            label="Email (Optional)"
            name="email"
            type="email"
            placeholder="Enter email address"
            value={formData.email}
            onChange={handleInputChange}
          />

          <Input
            label="Address (Optional)"
            name="address"
            placeholder="Enter address"
            value={formData.address}
            onChange={handleInputChange}
          />

          <Input
            label="Older Dues (Optional)"
            name="olderDues"
            type="number"
            step="0.01"
            placeholder="Enter older dues amount"
            value={formData.olderDues}
            onChange={handleInputChange}
          />

          <div className="flex space-x-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingMerchant ? 'Update Merchant' : 'Add Merchant'}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Merchant Details Modal */}
      {selectedMerchant && (
        <Modal
          isOpen={showMerchantDetailsModal}
          onClose={() => {
            setShowMerchantDetailsModal(false);
            setSelectedMerchant(null);
            setShowTradeHistoryView(false);
            setDateRange({ startDate: '', endDate: '' });
          }}
          title={showTradeHistoryView && selectedMerchant ? `${selectedMerchant.name} - Trade History & Dues/Advances` : selectedMerchant ? `${selectedMerchant.name} - Details` : 'Merchant Details'}
          className={showTradeHistoryView ? 'max-w-6xl' : 'max-w-md'}
        >
          {!showTradeHistoryView ? (
            <div className="space-y-4">
              <div className="space-y-3">
                {selectedMerchant.phone && (
                  <div className="flex items-center text-sm text-gray-300">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    {selectedMerchant.phone}
                  </div>
                )}
                {selectedMerchant.email && (
                  <div className="flex items-center text-sm text-gray-300">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    {selectedMerchant.email}
                  </div>
                )}
                {selectedMerchant.address && (
                  <div className="flex items-center text-sm text-gray-300">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    {selectedMerchant.address}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-700 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Due Amount:</span>
                  <span className="text-green-400 font-medium">
                    {formatCurrency(calculateMerchantBalance(selectedMerchant.id, trades, selectedMerchant.totalDue, selectedMerchant.totalOwe).due)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Owe Amount:</span>
                  <span className="text-red-400 font-medium">
                    {formatCurrency(calculateMerchantBalance(selectedMerchant.id, trades, selectedMerchant.totalDue, selectedMerchant.totalOwe).owe)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Trades:</span>
                  <span className="text-white font-medium">
                    {trades.filter(t => t.merchantId === selectedMerchant.id).length}
                  </span>
                </div>
              </div>

              {/* Jewellery Dues in Details Modal */}
              {(() => {
                const jd = GhaatService.calculateMerchantJewelleryDues(selectedMerchant.id, ghaatTransactions);
                if (jd.fineGoldPending <= 0 && jd.cashDue <= 0) return null;
                return (
                  <div className="pt-3 border-t border-gray-700 space-y-2">
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Jewellery Dues</span>
                    {jd.fineGoldPending > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Pending Gold:</span>
                        <span className="text-yellow-400 font-medium">{jd.fineGoldPending.toFixed(3)} gm fine</span>
                      </div>
                    )}
                    {jd.cashDue > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Cash Shortfall:</span>
                        <span className="text-red-400 font-medium">{formatCurrency(jd.cashDue)}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <Button onClick={handleViewTradeHistory} className="w-full justify-start" variant="outline">
                <History className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Trade History & Dues/Advances</div>
                  <div className="text-xs text-gray-400">View all trades with dues and advances</div>
                </div>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Trade History & Dues/Advances</h3>
                <Button variant="ghost" size="sm" onClick={handleBackToMerchantDetails}>← Back</Button>
              </div>
              
              {/* Date Range Filter */}
              <Card className="p-4 bg-gray-800/50">
                <div className="flex items-center gap-3 mb-3">
                  <CalendarDays className="w-5 h-5 text-primary-400" />
                  <span className="text-sm font-medium text-white">Filter by Date Range</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Start Date</label>
                    <Input 
                      type="date" 
                      value={dateRange.startDate} 
                      onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))} 
                      className="bg-gray-700/50 border-gray-600/50" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">End Date</label>
                    <Input 
                      type="date" 
                      value={dateRange.endDate} 
                      onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))} 
                      className="bg-gray-700/50 border-gray-600/50" 
                      min={dateRange.startDate || undefined}
                    />
                  </div>
                </div>
                {(dateRange.startDate || dateRange.endDate) && (
                  <Button variant="ghost" size="sm" onClick={handleClearDateRange} className="mt-3 w-full text-xs">
                    Clear Date Filter
                  </Button>
                )}
              </Card>

              {selectedMerchantTrades.length > 0 ? (
                <div>
                  <div className="mb-3 text-sm text-gray-400">
                    Showing {selectedMerchantTrades.length} trade{selectedMerchantTrades.length !== 1 ? 's' : ''}
                    {(dateRange.startDate || dateRange.endDate) && (
                      <span className="ml-2">
                        {dateRange.startDate && `from ${format(new Date(dateRange.startDate), 'MMM dd, yyyy')}`}
                        {dateRange.startDate && dateRange.endDate && ' to '}
                        {dateRange.endDate && format(new Date(dateRange.endDate), 'MMM dd, yyyy')}
                      </span>
                    )}
                  </div>
                  
                  {/* Table View */}
                  <div className="border border-gray-700 rounded-lg overflow-hidden max-h-96 overflow-y-auto overflow-x-auto">
                    <table className="w-full min-w-full">
                      <thead className="bg-gray-800 sticky top-0">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">Date</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">Type</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">Metal</th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase whitespace-nowrap">Weight</th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase whitespace-nowrap">Total Amount</th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase whitespace-nowrap">Paid/Received</th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase whitespace-nowrap bg-green-900/20">Dues</th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase whitespace-nowrap bg-red-900/20">Advances</th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-400 uppercase whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {selectedMerchantTrades.map((trade: TradeWithBalance) => {
                          const tradeDate = trade.tradeDate 
                            ? (typeof trade.tradeDate === 'string' ? new Date(trade.tradeDate) : trade.tradeDate)
                            : new Date(trade.createdAt);
                          
                          return (
                            <tr key={trade.id} className="hover:bg-gray-800/50">
                              <td className="px-3 py-3 text-sm text-gray-300 whitespace-nowrap">
                                {format(tradeDate, 'MMM dd, yyyy')}
                              </td>
                              <td className="px-3 py-3 text-sm whitespace-nowrap">
                                <span className="text-white capitalize">{trade.type}</span>
                                {trade.type === 'settlement' && trade.settlementDirection && (
                                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                                    trade.settlementDirection === 'receiving'
                                      ? 'bg-green-500/20 text-green-400'
                                      : 'bg-orange-500/20 text-orange-400'
                                  }`}>
                                    {trade.settlementDirection === 'receiving' ? 'Received' : 'Paid'}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-300 capitalize whitespace-nowrap">
                                {trade.metalType || '-'}
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-300 text-right whitespace-nowrap">
                                {trade.weight ? `${trade.weight} ${trade.metalType === 'gold' ? 'gm' : 'kg'}` : '-'}
                              </td>
                              <td className="px-3 py-3 text-sm font-semibold text-white text-right whitespace-nowrap">
                                {formatCurrency(trade.totalAmount)}
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-300 text-right whitespace-nowrap">
                                {(() => {
                                  if (trade.type === 'buy') {
                                    return trade.amountPaid ? formatCurrency(trade.amountPaid) : '-';
                                  } else if (trade.type === 'sell') {
                                    return trade.amountReceived ? formatCurrency(trade.amountReceived) : '-';
                                  } else if (trade.type === 'settlement') {
                                    if (trade.settlementDirection === 'receiving') {
                                      return trade.amountReceived ? formatCurrency(trade.amountReceived) : (trade.totalAmount ? formatCurrency(trade.totalAmount) : '-');
                                    } else {
                                      return trade.amountPaid ? formatCurrency(trade.amountPaid) : (trade.totalAmount ? formatCurrency(trade.totalAmount) : '-');
                                    }
                                  }
                                  return '-';
                                })()}
                              </td>
                              <td className="px-3 py-3 text-sm font-medium text-green-400 text-right whitespace-nowrap bg-green-900/10">
                                {formatCurrency(trade.runningDues || 0)}
                              </td>
                              <td className="px-3 py-3 text-sm font-medium text-red-400 text-right whitespace-nowrap bg-red-900/10">
                                {formatCurrency(trade.runningAdvances || 0)}
                              </td>
                              <td className="px-3 py-3 text-center whitespace-nowrap">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditTradeFromMerchant(trade)}
                                  className="p-1.5"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">
                    {dateRange.startDate || dateRange.endDate 
                      ? 'No trades found in the selected date range' 
                      : 'No trades found for this merchant'}
                  </p>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Trade Edit Modal */}
      <TradeEditModal
        isOpen={showTradeEditModal}
        onClose={() => {
          setShowTradeEditModal(false);
          setEditingTrade(null);
        }}
        trade={editingTrade}
        onTradeUpdated={handleTradeUpdated}
        onTradeDeleted={handleTradeDeleted}
      />
    </div>
  );
};
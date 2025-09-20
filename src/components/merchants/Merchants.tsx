import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Merchant, Trade } from '../../types';
import { generateId, formatCurrency, calculateMerchantBalance } from '../../utils/calculations';
import { TradeService } from '../../services/tradeService';
import { MerchantsService } from '../../services/merchantsService';

export const Merchants: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);

  // Load merchants and trades from database
  const loadAllData = async () => {
    try {
      console.log('📊 Merchants: Loading merchants and trades from database...');
      
      // Load merchants
      const { merchants: dbMerchants, error: merchantsError } = await MerchantsService.getMerchants();
      if (merchantsError) {
        console.error('❌ Merchants: Error loading merchants:', merchantsError);
      } else {
        console.log('✅ Merchants: Loaded', dbMerchants.length, 'merchants from database');
        setMerchants(dbMerchants);
      }

      // Load trades
      const { trades: dbTrades, error: tradesError } = await TradeService.getTrades();
      if (tradesError) {
        console.error('❌ Merchants: Error loading trades:', tradesError);
      } else {
        console.log('✅ Merchants: Loaded', dbTrades.length, 'trades from database');
        console.log('🔍 Merchants: Sample trades:', dbTrades.slice(0, 3));
        setTrades(dbTrades);
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
      console.log('🔄 Merchants: Page focused, refreshing data...');
      loadAllData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Sort merchants by priority (due + owe) in decreasing order
  const sortedMerchants = useMemo(() => {
    if (!merchants.length || !trades.length) return merchants;
    
    return [...merchants].sort((a, b) => {
      const balanceA = calculateMerchantBalance(a.id, trades, a.totalDue);
      const balanceB = calculateMerchantBalance(b.id, trades, b.totalDue);
      
      // Calculate priority: due + owe (higher priority = higher amount)
      const priorityA = balanceA.due + balanceA.owe;
      const priorityB = balanceB.due + balanceB.owe;
      
      // Sort in decreasing order (highest priority first)
      return priorityB - priorityA;
    });
  }, [merchants, trades]);
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

      console.log('📝 Updating merchant in database:', updatedMerchantData);
      
      try {
        const { merchant: savedMerchant, error } = await MerchantsService.updateMerchant(updatedMerchantData);
        if (error) {
          console.error('❌ Error updating merchant:', error);
          alert('Error updating merchant: ' + error);
          return;
        }
        
        console.log('✅ Merchant updated successfully:', savedMerchant);
        
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
        
        console.log('✅ Merchant added successfully:', savedMerchant);
        
        // Update local state for immediate UI update
        setMerchants([...merchants, savedMerchant!]);
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
      console.log('🗑️ Deleting merchant from database');
      
      try {
        const { success, error } = await MerchantsService.deleteMerchant(merchantId);
        if (error) {
          console.error('❌ Error deleting merchant:', error);
          alert('Error deleting merchant: ' + error);
          return;
        }
        
        console.log('✅ Merchant deleted successfully');
        
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
                    const balance = calculateMerchantBalance(merchant.id, trades, merchant.totalDue);
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
                    const balance = calculateMerchantBalance(merchant.id, trades, merchant.totalDue);
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
      {sortedMerchants.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Merchants</h2>
            <p className="text-sm text-gray-400">Sorted by priority (due + owe)</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedMerchants.map((merchant, index) => {
            const balance = calculateMerchantBalance(merchant.id, trades, merchant.totalDue);
            const merchantTradeCount = trades.filter(trade => trade.merchantId === merchant.id).length;
            
            // Debug logging for first merchant
            if (index === 0) {
              console.log('🔍 Merchants: Debug for merchant:', merchant.name);
              console.log('🔍 Merchants: Processing merchant');
              console.log('🔍 Merchants: Trades for this merchant');
              console.log('🔍 Merchants: Calculated balance:', balance);
            }
            
            return (
              <motion.div
                key={merchant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card hover className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex space-x-1">
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
    </div>
  );
};
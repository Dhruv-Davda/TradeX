import { supabase } from '../lib/supabase';
import { Trade } from '../types';
import { dataCache } from '../hooks/useDataCache';

export interface DatabaseTrade {
  id: string;
  user_id: string;
  type: 'buy' | 'sell' | 'transfer' | 'settlement';
  metal_type: 'gold' | 'silver';
  quantity: number;
  rate: number;
  amount: number;
  merchant_id: string | null;
  party_name: string;
  party_phone: string | null;
  party_address: string | null;
  settlement_type: 'cash' | 'bank' | 'gold' | 'silver' | null;
  settlement_direction: 'receiving' | 'paying' | null;
  transfer_charges: number | null;
  pickup_location: string | null;
  drop_location: string | null;
  amount_paid: number | null;
  amount_received: number | null;
  labor_charges: number | null;
  payment_type: string | null;
  notes: string | null;
  trade_date: string | null; // Add trade_date field
  created_at: string;
  updated_at: string;
}

export class TradeService {
  // Smart cache invalidation - only invalidate specific cache keys
  private static async invalidateCache(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Invalidate all trade-related cache keys
        dataCache.delete(`trades_${user.id}`);
        dataCache.delete('dashboard_trades'); // Dashboard cache
        dataCache.delete(`analytics_trades_${user.id}`); // Analytics cache
        dataCache.delete(`stock_${user.id}`); // Stock cache (affected by trade changes)
        console.log('✅ Cache invalidated for trade-related data');
      }
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  // Public method to clear cache
  static async clearCache(): Promise<void> {
    await this.invalidateCache();
  }
  // Convert UI Trade to Service Trade
  static convertUITradeToServiceTrade(uiTrade: any): Omit<Trade, 'id' | 'createdAt'> {
    // Handle different trade types with appropriate field mapping
    let quantity = 0;
    let rate = 0;
    let amount = 0;

    if (uiTrade.type === 'buy' || uiTrade.type === 'sell') {
      // Buy/Sell trades use weight, pricePerUnit, totalAmount
      quantity = uiTrade.weight || uiTrade.quantity || 0;
      rate = uiTrade.pricePerUnit || uiTrade.rate || 0;
      amount = uiTrade.totalAmount || uiTrade.amount || 0;
    } else if (uiTrade.type === 'settlement') {
      // Settlement trades might use amountPaid, amountReceived, laborCharges
      amount = uiTrade.totalAmount || uiTrade.amountPaid || uiTrade.amountReceived || uiTrade.laborCharges || 0;
      quantity = uiTrade.weight || uiTrade.quantity || 0;
      rate = uiTrade.pricePerUnit || uiTrade.rate || 0;
    } else if (uiTrade.type === 'transfer') {
      // Transfer trades might use transferCharges
      amount = uiTrade.totalAmount || uiTrade.transferCharges || 0;
      quantity = uiTrade.weight || uiTrade.quantity || 0;
      rate = uiTrade.pricePerUnit || uiTrade.rate || 0;
    }

    return {
      type: uiTrade.type,
      metalType: uiTrade.metalType,
      quantity: quantity,
      rate: rate,
      amount: amount,
      partyName: uiTrade.merchantName || uiTrade.partyName || 'Unknown',
      partyPhone: uiTrade.partyPhone || '',
      partyAddress: uiTrade.partyAddress || '',
      notes: uiTrade.notes || '',
    };
  }

  // Get all trades for current user (shared by email) with caching
  static async getTrades(forceRefresh = false): Promise<{ trades: Trade[]; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { trades: [], error: 'User not authenticated' };
      }

      // Define cache key for this user
      const cacheKey = `trades_${user.id}`;

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedTrades = dataCache.get<Trade[]>(cacheKey);
        if (cachedTrades) {
          return { trades: cachedTrades, error: null };
        }
      }

      // Get user profile to get the email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { trades: [], error: 'User profile not found' };
      }

      console.log(`🔍 TradeService: Querying trades for user_id: ${user.id}, user_email: ${userProfile.email}`);

      // Use email-based query for shared data
      // IMPORTANT: Supabase defaults to 1000 row limit - we need ALL rows, so use limit() to override
      // First, get the count
      const { count, error: countError } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .eq('user_email', userProfile.email);
      
      console.log(`📊 TradeService: Total trades in DB for ${userProfile.email}: ${count}`);
      
      // Now fetch ALL trades by setting a high limit (or use pagination if needed)
      // Supabase max limit is typically 1000, so if count > 1000, we need pagination
      let allTrades: DatabaseTrade[] = [];
      const pageSize = 1000;
      const totalPages = count ? Math.ceil(count / pageSize) : 1;
      
      for (let page = 0; page < totalPages; page++) {
        const { data: pageData, error: pageError } = await supabase
          .from('trades')
          .select('*')
          .eq('user_email', userProfile.email)
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (pageError) {
          console.error(`❌ Error fetching page ${page}:`, pageError);
          break;
        }
        
        if (pageData) {
          allTrades = allTrades.concat(pageData);
        }
      }
      
      console.log(`📊 TradeService: Loaded ${allTrades.length} trades (expected ${count})`);
      
      if (count && allTrades.length < count) {
        console.warn(`⚠️ TradeService: Loaded ${allTrades.length} but expected ${count}. Some trades may be missing!`);
      }
      
      const data = allTrades;
      const error = countError || null;

      if (error) {
        return { trades: [], error: error.message };
      }

      // Convert database format to app format
      const trades: Trade[] = data.map((dbTrade: DatabaseTrade) => {
        return {
        id: dbTrade.id,
        type: dbTrade.type,
        merchantId: dbTrade.merchant_id || dbTrade.party_name, // Use merchant_id if available, fallback to party_name
        merchantName: dbTrade.party_name,
        metalType: dbTrade.metal_type,
        weight: dbTrade.quantity,
        pricePerUnit: dbTrade.rate,
        totalAmount: dbTrade.amount,
        amountPaid: dbTrade.amount_paid ?? undefined,
        amountReceived: dbTrade.amount_received ?? undefined,
        laborCharges: dbTrade.labor_charges || 0,
        transferCharges: dbTrade.transfer_charges || 0,
        pickupLocation: dbTrade.pickup_location,
        dropLocation: dbTrade.drop_location,
        paymentType: dbTrade.payment_type as any,
        settlementType: dbTrade.settlement_type,
        settlementDirection: dbTrade.settlement_direction,
        notes: dbTrade.notes || '',
        tradeDate: dbTrade.trade_date ? new Date(dbTrade.trade_date) : undefined, // Add tradeDate field
        createdAt: new Date(dbTrade.created_at),
        updatedAt: new Date(dbTrade.updated_at),
      };
      });

      // Cache the results for 2 minutes
      dataCache.set(cacheKey, trades, 2 * 60 * 1000);

      return { trades, error: null };
    } catch (error) {
      return { trades: [], error: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  // Add a new trade
  static async addTrade(trade: Omit<Trade, 'id' | 'createdAt'>): Promise<{ trade: Trade | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { trade: null, error: 'User not authenticated' };
      }

      // Get user profile to get the email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { trade: null, error: 'User profile not found' };
      }

      // Convert UI Trade to DatabaseTrade format
      const dbTrade = {
        user_id: user.id,
        user_email: userProfile.email,
        type: trade.type,
        metal_type: trade.metalType || 'gold',
        quantity: trade.weight || 0,
        rate: trade.pricePerUnit || 0,
        amount: trade.totalAmount || 0,
        merchant_id: trade.merchantId || null,
        party_name: trade.merchantName || 'Unknown',
        party_phone: null,
        party_address: null,
        settlement_type: trade.settlementType || null,
        settlement_direction: trade.settlementDirection || null,
        transfer_charges: trade.transferCharges || null,
        pickup_location: trade.pickupLocation || null,
        drop_location: trade.dropLocation || null,
        amount_paid: trade.amountPaid || null,
        amount_received: trade.amountReceived || null,
        labor_charges: trade.laborCharges || null,
        payment_type: trade.paymentType || null,
        notes: trade.notes || null,
        trade_date: trade.tradeDate ? new Date(trade.tradeDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], // Add trade_date field
      };

      // Insert with both user_id and user_email for shared data
      const { data, error } = await supabase
        .from('trades')
        .insert(dbTrade)
        .select()
        .single();

      if (error) {
        return { trade: null, error: error.message };
      }

      const newTrade: Trade = {
        id: data.id,
        type: data.type,
        merchantId: trade.merchantId, // Use the original merchant ID from the input
        merchantName: data.party_name,
        metalType: data.metal_type,
        weight: data.quantity,
        pricePerUnit: data.rate,
        totalAmount: data.amount,
        amountPaid: data.amount_paid || 0,
        amountReceived: data.amount_received || 0,
        laborCharges: data.labor_charges || 0,
        transferCharges: data.transfer_charges || 0,
        pickupLocation: data.pickup_location,
        dropLocation: data.drop_location,
        paymentType: data.payment_type as any,
        settlementType: data.settlement_type,
        settlementDirection: data.settlement_direction,
        notes: data.notes || '',
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      // Invalidate cache to ensure fresh data
      await this.invalidateCache();

      return { trade: newTrade, error: null };
    } catch (error) {
      return { trade: null, error: 'An unexpected error occurred' };
    }
  }

  // Update an existing trade
  static async updateTrade(tradeId: string, updates: Partial<Omit<Trade, 'id' | 'createdAt'>>): Promise<{ trade: Trade | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { trade: null, error: 'User not authenticated' };
      }

      const updateData: any = {};
      if (updates.type) updateData.type = updates.type;
      if (updates.metalType) updateData.metal_type = updates.metalType;
      
      // Handle both old and new Trade interface properties
      if (updates.weight !== undefined) updateData.quantity = updates.weight;
      if (updates.pricePerUnit !== undefined) updateData.rate = updates.pricePerUnit;
      if (updates.totalAmount !== undefined) updateData.amount = updates.totalAmount;
      if (updates.merchantId) updateData.merchant_id = updates.merchantId;
      if (updates.merchantName) updateData.party_name = updates.merchantName;
      
      // Legacy support for old interface
      if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
      if (updates.rate !== undefined) updateData.rate = updates.rate;
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.partyName) updateData.party_name = updates.partyName;
      
      if (updates.partyPhone !== undefined) updateData.party_phone = updates.partyPhone || null;
      if (updates.partyAddress !== undefined) updateData.party_address = updates.partyAddress || null;
      if (updates.settlementType !== undefined) updateData.settlement_type = updates.settlementType || null;
      if (updates.settlementDirection !== undefined) updateData.settlement_direction = updates.settlementDirection || null;
      if (updates.transferCharges !== undefined) updateData.transfer_charges = updates.transferCharges || null;
      if (updates.pickupLocation !== undefined) updateData.pickup_location = updates.pickupLocation || null;
      if (updates.dropLocation !== undefined) updateData.drop_location = updates.dropLocation || null;
      if (updates.amountPaid !== undefined) updateData.amount_paid = updates.amountPaid || null;
      if (updates.amountReceived !== undefined) updateData.amount_received = updates.amountReceived || null;
      if (updates.laborCharges !== undefined) updateData.labor_charges = updates.laborCharges || null;
      if (updates.paymentType !== undefined) updateData.payment_type = updates.paymentType || null;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;
      
      // Handle date field - convert to proper format for database
      if (updates.date !== undefined) {
        // Convert date string to proper date format for database storage
        const dateValue = updates.date ? new Date(updates.date).toISOString().split('T')[0] : null;
        updateData.trade_date = dateValue;
      }

      // Get user profile to get the email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { trade: null, error: 'User profile not found' };
      }


      const { data, error } = await supabase
        .from('trades')
        .update(updateData)
        .eq('id', tradeId)
        .eq('user_email', userProfile.email) // Use email for shared data
        .select()
        .single();


      if (error) {
        return { trade: null, error: error.message };
      }

      const updatedTrade: Trade = {
        id: data.id,
        type: data.type,
        merchantId: data.merchant_id || data.id, // Use merchant_id if available, fallback to trade ID
        merchantName: data.party_name,
        metalType: data.metal_type,
        weight: data.quantity,
        pricePerUnit: data.rate,
        totalAmount: data.amount,
        amountPaid: data.amount_paid || 0,
        amountReceived: data.amount_received || 0,
        laborCharges: data.labor_charges || 0,
        transferCharges: data.transfer_charges || 0,
        pickupLocation: data.pickup_location,
        dropLocation: data.drop_location,
        paymentType: data.payment_type as any,
        settlementType: data.settlement_type,
        settlementDirection: data.settlement_direction,
        notes: data.notes || '',
        tradeDate: data.trade_date ? new Date(data.trade_date) : new Date(data.created_at), // Use trade_date if available, fallback to created_at
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      // Invalidate cache to ensure fresh data
      await this.invalidateCache();

      return { trade: updatedTrade, error: null };
    } catch (error) {
      return { trade: null, error: 'An unexpected error occurred' };
    }
  }

  // Delete a trade
  static async deleteTrade(tradeId: string): Promise<{ error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: 'User not authenticated' };
      }

      // Get user profile to get the email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { error: 'User profile not found' };
      }

      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', tradeId)
        .eq('user_email', userProfile.email); // Use email for shared data

      if (error) {
        return { error: error.message };
      }

      // Invalidate cache to ensure fresh data
      await this.invalidateCache();

      return { error: null };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  // Migrate trades from localStorage to database
  static async migrateTradesFromLocalStorage(localTrades: any[]): Promise<{ migrated: number; errors: string[] }> {
    const errors: string[] = [];
    let migrated = 0;

    for (const uiTrade of localTrades) {
      // Convert UI trade to service trade format
      const serviceTrade = this.convertUITradeToServiceTrade(uiTrade);
      
      // Validate and clean trade data
      const cleanedTrade = this.validateAndCleanTrade(serviceTrade);
      
      if (!cleanedTrade) {
        errors.push(`Skipped trade ${uiTrade.id}: Invalid or missing required data`);
        continue;
      }

      const { trade: newTrade, error } = await this.addTrade(cleanedTrade);

      if (error) {
        errors.push(`Failed to migrate trade ${uiTrade.id}: ${error}`);
      } else {
        migrated++;
      }
    }

    return { migrated, errors };
  }

  // Validate and clean trade data before migration
  private static validateAndCleanTrade(trade: Trade): Omit<Trade, 'id' | 'createdAt'> | null {
    // Check required fields - handle both partyName and merchantName
    const partyName = trade.partyName || trade.merchantName;
    if (!trade.type || !partyName) {
      return null;
    }

    // For Settlement and Transfer trades, metalType is optional
    const metalType = trade.metalType || 'gold'; // Default to gold if not specified

    // Validate and fix numeric fields
    const quantity = typeof trade.quantity === 'number' && trade.quantity >= 0 ? trade.quantity : 0;
    const rate = typeof trade.rate === 'number' && trade.rate >= 0 ? trade.rate : 0;
    const amount = typeof trade.amount === 'number' && trade.amount >= 0 ? trade.amount : 0;

    // For Settlement and Transfer trades, allow zero values
    if (trade.type === 'settlement' || trade.type === 'transfer') {
      return {
        type: trade.type,
        metalType: metalType,
        quantity: quantity,
        rate: rate,
        amount: amount,
        partyName: partyName,
        partyPhone: trade.partyPhone || '',
        partyAddress: trade.partyAddress || '',
        notes: trade.notes || '',
      };
    }

    // For Buy/Sell trades, require meaningful data
    // If quantity is 0 but amount is not, calculate quantity from amount and rate
    let finalQuantity = quantity;
    if (finalQuantity === 0 && amount > 0 && rate > 0) {
      finalQuantity = amount / rate;
    }

    // If amount is 0 but quantity and rate are available, calculate amount
    let finalAmount = amount;
    if (finalAmount === 0 && finalQuantity > 0 && rate > 0) {
      finalAmount = finalQuantity * rate;
    }

    // Skip Buy/Sell trades with no meaningful data
    if (finalQuantity === 0 && finalAmount === 0) {
      return null;
    }

    return {
      type: trade.type,
      metalType: metalType,
      quantity: finalQuantity,
      rate: rate,
      amount: finalAmount,
      partyName: partyName,
      partyPhone: trade.partyPhone || '',
      partyAddress: trade.partyAddress || '',
      notes: trade.notes || '',
    };
  }
}
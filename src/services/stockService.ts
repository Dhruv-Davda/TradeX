import { supabase } from '../lib/supabase';
import { Stock, MetalType } from '../types';
import { DatabaseTrade } from './tradeService';

export interface DatabaseStock {
  id: string;
  user_id: string;
  user_email: string;
  metal_type: 'gold' | 'silver';
  quantity: number;
  created_at: string;
  updated_at: string;
}

export class StockService {
  // Convert database stock to app stock
  static convertToAppStock(dbStock: DatabaseStock): Stock {
    return {
      id: dbStock.id,
      metalType: dbStock.metal_type as MetalType,
      quantity: dbStock.quantity,
      unit: dbStock.metal_type === 'gold' ? 'grams' : 'kg',
      lastUpdated: new Date(dbStock.updated_at),
    };
  }

  // Convert app stock to database stock
  static convertToDatabaseStock(stock: Stock, userId: string, userEmail: string): Omit<DatabaseStock, 'id' | 'created_at' | 'updated_at'> {
    return {
      user_id: userId,
      user_email: userEmail,
      metal_type: stock.metalType as 'gold' | 'silver',
      quantity: stock.quantity,
    };
  }

  // Get all stock records for the current user
  static async getStock(): Promise<{ stock: Stock[]; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { stock: [], error: 'User not authenticated' };
      }

      // Get user profile to get email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { stock: [], error: 'User profile not found' };
      }

      console.log('🔍 Getting stock for user');

      const { data, error } = await supabase
        .from('stock')
        .select('*')
        .eq('user_email', userProfile.email)
        .order('metal_type', { ascending: true });

      if (error) {
        console.error('❌ Error fetching stock:', error);
        return { stock: [], error: error.message };
      }

      const stock = data.map(this.convertToAppStock);
      console.log('✅ Loaded', stock.length, 'stock records from database');
      
      return { stock, error: null };
    } catch (error) {
      console.error('❌ Unexpected error fetching stock:', error);
      return { stock: [], error: 'An unexpected error occurred' };
    }
  }

  // Update stock quantity for a specific metal type
  static async updateStockQuantity(metalType: MetalType, newQuantity: number): Promise<{ stock: Stock | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { stock: null, error: 'User not authenticated' };
      }

      // Get user profile to get email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { stock: null, error: 'User profile not found' };
      }

      console.log('📝 Updating stock in database:', { metalType, newQuantity });

      // Try to update existing record first
      const { data: existingStock } = await supabase
        .from('stock')
        .select('*')
        .eq('user_email', userProfile.email)
        .eq('metal_type', metalType)
        .single();

      if (existingStock) {
        // Update existing record
        const { data, error } = await supabase
          .from('stock')
          .update({ 
            quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingStock.id)
          .eq('user_email', userProfile.email)
          .select()
          .single();

        if (error) {
          console.error('❌ Error updating stock:', error);
          return { stock: null, error: error.message };
        }

        const updatedStock = this.convertToAppStock(data);
        console.log('✅ Stock updated successfully:', updatedStock);
        return { stock: updatedStock, error: null };
      } else {
        // Create new record
        const { data, error } = await supabase
          .from('stock')
          .insert({
            user_id: user.id,
            user_email: userProfile.email,
            metal_type: metalType as 'gold' | 'silver',
            quantity: newQuantity,
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating stock:', error);
          return { stock: null, error: error.message };
        }

        const newStock = this.convertToAppStock(data);
        console.log('✅ Stock created successfully:', newStock);
        return { stock: newStock, error: null };
      }
    } catch (error) {
      console.error('❌ Unexpected error updating stock:', error);
      return { stock: null, error: 'An unexpected error occurred' };
    }
  }

  // Calculate stock from trades and update database
  static async calculateAndUpdateStockFromTrades(): Promise<{ stock: Stock[]; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { stock: [], error: 'User not authenticated' };
      }

      // Get user profile to get email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { stock: [], error: 'User profile not found' };
      }

      console.log('🧮 Calculating stock from trades');

      // Get total count first
      const { count, error: countError } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .eq('user_email', userProfile.email);

      if (countError) {
        console.error('❌ Error fetching trade count for stock calculation:', countError);
        return { stock: [], error: countError.message };
      }

      console.log(`📊 StockService: Total trades in DB for ${userProfile.email}: ${count}`);

      // Fetch ALL trades with pagination (Supabase default limit is 1000)
      let allTrades: DatabaseTrade[] = [];
      const pageSize = 1000;
      const totalPages = count ? Math.ceil(count / pageSize) : 1;

      for (let page = 0; page < totalPages; page++) {
        const { data: pageData, error: pageError } = await supabase
          .from('trades')
          .select('*')
          .eq('user_email', userProfile.email)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (pageError) {
          console.error(`❌ Error fetching page ${page} for stock calculation:`, pageError);
          return { stock: [], error: pageError.message };
        }

        if (pageData) {
          allTrades = allTrades.concat(pageData);
        }
      }

      console.log(`📊 StockService: Loaded ${allTrades.length} trades for stock calculation (expected ${count})`);

      if (count && allTrades.length < count) {
        console.warn(`⚠️ StockService: Loaded ${allTrades.length} but expected ${count}. Stock calculation may be incorrect!`);
      }

      const trades = allTrades;

      // Calculate stock for each metal type
      const stockCalculations: { [key: string]: number } = { gold: 0, silver: 0 };
      const buyCounts: { [key: string]: number } = { gold: 0, silver: 0 };
      const sellCounts: { [key: string]: number } = { gold: 0, silver: 0 };
      const settlementCounts: { [key: string]: number } = { gold: 0, silver: 0 };

      trades.forEach(trade => {
        const metalType = trade.metal_type;
        const quantity = Number(trade.quantity || 0);
        
        if (trade.type === 'buy') {
          stockCalculations[metalType] += quantity;
          buyCounts[metalType] += quantity;
        } else if (trade.type === 'sell') {
          stockCalculations[metalType] -= quantity;
          sellCounts[metalType] += quantity;
        } else if (trade.type === 'settlement') {
          // For settlements, if it's a metal settlement (gold/silver)
          if (trade.settlement_type === 'gold' || trade.settlement_type === 'silver') {
            if (trade.settlement_direction === 'receiving') {
              stockCalculations[metalType] += quantity; // Receiving metal increases stock
              settlementCounts[metalType] += quantity;
            } else if (trade.settlement_direction === 'paying') {
              stockCalculations[metalType] -= quantity; // Paying metal decreases stock
              settlementCounts[metalType] -= quantity;
            }
          }
        }
      });

      console.log('📊 Stock calculation summary:', {
        gold: {
          buy: buyCounts.gold,
          sell: sellCounts.gold,
          settlement: settlementCounts.gold,
          net: stockCalculations.gold,
          unit: 'grams'
        },
        silver: {
          buy: buyCounts.silver,
          sell: sellCounts.silver,
          settlement: settlementCounts.silver,
          net: stockCalculations.silver,
          unit: 'kg'
        }
      });

      // Update stock in database
      const updatedStock: Stock[] = [];
      
      for (const [metalType, quantity] of Object.entries(stockCalculations)) {
        const { stock: updatedStockItem, error } = await this.updateStockQuantity(
          metalType as MetalType, 
          quantity
        );
        
        if (error) {
          console.error(`❌ Error updating ${metalType} stock:`, error);
          return { stock: [], error: `Error updating ${metalType} stock: ${error}` };
        }
        
        if (updatedStockItem) {
          updatedStock.push(updatedStockItem);
        }
      }

      console.log('✅ Stock calculated and updated successfully:', updatedStock);
      return { stock: updatedStock, error: null };
    } catch (error) {
      console.error('❌ Unexpected error calculating stock:', error);
      return { stock: [], error: 'An unexpected error occurred' };
    }
  }

  // Delete all stock records for the current user
  static async clearStock(): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get user profile to get email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { success: false, error: 'User profile not found' };
      }

      console.log('🗑️ Clearing stock from database');

      const { error } = await supabase
        .from('stock')
        .delete()
        .eq('user_email', userProfile.email);

      if (error) {
        console.error('❌ Error clearing stock:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Stock cleared successfully');
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Unexpected error clearing stock:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Get stock snapshot for a specific date from daily_stock_snapshots
  static async getStockSnapshot(snapshotDate: Date): Promise<{ goldGrams: number; silverGrams: number; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { goldGrams: 0, silverGrams: 0, error: 'User not authenticated' };
      }

      // Get user profile to get email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { goldGrams: 0, silverGrams: 0, error: 'User profile not found' };
      }

      const dateStr = snapshotDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_stock_snapshots')
        .select('gold_grams, silver_grams')
        .eq('user_email', userProfile.email)
        .eq('snapshot_date', dateStr)
        .single();

      if (error) {
        // If snapshot doesn't exist for that date, return 0 (fallback)
        console.warn(`⚠️ No snapshot found for ${dateStr}, using 0`);
        return { goldGrams: 0, silverGrams: 0, error: null };
      }

      return {
        goldGrams: Number(data.gold_grams || 0),
        silverGrams: Number(data.silver_grams || 0),
        error: null
      };
    } catch (error) {
      console.error('❌ Unexpected error fetching stock snapshot:', error);
      return { goldGrams: 0, silverGrams: 0, error: 'An unexpected error occurred' };
    }
  }
}

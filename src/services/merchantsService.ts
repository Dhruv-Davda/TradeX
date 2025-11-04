import { supabase } from '../lib/supabase';
import { Merchant } from '../types';

export interface DatabaseMerchant {
  id: string;
  user_id: string;
  user_email: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  total_due: number;
  total_owe: number;
  created_at: string;
  updated_at: string;
}

export class MerchantsService {
  // Convert database merchant to app merchant
  static convertToAppMerchant(dbMerchant: DatabaseMerchant): Merchant {
    return {
      id: dbMerchant.id,
      name: dbMerchant.name,
      email: dbMerchant.email || undefined,
      phone: dbMerchant.phone || undefined,
      address: dbMerchant.address || undefined,
      totalDue: dbMerchant.total_due,
      totalOwe: dbMerchant.total_owe,
      createdAt: new Date(dbMerchant.created_at),
      updatedAt: new Date(dbMerchant.updated_at),
    };
  }

  // Convert app merchant to database merchant
  static convertToDatabaseMerchant(merchant: Merchant, userId: string, userEmail: string): Omit<DatabaseMerchant, 'id' | 'created_at' | 'updated_at'> {
    return {
      user_id: userId,
      user_email: userEmail,
      name: merchant.name,
      email: merchant.email || null,
      phone: merchant.phone || null,
      address: merchant.address || null,
      total_due: merchant.totalDue,
      total_owe: merchant.totalOwe,
    };
  }

  // Get all merchants for the current user
  static async getMerchants(): Promise<{ merchants: Merchant[]; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { merchants: [], error: 'User not authenticated' };
      }

      // Get user profile to get email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { merchants: [], error: 'User profile not found' };
      }


      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_email', userProfile.email)
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching merchants:', error);
        return { merchants: [], error: error.message };
      }

      const merchants = data.map(this.convertToAppMerchant);
      
      return { merchants, error: null };
    } catch (error) {
      console.error('❌ Unexpected error fetching merchants:', error);
      return { merchants: [], error: 'An unexpected error occurred' };
    }
  }

  // Add new merchant
  static async addMerchant(merchant: Omit<Merchant, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ merchant: Merchant | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { merchant: null, error: 'User not authenticated' };
      }

      // Get user profile to get email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { merchant: null, error: 'User profile not found' };
      }


      const dbMerchant = this.convertToDatabaseMerchant(
        { ...merchant, id: '', createdAt: new Date(), updatedAt: new Date() },
        user.id,
        userProfile.email
      );

      const { data, error } = await supabase
        .from('merchants')
        .insert(dbMerchant)
        .select()
        .single();

      if (error) {
        console.error('❌ Error adding merchant:', error);
        return { merchant: null, error: error.message };
      }

      const newMerchant = this.convertToAppMerchant(data);
      
      return { merchant: newMerchant, error: null };
    } catch (error) {
      console.error('❌ Unexpected error adding merchant:', error);
      return { merchant: null, error: 'An unexpected error occurred' };
    }
  }

  // Update merchant
  static async updateMerchant(merchant: Merchant): Promise<{ merchant: Merchant | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { merchant: null, error: 'User not authenticated' };
      }

      // Get user profile to get email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { merchant: null, error: 'User profile not found' };
      }


      const dbMerchant = this.convertToDatabaseMerchant(merchant, user.id, userProfile.email);

      const { data, error } = await supabase
        .from('merchants')
        .update(dbMerchant)
        .eq('id', merchant.id)
        .eq('user_email', userProfile.email)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating merchant:', error);
        return { merchant: null, error: error.message };
      }

      const updatedMerchant = this.convertToAppMerchant(data);
      
      return { merchant: updatedMerchant, error: null };
    } catch (error) {
      console.error('❌ Unexpected error updating merchant:', error);
      return { merchant: null, error: 'An unexpected error occurred' };
    }
  }

  // Delete merchant
  static async deleteMerchant(merchantId: string): Promise<{ success: boolean; error: string | null }> {
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


      const { error } = await supabase
        .from('merchants')
        .delete()
        .eq('id', merchantId)
        .eq('user_email', userProfile.email);

      if (error) {
        console.error('❌ Error deleting merchant:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Unexpected error deleting merchant:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Update merchant debt based on transaction
  static async updateMerchantDebt(merchantId: string, debtChange: { totalDue?: number; totalOwe?: number }): Promise<{ success: boolean; error: string | null }> {
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


      // Get current merchant data
      const { data: currentMerchant, error: fetchError } = await supabase
        .from('merchants')
        .select('total_due, total_owe')
        .eq('id', merchantId)
        .eq('user_email', userProfile.email)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching merchant:', fetchError);
        return { success: false, error: fetchError.message };
      }

      // Calculate new debt amounts
      const newTotalDue = (currentMerchant.total_due || 0) + (debtChange.totalDue || 0);
      const newTotalOwe = (currentMerchant.total_owe || 0) + (debtChange.totalOwe || 0);


      // Update merchant debt
      const { error: updateError } = await supabase
        .from('merchants')
        .update({
          total_due: Math.max(0, newTotalDue), // Ensure non-negative
          total_owe: Math.max(0, newTotalOwe), // Ensure non-negative
          updated_at: new Date().toISOString()
        })
        .eq('id', merchantId)
        .eq('user_email', userProfile.email);

      if (updateError) {
        console.error('❌ Error updating merchant debt:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Unexpected error updating merchant debt:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Calculate debt change for a transaction
  static calculateDebtChange(trade: any): { totalDue?: number; totalOwe?: number } {
    const debtChange: { totalDue?: number; totalOwe?: number } = {};

    if (trade.type === 'buy') {
      // For buy: if you pay less than total, merchant owes you (totalDue increases)
      const remainingAmount = (trade.totalAmount || 0) - (trade.amountPaid || 0);
      if (remainingAmount > 0) {
        debtChange.totalDue = remainingAmount; // Merchant owes you this amount
      }
    } else if (trade.type === 'sell') {
      // For sell: if you receive less than total, customer owes you (totalDue increases)
      const remainingAmount = (trade.totalAmount || 0) - (trade.amountReceived || 0);
      if (remainingAmount > 0) {
        debtChange.totalDue = remainingAmount; // Customer owes you this amount
      }
    } else if (trade.type === 'settlement') {
      // For settlement: reduce debt based on settlement direction
      const settlementAmount = trade.totalAmount || 0;
      if (trade.settlementDirection === 'receiving') {
        debtChange.totalDue = -settlementAmount; // Reduce what others owe you
      } else if (trade.settlementDirection === 'paying') {
        debtChange.totalOwe = -settlementAmount; // Reduce what you owe others
      }
    }

    return debtChange;
  }
}

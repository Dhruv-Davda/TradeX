import { supabase } from '../lib/supabase';
import { Income, PaymentType } from '../types';

export interface DatabaseIncome {
  id: string;
  user_id: string;
  user_email: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  payment_type: 'cash' | 'bank_transfer' | 'upi' | 'cheque';
  created_at: string;
  updated_at: string;
}

export class IncomeService {
  // Convert database income to app income
  static convertToAppIncome(dbIncome: DatabaseIncome): Income {
    return {
      id: dbIncome.id,
      category: dbIncome.category,
      description: dbIncome.description,
      amount: dbIncome.amount,
      date: new Date(dbIncome.date),
      paymentType: dbIncome.payment_type as PaymentType,
      createdAt: new Date(dbIncome.created_at),
    };
  }

  // Convert app income to database income
  static convertToDatabaseIncome(income: Income, userId: string, userEmail: string): Omit<DatabaseIncome, 'id' | 'created_at' | 'updated_at'> {
    return {
      user_id: userId,
      user_email: userEmail,
      category: income.category,
      description: income.description,
      amount: income.amount,
      date: income.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      payment_type: income.paymentType as 'cash' | 'bank_transfer' | 'upi' | 'cheque',
    };
  }

  // Get all income records for the current user
  static async getIncome(): Promise<{ income: Income[]; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { income: [], error: 'User not authenticated' };
      }

      // Get user profile to get email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { income: [], error: 'User profile not found' };
      }

      console.log('🔍 Getting income for user');

      const { data, error } = await supabase
        .from('income')
        .select('*')
        .eq('user_email', userProfile.email)
        .order('date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching income:', error);
        return { income: [], error: error.message };
      }

      const income = data.map(this.convertToAppIncome);
      console.log('✅ Loaded', income.length, 'income records from database');
      
      return { income, error: null };
    } catch (error) {
      console.error('❌ Unexpected error fetching income:', error);
      return { income: [], error: 'An unexpected error occurred' };
    }
  }

  // Add new income record
  static async addIncome(income: Omit<Income, 'id' | 'createdAt'>): Promise<{ income: Income | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { income: null, error: 'User not authenticated' };
      }

      // Get user profile to get email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { income: null, error: 'User profile not found' };
      }


      const dbIncome = this.convertToDatabaseIncome(
        { ...income, id: '', createdAt: new Date() },
        user.id,
        userProfile.email
      );

      const { data, error } = await supabase
        .from('income')
        .insert(dbIncome)
        .select()
        .single();

      if (error) {
        console.error('❌ Error adding income:', error);
        return { income: null, error: error.message };
      }

      const newIncome = this.convertToAppIncome(data);
      console.log('✅ Income added successfully:', newIncome);
      
      return { income: newIncome, error: null };
    } catch (error) {
      console.error('❌ Unexpected error adding income:', error);
      return { income: null, error: 'An unexpected error occurred' };
    }
  }

  // Update income record
  static async updateIncome(income: Income): Promise<{ income: Income | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { income: null, error: 'User not authenticated' };
      }

      // Get user profile to get email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { income: null, error: 'User profile not found' };
      }

      console.log('📝 Updating income in database:', income);

      const dbIncome = this.convertToDatabaseIncome(income, user.id, userProfile.email);

      const { data, error } = await supabase
        .from('income')
        .update(dbIncome)
        .eq('id', income.id)
        .eq('user_email', userProfile.email)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating income:', error);
        return { income: null, error: error.message };
      }

      const updatedIncome = this.convertToAppIncome(data);
      console.log('✅ Income updated successfully:', updatedIncome);
      
      return { income: updatedIncome, error: null };
    } catch (error) {
      console.error('❌ Unexpected error updating income:', error);
      return { income: null, error: 'An unexpected error occurred' };
    }
  }

  // Delete income record
  static async deleteIncome(incomeId: string): Promise<{ success: boolean; error: string | null }> {
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

      console.log('🗑️ Deleting income from database');

      const { error } = await supabase
        .from('income')
        .delete()
        .eq('id', incomeId)
        .eq('user_email', userProfile.email);

      if (error) {
        console.error('❌ Error deleting income:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Income deleted successfully');
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Unexpected error deleting income:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}

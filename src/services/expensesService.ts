import { supabase } from '../lib/supabase';
import { Expense, PaymentType } from '../types';

export interface DatabaseExpense {
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

export class ExpensesService {
  // Convert database expense to app expense
  static convertToAppExpense(dbExpense: DatabaseExpense): Expense {
    return {
      id: dbExpense.id,
      category: dbExpense.category,
      description: dbExpense.description,
      amount: dbExpense.amount,
      date: new Date(dbExpense.date),
      paymentType: dbExpense.payment_type as PaymentType,
      createdAt: new Date(dbExpense.created_at),
    };
  }

  // Convert app expense to database expense
  static convertToDatabaseExpense(expense: Expense, userId: string, userEmail: string): Omit<DatabaseExpense, 'id' | 'created_at' | 'updated_at'> {
    return {
      user_id: userId,
      user_email: userEmail,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      date: expense.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      payment_type: expense.paymentType as 'cash' | 'bank_transfer' | 'upi' | 'cheque',
    };
  }

  // Get all expense records for the current user
  static async getExpenses(): Promise<{ expenses: Expense[]; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { expenses: [], error: 'User not authenticated' };
      }

      // Get user profile to get email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { expenses: [], error: 'User profile not found' };
      }

      console.log('🔍 Getting expenses for user');

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_email', userProfile.email)
        .order('date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching expenses:', error);
        return { expenses: [], error: error.message };
      }

      const expenses = data.map(this.convertToAppExpense);
      console.log('✅ Loaded', expenses.length, 'expense records from database');
      
      return { expenses, error: null };
    } catch (error) {
      console.error('❌ Unexpected error fetching expenses:', error);
      return { expenses: [], error: 'An unexpected error occurred' };
    }
  }

  // Add new expense record
  static async addExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<{ expense: Expense | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { expense: null, error: 'User not authenticated' };
      }

      // Get user profile to get email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { expense: null, error: 'User profile not found' };
      }


      const dbExpense = this.convertToDatabaseExpense(
        { ...expense, id: '', createdAt: new Date() },
        user.id,
        userProfile.email
      );

      const { data, error } = await supabase
        .from('expenses')
        .insert(dbExpense)
        .select()
        .single();

      if (error) {
        console.error('❌ Error adding expense:', error);
        return { expense: null, error: error.message };
      }

      const newExpense = this.convertToAppExpense(data);
      console.log('✅ Expense added successfully:', newExpense);
      
      return { expense: newExpense, error: null };
    } catch (error) {
      console.error('❌ Unexpected error adding expense:', error);
      return { expense: null, error: 'An unexpected error occurred' };
    }
  }

  // Update expense record
  static async updateExpense(expense: Expense): Promise<{ expense: Expense | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { expense: null, error: 'User not authenticated' };
      }

      // Get user profile to get email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { expense: null, error: 'User profile not found' };
      }

      console.log('📝 Updating expense in database:', expense);

      const dbExpense = this.convertToDatabaseExpense(expense, user.id, userProfile.email);

      const { data, error } = await supabase
        .from('expenses')
        .update(dbExpense)
        .eq('id', expense.id)
        .eq('user_email', userProfile.email)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating expense:', error);
        return { expense: null, error: error.message };
      }

      const updatedExpense = this.convertToAppExpense(data);
      console.log('✅ Expense updated successfully:', updatedExpense);
      
      return { expense: updatedExpense, error: null };
    } catch (error) {
      console.error('❌ Unexpected error updating expense:', error);
      return { expense: null, error: 'An unexpected error occurred' };
    }
  }

  // Delete expense record
  static async deleteExpense(expenseId: string): Promise<{ success: boolean; error: string | null }> {
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

      console.log('🗑️ Deleting expense from database');

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('user_email', userProfile.email);

      if (error) {
        console.error('❌ Error deleting expense:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Expense deleted successfully');
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Unexpected error deleting expense:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}

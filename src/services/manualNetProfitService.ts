import { supabase } from '../lib/supabase';

export interface ManualNetProfit {
  id: string;
  monthYear: string; // Format: 'YYYY-MM'
  netProfit: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DatabaseManualNetProfit {
  id: string;
  user_id: string;
  user_email: string;
  month_year: string;
  net_profit: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export class ManualNetProfitService {
  // Convert database format to app format
  private static convertToAppFormat(dbProfit: DatabaseManualNetProfit): ManualNetProfit {
    return {
      id: dbProfit.id,
      monthYear: dbProfit.month_year,
      netProfit: Number(dbProfit.net_profit),
      notes: dbProfit.notes || undefined,
      createdAt: new Date(dbProfit.created_at),
      updatedAt: new Date(dbProfit.updated_at),
    };
  }

  // Get net profit for a specific month
  static async getNetProfitForMonth(monthYear: string): Promise<{ netProfit: number; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { netProfit: 0, error: 'User not authenticated' };
      }

      // Get user profile to get email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { netProfit: 0, error: 'User profile not found' };
      }

      const { data, error } = await supabase
        .from('manual_net_profit')
        .select('*')
        .eq('user_email', userProfile.email)
        .eq('month_year', monthYear)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No row found - return 0 (default)
          return { netProfit: 0, error: null };
        }
        console.error('❌ Error fetching manual net profit:', error);
        return { netProfit: 0, error: error.message };
      }

      return { netProfit: data ? Number(data.net_profit) : 0, error: null };
    } catch (error) {
      console.error('❌ Unexpected error fetching manual net profit:', error);
      return { netProfit: 0, error: 'An unexpected error occurred' };
    }
  }

  // Get sum of net profit for a month range (from startMonth to endMonth inclusive)
  static async getNetProfitForMonthRange(
    startMonth: string, // Format: 'YYYY-MM'
    endMonth: string    // Format: 'YYYY-MM'
  ): Promise<{ netProfit: number; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { netProfit: 0, error: 'User not authenticated' };
      }

      // Get user profile to get email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { netProfit: 0, error: 'User profile not found' };
      }

      // Query all months between startMonth and endMonth
      const { data, error } = await supabase
        .from('manual_net_profit')
        .select('net_profit')
        .eq('user_email', userProfile.email)
        .gte('month_year', startMonth)
        .lte('month_year', endMonth);

      if (error) {
        console.error('❌ Error fetching manual net profit range:', error);
        return { netProfit: 0, error: error.message };
      }

      // Sum all net profits
      const total = data?.reduce((sum, row) => sum + Number(row.net_profit || 0), 0) || 0;

      return { netProfit: total, error: null };
    } catch (error) {
      console.error('❌ Unexpected error fetching manual net profit range:', error);
      return { netProfit: 0, error: 'An unexpected error occurred' };
    }
  }

  // Get all manual net profit records (for debugging/admin)
  static async getAllNetProfits(): Promise<{ netProfits: ManualNetProfit[]; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { netProfits: [], error: 'User not authenticated' };
      }

      // Get user profile to get email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        return { netProfits: [], error: 'User profile not found' };
      }

      const { data, error } = await supabase
        .from('manual_net_profit')
        .select('*')
        .eq('user_email', userProfile.email)
        .order('month_year', { ascending: false });

      if (error) {
        console.error('❌ Error fetching all manual net profits:', error);
        return { netProfits: [], error: error.message };
      }

      const netProfits = (data || []).map(row => this.convertToAppFormat(row));
      return { netProfits, error: null };
    } catch (error) {
      console.error('❌ Unexpected error fetching all manual net profits:', error);
      return { netProfits: [], error: 'An unexpected error occurred' };
    }
  }
}


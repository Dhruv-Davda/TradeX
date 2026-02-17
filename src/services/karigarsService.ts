import { supabase } from '../lib/supabase';
import { Karigar } from '../types';

export interface DatabaseKarigar {
  id: string;
  user_id: string;
  user_email: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export class KarigarsService {
  static convertToAppKarigar(dbKarigar: DatabaseKarigar): Karigar {
    return {
      id: dbKarigar.id,
      name: dbKarigar.name,
      phone: dbKarigar.phone || undefined,
      address: dbKarigar.address || undefined,
      notes: dbKarigar.notes || undefined,
      createdAt: new Date(dbKarigar.created_at),
      updatedAt: new Date(dbKarigar.updated_at),
    };
  }

  static convertToDatabaseKarigar(karigar: Karigar, userId: string, userEmail: string): Omit<DatabaseKarigar, 'id' | 'created_at' | 'updated_at'> {
    return {
      user_id: userId,
      user_email: userEmail,
      name: karigar.name,
      phone: karigar.phone || null,
      address: karigar.address || null,
      notes: karigar.notes || null,
    };
  }

  static async getKarigars(): Promise<{ karigars: Karigar[]; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { karigars: [], error: 'User not authenticated' };

      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) return { karigars: [], error: 'User profile not found' };

      const { data, error } = await supabase
        .from('karigars')
        .select('*')
        .eq('user_email', userProfile.email)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching karigars:', error);
        return { karigars: [], error: error.message };
      }

      return { karigars: data.map(this.convertToAppKarigar), error: null };
    } catch (error) {
      console.error('Unexpected error fetching karigars:', error);
      return { karigars: [], error: 'An unexpected error occurred' };
    }
  }

  static async addKarigar(karigar: Omit<Karigar, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ karigar: Karigar | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { karigar: null, error: 'User not authenticated' };

      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) return { karigar: null, error: 'User profile not found' };

      const dbKarigar = this.convertToDatabaseKarigar(
        { ...karigar, id: '', createdAt: new Date(), updatedAt: new Date() },
        user.id,
        userProfile.email
      );

      const { data, error } = await supabase
        .from('karigars')
        .insert(dbKarigar)
        .select()
        .single();

      if (error) {
        console.error('Error adding karigar:', error);
        return { karigar: null, error: error.message };
      }

      return { karigar: this.convertToAppKarigar(data), error: null };
    } catch (error) {
      console.error('Unexpected error adding karigar:', error);
      return { karigar: null, error: 'An unexpected error occurred' };
    }
  }

  static async updateKarigar(karigar: Karigar): Promise<{ karigar: Karigar | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { karigar: null, error: 'User not authenticated' };

      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) return { karigar: null, error: 'User profile not found' };

      const dbKarigar = this.convertToDatabaseKarigar(karigar, user.id, userProfile.email);

      const { data, error } = await supabase
        .from('karigars')
        .update(dbKarigar)
        .eq('id', karigar.id)
        .eq('user_email', userProfile.email)
        .select()
        .single();

      if (error) {
        console.error('Error updating karigar:', error);
        return { karigar: null, error: error.message };
      }

      return { karigar: this.convertToAppKarigar(data), error: null };
    } catch (error) {
      console.error('Unexpected error updating karigar:', error);
      return { karigar: null, error: 'An unexpected error occurred' };
    }
  }

  static async deleteKarigar(karigarId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'User not authenticated' };

      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) return { success: false, error: 'User profile not found' };

      // Check if karigar has transactions
      const { count } = await supabase
        .from('ghaat_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('karigar_id', karigarId)
        .eq('user_email', userProfile.email);

      if (count && count > 0) {
        return { success: false, error: 'Cannot delete karigar with existing transactions. Delete the transactions first.' };
      }

      const { error } = await supabase
        .from('karigars')
        .delete()
        .eq('id', karigarId)
        .eq('user_email', userProfile.email);

      if (error) {
        console.error('Error deleting karigar:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Unexpected error deleting karigar:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}

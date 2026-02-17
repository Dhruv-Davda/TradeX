import { supabase } from '../lib/supabase';
import { JewelleryCategory } from '../types';

interface DatabaseJewelleryCategory {
  id: string;
  user_id: string;
  user_email: string;
  name: string;
  created_at: string;
}

export class JewelleryCategoryService {
  static convertToApp(db: DatabaseJewelleryCategory): JewelleryCategory {
    return {
      id: db.id,
      name: db.name,
      createdAt: new Date(db.created_at),
    };
  }

  static async getCategories(): Promise<{ categories: JewelleryCategory[]; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { categories: [], error: 'User not authenticated' };

      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) return { categories: [], error: 'User profile not found' };

      const { data, error } = await supabase
        .from('jewellery_categories')
        .select('*')
        .eq('user_email', userProfile.email)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching jewellery categories:', error);
        return { categories: [], error: error.message };
      }

      return { categories: data.map(this.convertToApp), error: null };
    } catch (error) {
      console.error('Unexpected error fetching jewellery categories:', error);
      return { categories: [], error: 'An unexpected error occurred' };
    }
  }

  static async addCategory(name: string): Promise<{ category: JewelleryCategory | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { category: null, error: 'User not authenticated' };

      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) return { category: null, error: 'User profile not found' };

      const { data, error } = await supabase
        .from('jewellery_categories')
        .insert({
          user_id: user.id,
          user_email: userProfile.email,
          name,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding jewellery category:', error);
        return { category: null, error: error.message };
      }

      return { category: this.convertToApp(data), error: null };
    } catch (error) {
      console.error('Unexpected error adding jewellery category:', error);
      return { category: null, error: 'An unexpected error occurred' };
    }
  }

  static async deleteCategory(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'User not authenticated' };

      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!userProfile) return { success: false, error: 'User profile not found' };

      const { error } = await supabase
        .from('jewellery_categories')
        .delete()
        .eq('id', id)
        .eq('user_email', userProfile.email);

      if (error) {
        console.error('Error deleting jewellery category:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Unexpected error deleting jewellery category:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}

import { createClient } from '@supabase/supabase-js';

// Set these in your .env file:
//   VITE_SUPABASE_URL=your-supabase-url
//   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Please set them in your .env file.');
}

// Note: Removed automatic cache clearing as it was causing authentication issues
// If you need to clear cache, do it manually in browser dev tools

// Create Supabase client with session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Test connection - removed sensitive logging

// Database types (we'll create these tables in Supabase)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          business_name: string;
          phone_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          business_name: string;
          phone_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          business_name?: string;
          phone_number?: string | null;
          updated_at?: string;
        };
      };
      trades: {
        Row: {
          id: string;
          user_id: string;
          user_email: string; // Add email field for shared data
          type: 'buy' | 'sell' | 'transfer' | 'settlement';
          metal_type: 'gold' | 'silver';
          quantity: number;
          rate: number;
          amount: number;
          merchant_id: string | null;
          party_name: string;
          party_phone: string | null;
          party_address: string | null;
          settlement_type: 'cash' | 'bank' | 'bill' | 'gold' | 'silver' | null;
          settlement_direction: 'receiving' | 'paying' | null;
          transfer_charges: number | null;
          pickup_location: string | null;
          drop_location: string | null;
          amount_paid: number | null;
          amount_received: number | null;
          labor_charges: number | null;
          payment_type: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_email: string; // Add email field for shared data
          type: 'buy' | 'sell' | 'transfer' | 'settlement';
          metal_type: 'gold' | 'silver';
          quantity: number;
          rate: number;
          amount: number;
          merchant_id?: string | null;
          party_name: string;
          party_phone?: string | null;
          party_address?: string | null;
          settlement_type?: 'cash' | 'bank' | 'bill' | 'gold' | 'silver' | null;
          settlement_direction?: 'receiving' | 'paying' | null;
          transfer_charges?: number | null;
          pickup_location?: string | null;
          drop_location?: string | null;
          amount_paid?: number | null;
          amount_received?: number | null;
          labor_charges?: number | null;
          payment_type?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_email?: string; // Add email field for shared data
          type?: 'buy' | 'sell' | 'transfer' | 'settlement';
          metal_type?: 'gold' | 'silver';
          quantity?: number;
          rate?: number;
          amount?: number;
          merchant_id?: string | null;
          party_name?: string;
          party_phone?: string | null;
          party_address?: string | null;
          settlement_type?: 'cash' | 'bank' | 'bill' | 'gold' | 'silver' | null;
          settlement_direction?: 'receiving' | 'paying' | null;
          transfer_charges?: number | null;
          pickup_location?: string | null;
          drop_location?: string | null;
          amount_paid?: number | null;
          amount_received?: number | null;
          labor_charges?: number | null;
          payment_type?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      income: {
        Row: {
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
        };
        Insert: {
          id?: string;
          user_id: string;
          user_email: string;
          category: string;
          description: string;
          amount: number;
          date: string;
          payment_type: 'cash' | 'bank_transfer' | 'upi' | 'cheque';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_email?: string;
          category?: string;
          description?: string;
          amount?: number;
          date?: string;
          payment_type?: 'cash' | 'bank_transfer' | 'upi' | 'cheque';
          updated_at?: string;
        };
      };
      expenses: {
        Row: {
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
        };
        Insert: {
          id?: string;
          user_id: string;
          user_email: string;
          category: string;
          description: string;
          amount: number;
          date: string;
          payment_type: 'cash' | 'bank_transfer' | 'upi' | 'cheque';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_email?: string;
          category?: string;
          description?: string;
          amount?: number;
          date?: string;
          payment_type?: 'cash' | 'bank_transfer' | 'upi' | 'cheque';
          updated_at?: string;
        };
      };
      merchants: {
        Row: {
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
        };
        Insert: {
          id?: string;
          user_id: string;
          user_email: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          total_due?: number;
          total_owe?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_email?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          total_due?: number;
          total_owe?: number;
          updated_at?: string;
        };
      };
      stock: {
        Row: {
          id: string;
          user_id: string;
          user_email: string;
          metal_type: 'gold' | 'silver';
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_email: string;
          metal_type: 'gold' | 'silver';
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_email?: string;
          metal_type?: 'gold' | 'silver';
          quantity?: number;
          updated_at?: string;
        };
      };
    };
  };
}

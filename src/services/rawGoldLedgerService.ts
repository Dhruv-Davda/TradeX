import { supabase } from '../lib/supabase';
import { RawGoldLedgerEntry, RawGoldLedgerType, RawGoldLedgerSource } from '../types';

export interface DatabaseRawGoldLedgerEntry {
  id: string;
  user_id: string;
  user_email: string;
  type: string;
  source: string;
  reference_id: string | null;
  gross_weight: number;
  purity: number;
  fine_gold: number;
  cash_amount: number | null;
  counterparty_name: string;
  counterparty_id: string | null;
  notes: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export class RawGoldLedgerService {
  static convertToApp(db: DatabaseRawGoldLedgerEntry): RawGoldLedgerEntry {
    return {
      id: db.id,
      type: db.type as RawGoldLedgerType,
      source: db.source as RawGoldLedgerSource,
      referenceId: db.reference_id || undefined,
      grossWeight: Number(db.gross_weight),
      purity: Number(db.purity),
      fineGold: Number(db.fine_gold),
      cashAmount: db.cash_amount ? Number(db.cash_amount) : undefined,
      counterpartyName: db.counterparty_name,
      counterpartyId: db.counterparty_id || undefined,
      notes: db.notes || undefined,
      transactionDate: db.transaction_date,
      createdAt: new Date(db.created_at),
      updatedAt: new Date(db.updated_at),
    };
  }

  private static async getUserContext() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: userProfile } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();

    if (!userProfile) return null;
    return { userId: user.id, userEmail: userProfile.email };
  }

  static async getEntries(): Promise<{ entries: RawGoldLedgerEntry[]; error: string | null }> {
    try {
      const ctx = await this.getUserContext();
      if (!ctx) return { entries: [], error: 'User not authenticated' };

      const { data, error } = await supabase
        .from('raw_gold_ledger')
        .select('*')
        .eq('user_email', ctx.userEmail)
        .order('transaction_date', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching raw gold ledger:', error);
        return { entries: [], error: error.message };
      }

      return { entries: data.map(this.convertToApp), error: null };
    } catch (error) {
      console.error('Unexpected error fetching raw gold ledger:', error);
      return { entries: [], error: 'An unexpected error occurred' };
    }
  }

  static async addEntry(entry: Omit<RawGoldLedgerEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ entry: RawGoldLedgerEntry | null; error: string | null }> {
    try {
      const ctx = await this.getUserContext();
      if (!ctx) return { entry: null, error: 'User not authenticated' };

      const dbEntry = {
        user_id: ctx.userId,
        user_email: ctx.userEmail,
        type: entry.type,
        source: entry.source,
        reference_id: entry.referenceId || null,
        gross_weight: entry.grossWeight,
        purity: entry.purity,
        fine_gold: entry.fineGold,
        cash_amount: entry.cashAmount ?? null,
        counterparty_name: entry.counterpartyName,
        counterparty_id: entry.counterpartyId || null,
        notes: entry.notes || null,
        transaction_date: entry.transactionDate,
      };

      const { data, error } = await supabase
        .from('raw_gold_ledger')
        .insert(dbEntry)
        .select()
        .single();

      if (error) {
        console.error('Error adding raw gold ledger entry:', error);
        return { entry: null, error: error.message };
      }

      return { entry: this.convertToApp(data), error: null };
    } catch (error) {
      console.error('Unexpected error adding raw gold ledger entry:', error);
      return { entry: null, error: 'An unexpected error occurred' };
    }
  }

  static async deleteEntry(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const ctx = await this.getUserContext();
      if (!ctx) return { success: false, error: 'User not authenticated' };

      const { error } = await supabase
        .from('raw_gold_ledger')
        .delete()
        .eq('id', id)
        .eq('user_email', ctx.userEmail);

      if (error) {
        console.error('Error deleting raw gold ledger entry:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Unexpected error deleting raw gold ledger entry:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  static async updateByReferenceId(
    referenceId: string,
    updates: Partial<Pick<RawGoldLedgerEntry, 'grossWeight' | 'purity' | 'fineGold' | 'cashAmount' | 'counterpartyName' | 'counterpartyId' | 'transactionDate' | 'notes'>>
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const ctx = await this.getUserContext();
      if (!ctx) return { success: false, error: 'User not authenticated' };

      const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (updates.grossWeight !== undefined) dbUpdates.gross_weight = updates.grossWeight;
      if (updates.purity !== undefined) dbUpdates.purity = updates.purity;
      if (updates.fineGold !== undefined) dbUpdates.fine_gold = updates.fineGold;
      if (updates.cashAmount !== undefined) dbUpdates.cash_amount = updates.cashAmount;
      if (updates.counterpartyName !== undefined) dbUpdates.counterparty_name = updates.counterpartyName;
      if (updates.counterpartyId !== undefined) dbUpdates.counterparty_id = updates.counterpartyId;
      if (updates.transactionDate !== undefined) dbUpdates.transaction_date = updates.transactionDate;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { error } = await supabase
        .from('raw_gold_ledger')
        .update(dbUpdates)
        .eq('reference_id', referenceId)
        .eq('user_email', ctx.userEmail);

      if (error) {
        console.error('Error updating raw gold ledger entry:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Unexpected error updating raw gold ledger entry:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  static async deleteByReferenceId(referenceId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const ctx = await this.getUserContext();
      if (!ctx) return { success: false, error: 'User not authenticated' };

      const { error } = await supabase
        .from('raw_gold_ledger')
        .delete()
        .eq('reference_id', referenceId)
        .eq('user_email', ctx.userEmail);

      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  static async getBalance(): Promise<{ balance: number; error: string | null }> {
    try {
      const ctx = await this.getUserContext();
      if (!ctx) return { balance: 0, error: 'User not authenticated' };

      const { data, error } = await supabase
        .from('raw_gold_ledger')
        .select('type, fine_gold')
        .eq('user_email', ctx.userEmail);

      if (error) return { balance: 0, error: error.message };

      let balance = 0;
      for (const entry of data) {
        const fineGold = Number(entry.fine_gold);
        if (entry.type === 'in') {
          balance += fineGold;
        } else {
          balance -= fineGold;
        }
      }

      return { balance, error: null };
    } catch (error) {
      return { balance: 0, error: 'An unexpected error occurred' };
    }
  }

  static async getEntriesForCounterparty(counterpartyId: string): Promise<{ entries: RawGoldLedgerEntry[]; error: string | null }> {
    try {
      const ctx = await this.getUserContext();
      if (!ctx) return { entries: [], error: 'User not authenticated' };

      const { data, error } = await supabase
        .from('raw_gold_ledger')
        .select('*')
        .eq('user_email', ctx.userEmail)
        .eq('counterparty_id', counterpartyId)
        .order('transaction_date', { ascending: false });

      if (error) return { entries: [], error: error.message };
      return { entries: data.map(this.convertToApp), error: null };
    } catch (error) {
      return { entries: [], error: 'An unexpected error occurred' };
    }
  }
}

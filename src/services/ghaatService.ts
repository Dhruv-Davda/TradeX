import { supabase } from '../lib/supabase';
import { GhaatTransaction } from '../types';

export interface DatabaseGhaatTransaction {
  id: string;
  user_id: string;
  user_email: string;
  type: string;
  karigar_id: string | null;
  karigar_name: string | null;
  merchant_id: string | null;
  merchant_name: string | null;
  category: string;
  units: number;
  gross_weight_per_unit: number;
  purity: number;
  total_gross_weight: number;
  fine_gold: number;
  labor_type: string | null;
  labor_amount: number;
  amount_received: number | null;
  notes: string | null;
  transaction_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface GhaatStockItem {
  category: string;
  units: number;
  totalGrossWeight: number;
  totalFineGold: number;
}

export interface GhaatPnL {
  totalBuyFineGold: number;
  totalSellFineGold: number;
  goldLaborPaid: number;
  cashLaborPaid: number;
  netGoldProfit: number;
}

export class GhaatService {
  static convertToApp(db: DatabaseGhaatTransaction): GhaatTransaction {
    return {
      id: db.id,
      type: db.type as 'buy' | 'sell',
      karigarId: db.karigar_id || undefined,
      karigarName: db.karigar_name || undefined,
      merchantId: db.merchant_id || undefined,
      merchantName: db.merchant_name || undefined,
      category: db.category,
      units: db.units,
      grossWeightPerUnit: Number(db.gross_weight_per_unit),
      purity: Number(db.purity),
      totalGrossWeight: Number(db.total_gross_weight),
      fineGold: Number(db.fine_gold),
      laborType: (db.labor_type as 'cash' | 'gold') || undefined,
      laborAmount: db.labor_amount ? Number(db.labor_amount) : undefined,
      amountReceived: db.amount_received ? Number(db.amount_received) : undefined,
      notes: db.notes || undefined,
      transactionDate: db.transaction_date || undefined,
      createdAt: new Date(db.created_at),
      updatedAt: new Date(db.updated_at),
    };
  }

  static convertToDatabase(txn: GhaatTransaction, userId: string, userEmail: string): Omit<DatabaseGhaatTransaction, 'id' | 'created_at' | 'updated_at'> {
    return {
      user_id: userId,
      user_email: userEmail,
      type: txn.type,
      karigar_id: txn.karigarId || null,
      karigar_name: txn.karigarName || null,
      merchant_id: txn.merchantId || null,
      merchant_name: txn.merchantName || null,
      category: txn.category,
      units: txn.units,
      gross_weight_per_unit: txn.grossWeightPerUnit,
      purity: txn.purity,
      total_gross_weight: txn.totalGrossWeight,
      fine_gold: txn.fineGold,
      labor_type: txn.laborType || null,
      labor_amount: txn.laborAmount || 0,
      amount_received: txn.amountReceived ?? null,
      notes: txn.notes || null,
      transaction_date: txn.transactionDate || null,
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

  static async getTransactions(): Promise<{ transactions: GhaatTransaction[]; error: string | null }> {
    try {
      const ctx = await this.getUserContext();
      if (!ctx) return { transactions: [], error: 'User not authenticated' };

      const { data, error } = await supabase
        .from('ghaat_transactions')
        .select('*')
        .eq('user_email', ctx.userEmail)
        .order('transaction_date', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching ghaat transactions:', error);
        return { transactions: [], error: error.message };
      }

      return { transactions: data.map(this.convertToApp), error: null };
    } catch (error) {
      console.error('Unexpected error fetching ghaat transactions:', error);
      return { transactions: [], error: 'An unexpected error occurred' };
    }
  }

  static async addTransaction(txn: Omit<GhaatTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ transaction: GhaatTransaction | null; error: string | null }> {
    try {
      const ctx = await this.getUserContext();
      if (!ctx) return { transaction: null, error: 'User not authenticated' };

      const dbTxn = this.convertToDatabase(
        { ...txn, id: '', createdAt: new Date(), updatedAt: new Date() },
        ctx.userId,
        ctx.userEmail
      );

      const { data, error } = await supabase
        .from('ghaat_transactions')
        .insert(dbTxn)
        .select()
        .single();

      if (error) {
        console.error('Error adding ghaat transaction:', error);
        return { transaction: null, error: error.message };
      }

      return { transaction: this.convertToApp(data), error: null };
    } catch (error) {
      console.error('Unexpected error adding ghaat transaction:', error);
      return { transaction: null, error: 'An unexpected error occurred' };
    }
  }

  static async updateTransaction(id: string, updates: Partial<GhaatTransaction>): Promise<{ transaction: GhaatTransaction | null; error: string | null }> {
    try {
      const ctx = await this.getUserContext();
      if (!ctx) return { transaction: null, error: 'User not authenticated' };

      const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.units !== undefined) dbUpdates.units = updates.units;
      if (updates.grossWeightPerUnit !== undefined) dbUpdates.gross_weight_per_unit = updates.grossWeightPerUnit;
      if (updates.purity !== undefined) dbUpdates.purity = updates.purity;
      if (updates.totalGrossWeight !== undefined) dbUpdates.total_gross_weight = updates.totalGrossWeight;
      if (updates.fineGold !== undefined) dbUpdates.fine_gold = updates.fineGold;
      if (updates.laborType !== undefined) dbUpdates.labor_type = updates.laborType;
      if (updates.laborAmount !== undefined) dbUpdates.labor_amount = updates.laborAmount;
      if (updates.amountReceived !== undefined) dbUpdates.amount_received = updates.amountReceived;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.transactionDate !== undefined) dbUpdates.transaction_date = updates.transactionDate;

      const { data, error } = await supabase
        .from('ghaat_transactions')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_email', ctx.userEmail)
        .select()
        .single();

      if (error) {
        console.error('Error updating ghaat transaction:', error);
        return { transaction: null, error: error.message };
      }

      return { transaction: this.convertToApp(data), error: null };
    } catch (error) {
      console.error('Unexpected error updating ghaat transaction:', error);
      return { transaction: null, error: 'An unexpected error occurred' };
    }
  }

  static async deleteTransaction(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const ctx = await this.getUserContext();
      if (!ctx) return { success: false, error: 'User not authenticated' };

      const { error } = await supabase
        .from('ghaat_transactions')
        .delete()
        .eq('id', id)
        .eq('user_email', ctx.userEmail);

      if (error) {
        console.error('Error deleting ghaat transaction:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Unexpected error deleting ghaat transaction:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  static calculateStock(transactions: GhaatTransaction[]): GhaatStockItem[] {
    const stockMap = new Map<string, { units: number; totalGrossWeight: number; totalFineGold: number }>();

    for (const txn of transactions) {
      const existing = stockMap.get(txn.category) || { units: 0, totalGrossWeight: 0, totalFineGold: 0 };

      if (txn.type === 'buy') {
        existing.units += txn.units;
        existing.totalGrossWeight += txn.totalGrossWeight;
        existing.totalFineGold += txn.fineGold;
      } else {
        existing.units -= txn.units;
        existing.totalGrossWeight -= txn.totalGrossWeight;
        existing.totalFineGold -= txn.fineGold;
      }

      stockMap.set(txn.category, existing);
    }

    const result: GhaatStockItem[] = [];
    stockMap.forEach((value, category) => {
      result.push({ category, ...value });
    });

    return result.sort((a, b) => a.category.localeCompare(b.category));
  }

  static calculatePnL(transactions: GhaatTransaction[]): GhaatPnL {
    let totalBuyFineGold = 0;
    let totalSellFineGold = 0;
    let goldLaborPaid = 0;
    let cashLaborPaid = 0;

    for (const txn of transactions) {
      if (txn.type === 'buy') {
        totalBuyFineGold += txn.fineGold;
        if (txn.laborType === 'gold' && txn.laborAmount) {
          goldLaborPaid += txn.laborAmount;
        } else if (txn.laborType === 'cash' && txn.laborAmount) {
          cashLaborPaid += txn.laborAmount;
        }
      } else {
        totalSellFineGold += txn.fineGold;
      }
    }

    // Net gold profit = fine gold charged to customers - fine gold given to karigars - gold labor
    const netGoldProfit = totalSellFineGold - totalBuyFineGold - goldLaborPaid;

    return { totalBuyFineGold, totalSellFineGold, goldLaborPaid, cashLaborPaid, netGoldProfit };
  }
}

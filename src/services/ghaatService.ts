import { supabase } from '../lib/supabase';
import { GhaatTransaction, GhaatSettlementType, PendingGhaatSaleGroup } from '../types';

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
  // Payment to karigar columns (buy transactions)
  gold_given_weight: number | null;
  gold_given_purity: number | null;
  gold_given_fine: number | null;
  cash_paid: number | null;
  // Pending/Sold status flow columns
  status: string | null;
  group_id: string | null;
  rate_per_10gm: number | null;
  total_amount: number | null;
  settlement_type: string | null;
  gold_returned_weight: number | null;
  gold_returned_purity: number | null;
  gold_returned_fine: number | null;
  cash_received: number | null;
  confirmed_date: string | null;
  confirmed_units: number | null;
  confirmed_gross_weight: number | null;
  confirmed_fine_gold: number | null;
  dues_shortfall: number | null;
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

export interface GhaatMonthlyProfit {
  month: string;
  // Stock delta method
  startFineGold: number;
  endFineGold: number;
  stockDeltaProfit: number;
  // Transaction-based method
  buyFineGold: number;
  sellFineGold: number;
  laborGold: number;
  transactionProfit: number;
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
      // Payment to karigar fields
      goldGivenWeight: db.gold_given_weight ? Number(db.gold_given_weight) : undefined,
      goldGivenPurity: db.gold_given_purity ? Number(db.gold_given_purity) : undefined,
      goldGivenFine: db.gold_given_fine ? Number(db.gold_given_fine) : undefined,
      cashPaid: db.cash_paid ? Number(db.cash_paid) : undefined,
      // Pending/Sold fields
      status: (db.status as 'pending' | 'sold') || undefined,
      groupId: db.group_id || undefined,
      ratePer10gm: db.rate_per_10gm ? Number(db.rate_per_10gm) : undefined,
      totalAmount: db.total_amount ? Number(db.total_amount) : undefined,
      settlementType: (db.settlement_type as GhaatSettlementType) || undefined,
      goldReturnedWeight: db.gold_returned_weight ? Number(db.gold_returned_weight) : undefined,
      goldReturnedPurity: db.gold_returned_purity ? Number(db.gold_returned_purity) : undefined,
      goldReturnedFine: db.gold_returned_fine ? Number(db.gold_returned_fine) : undefined,
      cashReceived: db.cash_received ? Number(db.cash_received) : undefined,
      confirmedDate: db.confirmed_date || undefined,
      confirmedUnits: db.confirmed_units ? Number(db.confirmed_units) : undefined,
      confirmedGrossWeight: db.confirmed_gross_weight ? Number(db.confirmed_gross_weight) : undefined,
      confirmedFineGold: db.confirmed_fine_gold ? Number(db.confirmed_fine_gold) : undefined,
      duesShortfall: db.dues_shortfall ? Number(db.dues_shortfall) : undefined,
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
      // Payment to karigar fields
      gold_given_weight: txn.goldGivenWeight ?? null,
      gold_given_purity: txn.goldGivenPurity ?? null,
      gold_given_fine: txn.goldGivenFine ?? null,
      cash_paid: txn.cashPaid ?? null,
      // Pending/Sold fields
      status: txn.status || null,
      group_id: txn.groupId || null,
      rate_per_10gm: txn.ratePer10gm ?? null,
      total_amount: txn.totalAmount ?? null,
      settlement_type: txn.settlementType || null,
      gold_returned_weight: txn.goldReturnedWeight ?? null,
      gold_returned_purity: txn.goldReturnedPurity ?? null,
      gold_returned_fine: txn.goldReturnedFine ?? null,
      cash_received: txn.cashReceived ?? null,
      confirmed_date: txn.confirmedDate || null,
      confirmed_units: txn.confirmedUnits ?? null,
      confirmed_gross_weight: txn.confirmedGrossWeight ?? null,
      confirmed_fine_gold: txn.confirmedFineGold ?? null,
      dues_shortfall: txn.duesShortfall ?? null,
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
      // Payment to karigar fields
      if (updates.goldGivenWeight !== undefined) dbUpdates.gold_given_weight = updates.goldGivenWeight;
      if (updates.goldGivenPurity !== undefined) dbUpdates.gold_given_purity = updates.goldGivenPurity;
      if (updates.goldGivenFine !== undefined) dbUpdates.gold_given_fine = updates.goldGivenFine;
      if (updates.cashPaid !== undefined) dbUpdates.cash_paid = updates.cashPaid;
      // Pending/Sold fields
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.groupId !== undefined) dbUpdates.group_id = updates.groupId;
      if (updates.ratePer10gm !== undefined) dbUpdates.rate_per_10gm = updates.ratePer10gm;
      if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount;
      if (updates.settlementType !== undefined) dbUpdates.settlement_type = updates.settlementType;
      if (updates.goldReturnedWeight !== undefined) dbUpdates.gold_returned_weight = updates.goldReturnedWeight;
      if (updates.goldReturnedPurity !== undefined) dbUpdates.gold_returned_purity = updates.goldReturnedPurity;
      if (updates.goldReturnedFine !== undefined) dbUpdates.gold_returned_fine = updates.goldReturnedFine;
      if (updates.cashReceived !== undefined) dbUpdates.cash_received = updates.cashReceived;
      if (updates.confirmedDate !== undefined) dbUpdates.confirmed_date = updates.confirmedDate;
      if (updates.confirmedUnits !== undefined) dbUpdates.confirmed_units = updates.confirmedUnits;
      if (updates.confirmedGrossWeight !== undefined) dbUpdates.confirmed_gross_weight = updates.confirmedGrossWeight;
      if (updates.confirmedFineGold !== undefined) dbUpdates.confirmed_fine_gold = updates.confirmedFineGold;
      if (updates.duesShortfall !== undefined) dbUpdates.dues_shortfall = updates.duesShortfall;

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

      // Delete any linked raw gold ledger entries
      await supabase
        .from('raw_gold_ledger')
        .delete()
        .eq('reference_id', id)
        .eq('user_email', ctx.userEmail);

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

  static async getPendingSales(): Promise<{ groups: PendingGhaatSaleGroup[]; error: string | null }> {
    try {
      const ctx = await this.getUserContext();
      if (!ctx) return { groups: [], error: 'User not authenticated' };

      const { data, error } = await supabase
        .from('ghaat_transactions')
        .select('*')
        .eq('user_email', ctx.userEmail)
        .eq('type', 'sell')
        .eq('status', 'pending')
        .order('transaction_date', { ascending: false });

      if (error) return { groups: [], error: error.message };

      const transactions = data.map(this.convertToApp);

      // Group by group_id
      const groupMap = new Map<string, GhaatTransaction[]>();
      for (const txn of transactions) {
        const key = txn.groupId || txn.id;
        const arr = groupMap.get(key) || [];
        arr.push(txn);
        groupMap.set(key, arr);
      }

      const groups: PendingGhaatSaleGroup[] = [];
      groupMap.forEach((items, groupId) => {
        const first = items[0];
        groups.push({
          groupId,
          merchantId: first.merchantId || '',
          merchantName: first.merchantName || '',
          dateGiven: first.transactionDate || '',
          items,
          totalUnits: items.reduce((s, i) => s + i.units, 0),
          totalGrossWeight: items.reduce((s, i) => s + i.totalGrossWeight, 0),
          totalFineGold: items.reduce((s, i) => s + i.fineGold, 0),
        });
      });

      return { groups, error: null };
    } catch (error) {
      return { groups: [], error: 'An unexpected error occurred' };
    }
  }

  static async confirmSale(params: {
    groupId: string;
    confirmedItems: Array<{
      transactionId: string;
      confirmedUnits: number;
      confirmedGrossWeight: number;
      confirmedFineGold: number;
      returnedUnits: number;
      originalPurity: number;
      originalGrossWeightPerUnit: number;
      originalCategory: string;
      originalMerchantId: string;
      originalMerchantName: string;
    }>;
    ratePer10gm: number;
    settlementType: GhaatSettlementType;
    goldReturnedWeight?: number;
    goldReturnedPurity?: number;
    cashReceived?: number;
    confirmedDate: string;
  }): Promise<{ success: boolean; duesShortfall: number; error: string | null }> {
    try {
      const ctx = await this.getUserContext();
      if (!ctx) return { success: false, duesShortfall: 0, error: 'User not authenticated' };

      // Calculate totals
      const totalConfirmedFineGold = params.confirmedItems.reduce(
        (s, i) => s + i.confirmedFineGold, 0
      );
      const totalAmount = totalConfirmedFineGold * params.ratePer10gm / 10;

      // Calculate gold returned fine value
      const goldReturnedFine = (params.goldReturnedWeight && params.goldReturnedPurity)
        ? params.goldReturnedWeight * params.goldReturnedPurity / 100
        : 0;
      const goldReturnedValue = goldReturnedFine * params.ratePer10gm / 10;

      const cashReceived = params.cashReceived || 0;
      const totalReceived = goldReturnedValue + cashReceived;
      const duesShortfall = Math.max(0, totalAmount - totalReceived);

      // Update each line item to sold
      for (const item of params.confirmedItems) {
        const itemTotalAmount = item.confirmedFineGold * params.ratePer10gm / 10;
        const { error } = await supabase
          .from('ghaat_transactions')
          .update({
            status: 'sold',
            rate_per_10gm: params.ratePer10gm,
            total_amount: itemTotalAmount,
            settlement_type: params.settlementType,
            gold_returned_weight: params.goldReturnedWeight ?? null,
            gold_returned_purity: params.goldReturnedPurity ?? null,
            gold_returned_fine: goldReturnedFine || null,
            cash_received: cashReceived || null,
            confirmed_date: params.confirmedDate,
            confirmed_units: item.confirmedUnits,
            confirmed_gross_weight: item.confirmedGrossWeight,
            confirmed_fine_gold: item.confirmedFineGold,
            dues_shortfall: params.confirmedItems.length > 0 ? duesShortfall / params.confirmedItems.length : 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.transactionId)
          .eq('user_email', ctx.userEmail);

        if (error) return { success: false, duesShortfall: 0, error: error.message };

        // Handle returned items: create buy-back transaction for returned pieces
        if (item.returnedUnits > 0) {
          const returnedGrossWeight = item.originalGrossWeightPerUnit * item.returnedUnits;
          const returnedFineGold = returnedGrossWeight * item.originalPurity / 100;

          await supabase
            .from('ghaat_transactions')
            .insert({
              user_id: ctx.userId,
              user_email: ctx.userEmail,
              type: 'buy',
              merchant_id: item.originalMerchantId,
              merchant_name: item.originalMerchantName,
              category: item.originalCategory,
              units: item.returnedUnits,
              gross_weight_per_unit: item.originalGrossWeightPerUnit,
              purity: item.originalPurity,
              total_gross_weight: returnedGrossWeight,
              fine_gold: returnedFineGold,
              labor_type: null,
              labor_amount: 0,
              notes: `Returned from pending sale (group: ${params.groupId})`,
              transaction_date: params.confirmedDate,
              status: null,
              group_id: null,
            });
        }
      }

      // Create raw gold ledger entry for gold received from merchant
      if (goldReturnedFine > 0) {
        const firstItem = params.confirmedItems[0];
        await supabase
          .from('raw_gold_ledger')
          .insert({
            user_id: ctx.userId,
            user_email: ctx.userEmail,
            type: 'in',
            source: 'merchant_return',
            reference_id: params.groupId,
            gross_weight: params.goldReturnedWeight,
            purity: params.goldReturnedPurity,
            fine_gold: goldReturnedFine,
            counterparty_name: firstItem?.originalMerchantName || '',
            counterparty_id: firstItem?.originalMerchantId || '',
            notes: `Gold returned from merchant sale (group: ${params.groupId})`,
            transaction_date: params.confirmedDate,
          });
      }

      return { success: true, duesShortfall, error: null };
    } catch (error) {
      return { success: false, duesShortfall: 0, error: 'An unexpected error occurred' };
    }
  }

  // Stock calculation: buy = +stock, sell (pending or sold) = -stock
  // Returned items are tracked as separate type='buy' transactions
  static calculateStock(transactions: GhaatTransaction[]): GhaatStockItem[] {
    const stockMap = new Map<string, { units: number; totalGrossWeight: number; totalFineGold: number }>();

    for (const txn of transactions) {
      const existing = stockMap.get(txn.category) || { units: 0, totalGrossWeight: 0, totalFineGold: 0 };

      if (txn.type === 'buy') {
        existing.units += txn.units;
        existing.totalGrossWeight += txn.totalGrossWeight;
        existing.totalFineGold += txn.fineGold;
      } else {
        // Sell transactions (both pending and sold) reduce stock
        // because items leave our hands when given to merchant (pending)
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

  // P&L: only count sold (confirmed) sells, NOT pending
  static calculatePnL(transactions: GhaatTransaction[]): GhaatPnL {
    let totalBuyFineGold = 0;
    let totalSellFineGold = 0;
    let goldLaborPaid = 0;
    let cashLaborPaid = 0;

    for (const txn of transactions) {
      if (txn.type === 'buy') {
        // Only count karigar buys in cost (not merchant returns)
        if (txn.karigarId || (!txn.karigarId && !txn.merchantId)) {
          totalBuyFineGold += txn.fineGold;
          if (txn.laborType === 'gold' && txn.laborAmount) {
            goldLaborPaid += txn.laborAmount;
          } else if (txn.laborType === 'cash' && txn.laborAmount) {
            cashLaborPaid += txn.laborAmount;
          }
        }
      } else {
        // Only count sold transactions in P&L (not pending)
        if (txn.status === 'sold') {
          totalSellFineGold += txn.confirmedFineGold || txn.fineGold;
        } else if (!txn.status) {
          // Legacy sell transactions without status — count as before
          totalSellFineGold += txn.fineGold;
        }
      }
    }

    const netGoldProfit = totalSellFineGold - totalBuyFineGold - goldLaborPaid;
    return { totalBuyFineGold, totalSellFineGold, goldLaborPaid, cashLaborPaid, netGoldProfit };
  }

  // Monthly profit using both stock delta and transaction-based methods
  static calculateMonthlyProfit(transactions: GhaatTransaction[]): GhaatMonthlyProfit[] {
    const sorted = [...transactions].sort((a, b) => {
      const dateA = a.transactionDate || a.createdAt.toISOString().split('T')[0];
      const dateB = b.transactionDate || b.createdAt.toISOString().split('T')[0];
      return dateA.localeCompare(dateB);
    });

    // Group by month
    const monthMap = new Map<string, GhaatTransaction[]>();
    for (const txn of sorted) {
      const date = txn.transactionDate || txn.createdAt.toISOString().split('T')[0];
      const month = date.substring(0, 7);
      const arr = monthMap.get(month) || [];
      arr.push(txn);
      monthMap.set(month, arr);
    }

    let runningFineGold = 0;
    const results: GhaatMonthlyProfit[] = [];

    const months = Array.from(monthMap.keys()).sort();
    for (const month of months) {
      const txns = monthMap.get(month)!;
      const startFineGold = runningFineGold;

      let buyFineGold = 0;
      let sellFineGold = 0;
      let laborGold = 0;

      for (const txn of txns) {
        if (txn.type === 'buy') {
          runningFineGold += txn.fineGold;
          if (txn.karigarId || (!txn.karigarId && !txn.merchantId)) {
            buyFineGold += txn.fineGold;
            if (txn.laborType === 'gold' && txn.laborAmount) {
              laborGold += txn.laborAmount;
            }
          }
        } else if (txn.type === 'sell') {
          runningFineGold -= txn.fineGold;
          if (txn.status === 'sold' || !txn.status) {
            sellFineGold += txn.confirmedFineGold || txn.fineGold;
          }
        }
      }

      results.push({
        month,
        startFineGold,
        endFineGold: runningFineGold,
        stockDeltaProfit: runningFineGold - startFineGold,
        buyFineGold,
        sellFineGold,
        laborGold,
        transactionProfit: sellFineGold - buyFineGold - laborGold,
      });
    }

    return results;
  }

  // Calculate jewellery-related dues for a merchant
  static calculateMerchantJewelleryDues(
    merchantId: string,
    transactions: GhaatTransaction[]
  ): { fineGoldPending: number; cashDue: number } {
    let cashDue = 0;

    // Cash dues from confirmed sells with shortfall
    const soldTxns = transactions.filter(
      t => t.merchantId === merchantId && t.type === 'sell' && t.status === 'sold'
    );
    for (const txn of soldTxns) {
      cashDue += txn.duesShortfall || 0;
    }

    // Fine gold pending = total fine gold in pending sells for this merchant
    const pendingTxns = transactions.filter(
      t => t.merchantId === merchantId && t.type === 'sell' && t.status === 'pending'
    );
    const fineGoldPending = pendingTxns.reduce((s, t) => s + t.fineGold, 0);

    return { fineGoldPending, cashDue };
  }
}

import { supabase } from '../lib/supabase';
import { GhaatSettlement, GhaatPartyType, GhaatSettlementDirection, GhaatTransaction } from '../types';
import { RawGoldLedgerService } from './rawGoldLedgerService';

interface DatabaseGhaatSettlement {
  id: string;
  user_id: string;
  user_email: string;
  party_type: string;
  party_id: string;
  party_name: string;
  direction: string;
  cash_amount: number;
  gold_weight: number;
  gold_purity: number;
  gold_fine: number;
  rate_per_10gm: number | null;
  gold_value: number | null;
  notes: string | null;
  settlement_date: string;
  created_at: string;
  updated_at: string;
}

export interface MerchantGhaatBalance {
  fineGoldPending: number;
  cashDue: number;
  cashSettled: number;
  goldSettled: number;
  netCashDue: number;
}

export interface KarigarGhaatBalance {
  jewelleryReceived: number;
  goldGiven: number;
  cashPaid: number;
  goldSettled: number;
  cashSettled: number;
  netGoldBalance: number;
}

export class GhaatSettlementService {
  static convertToApp(db: DatabaseGhaatSettlement): GhaatSettlement {
    return {
      id: db.id,
      partyType: db.party_type as GhaatPartyType,
      partyId: db.party_id,
      partyName: db.party_name,
      direction: db.direction as GhaatSettlementDirection,
      cashAmount: Number(db.cash_amount) || 0,
      goldWeight: Number(db.gold_weight) || 0,
      goldPurity: Number(db.gold_purity) || 0,
      goldFine: Number(db.gold_fine) || 0,
      ratePer10gm: db.rate_per_10gm ? Number(db.rate_per_10gm) : undefined,
      goldValue: db.gold_value ? Number(db.gold_value) : undefined,
      notes: db.notes || undefined,
      settlementDate: db.settlement_date,
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

  static async getSettlements(): Promise<{ settlements: GhaatSettlement[]; error: string | null }> {
    try {
      const ctx = await this.getUserContext();
      if (!ctx) return { settlements: [], error: 'User not authenticated' };

      const { data, error } = await supabase
        .from('ghaat_settlements')
        .select('*')
        .eq('user_email', ctx.userEmail)
        .order('settlement_date', { ascending: false });

      if (error) return { settlements: [], error: error.message };
      return { settlements: data.map(this.convertToApp), error: null };
    } catch {
      return { settlements: [], error: 'An unexpected error occurred' };
    }
  }

  static async addSettlement(data: Omit<GhaatSettlement, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ settlement: GhaatSettlement | null; error: string | null }> {
    try {
      const ctx = await this.getUserContext();
      if (!ctx) return { settlement: null, error: 'User not authenticated' };

      const { data: inserted, error } = await supabase
        .from('ghaat_settlements')
        .insert({
          user_id: ctx.userId,
          user_email: ctx.userEmail,
          party_type: data.partyType,
          party_id: data.partyId,
          party_name: data.partyName,
          direction: data.direction,
          cash_amount: data.cashAmount || 0,
          gold_weight: data.goldWeight || 0,
          gold_purity: data.goldPurity || 0,
          gold_fine: data.goldFine || 0,
          rate_per_10gm: data.ratePer10gm ?? null,
          gold_value: data.goldValue ?? null,
          notes: data.notes || null,
          settlement_date: data.settlementDate,
        })
        .select()
        .single();

      if (error) return { settlement: null, error: error.message };

      const settlement = this.convertToApp(inserted);

      // Create raw gold ledger entry if gold is involved
      if (data.goldFine > 0) {
        const ledgerType = data.direction === 'receiving' ? 'in' : 'out';
        await RawGoldLedgerService.addEntry({
          type: ledgerType,
          source: 'ghaat_settlement',
          referenceId: settlement.id,
          grossWeight: data.goldWeight,
          purity: data.goldPurity,
          fineGold: data.goldFine,
          cashAmount: data.cashAmount || undefined,
          counterpartyName: data.partyName,
          counterpartyId: data.partyId,
          transactionDate: data.settlementDate,
          notes: `Ghaat settlement (${data.direction}) with ${data.partyType}: ${data.partyName}`,
        });
      }

      return { settlement, error: null };
    } catch {
      return { settlement: null, error: 'An unexpected error occurred' };
    }
  }

  static async deleteSettlement(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const ctx = await this.getUserContext();
      if (!ctx) return { success: false, error: 'User not authenticated' };

      // Delete linked raw gold ledger entries
      await supabase
        .from('raw_gold_ledger')
        .delete()
        .eq('reference_id', id)
        .eq('user_email', ctx.userEmail);

      const { error } = await supabase
        .from('ghaat_settlements')
        .delete()
        .eq('id', id)
        .eq('user_email', ctx.userEmail);

      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Balance calculations

  static calculateMerchantGhaatBalance(
    merchantId: string,
    transactions: GhaatTransaction[],
    settlements: GhaatSettlement[]
  ): MerchantGhaatBalance {
    // Cash due from confirmed sale shortfalls
    let cashDue = 0;
    let fineGoldPending = 0;

    for (const t of transactions) {
      if (t.merchantId !== merchantId) continue;
      if (t.type === 'sell' && t.status === 'sold' && t.duesShortfall) {
        cashDue += t.duesShortfall;
      }
      if (t.type === 'sell' && t.status === 'pending') {
        fineGoldPending += t.fineGold;
      }
    }

    // Settlements with this merchant
    let cashSettled = 0;
    let goldSettled = 0;

    for (const s of settlements) {
      if (s.partyType !== 'merchant' || s.partyId !== merchantId) continue;
      if (s.direction === 'receiving') {
        cashSettled += s.cashAmount;
        goldSettled += s.goldFine;
      } else {
        // paying = advance to merchant, increases what they owe
        cashSettled -= s.cashAmount;
        goldSettled -= s.goldFine;
      }
    }

    return {
      fineGoldPending,
      cashDue,
      cashSettled,
      goldSettled,
      netCashDue: cashDue - cashSettled,
    };
  }

  static calculateKarigarGhaatBalance(
    karigarId: string,
    transactions: GhaatTransaction[],
    settlements: GhaatSettlement[]
  ): KarigarGhaatBalance {
    let jewelleryReceived = 0;
    let goldGiven = 0;
    let cashPaid = 0;

    for (const t of transactions) {
      if (t.karigarId !== karigarId || t.type !== 'buy') continue;
      jewelleryReceived += t.fineGold;
      if (t.goldGivenFine) goldGiven += t.goldGivenFine;
      if (t.cashPaid) cashPaid += t.cashPaid;
    }

    // Settlements with this karigar
    let goldSettled = 0;
    let cashSettled = 0;

    for (const s of settlements) {
      if (s.partyType !== 'karigar' || s.partyId !== karigarId) continue;
      if (s.direction === 'paying') {
        // We pay karigar
        goldSettled += s.goldFine;
        cashSettled += s.cashAmount;
      } else {
        // Karigar returns to us
        goldSettled -= s.goldFine;
        cashSettled -= s.cashAmount;
      }
    }

    return {
      jewelleryReceived,
      goldGiven,
      cashPaid,
      goldSettled,
      cashSettled,
      netGoldBalance: jewelleryReceived - goldGiven - goldSettled,
    };
  }
}

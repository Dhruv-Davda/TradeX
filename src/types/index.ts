export interface User {
  id: string;
  email: string;
  businessName: string;
  phoneNumber: string;
  createdAt: Date;
}

export interface Merchant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  totalDue: number;
  totalOwe: number;
  createdAt: Date;
  updatedAt: Date;
}

export type MetalType = 'gold' | 'silver';
export type PaymentType = 'cash' | 'bank_transfer';
export type SettlementType = 'cash' | 'bank' | 'bill' | 'gold' | 'silver';
export type TradeType = 'buy' | 'sell' | 'transfer' | 'settlement';

export interface Trade {
  id: string;
  type: TradeType;
  merchantId: string;
  merchantName: string;
  metalType?: MetalType;
  weight?: number;
  pricePerUnit?: number;
  totalAmount: number;
  amountPaid?: number;
  amountReceived?: number;
  laborCharges?: number;
  paymentType?: PaymentType;
  settlementType?: SettlementType;
  settlementDirection?: 'receiving' | 'paying';
  pickupLocation?: string;
  dropLocation?: string;
  transferCharges?: number;
  notes?: string;
  tradeDate?: string;
  createdAt: Date;
  updatedAt: Date;
  // Additional properties used in the code
  quantity?: number;
  rate?: number;
  amount?: number;
  partyName?: string;
  partyPhone?: string;
  partyAddress?: string;
  date?: string;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: Date;
  paymentType: PaymentType;
  createdAt: Date;
}

export interface Income {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: Date;
  paymentType: PaymentType;
  createdAt: Date;
}

export interface Stock {
  id: string;
  metalType: MetalType;
  quantity: number; // in grams for gold, kg for silver
  unit: 'grams' | 'kg';
  lastUpdated: Date;
  notes?: string;
}

// Ghaat (Jewellery) types
export type GhaatTransactionType = 'buy' | 'sell';
export type LaborType = 'cash' | 'gold';
export type GhaatSellStatus = 'pending' | 'sold';
export type GhaatSettlementType = 'gold' | 'cash' | 'mixed';

export interface Karigar {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GhaatTransaction {
  id: string;
  type: GhaatTransactionType;
  karigarId?: string;
  karigarName?: string;
  merchantId?: string;
  merchantName?: string;
  category: string;
  units: number;
  grossWeightPerUnit: number;
  purity: number;
  totalGrossWeight: number;
  fineGold: number;
  laborType?: LaborType;
  laborAmount?: number;
  amountReceived?: number;
  notes?: string;
  transactionDate?: string;
  createdAt: Date;
  updatedAt: Date;
  // Pending/Sold status flow fields
  status?: GhaatSellStatus;
  groupId?: string;
  ratePer10gm?: number;
  totalAmount?: number;
  settlementType?: GhaatSettlementType;
  goldReturnedWeight?: number;
  goldReturnedPurity?: number;
  goldReturnedFine?: number;
  cashReceived?: number;
  confirmedDate?: string;
  confirmedUnits?: number;
  confirmedGrossWeight?: number;
  confirmedFineGold?: number;
  duesShortfall?: number;
}

export interface PendingGhaatSaleGroup {
  groupId: string;
  merchantId: string;
  merchantName: string;
  dateGiven: string;
  items: GhaatTransaction[];
  totalUnits: number;
  totalGrossWeight: number;
  totalFineGold: number;
}

export interface JewelleryCategory {
  id: string;
  name: string;
  createdAt: Date;
}

export interface Analytics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalDues: number;
  totalOwes: number;
  goldTransactions: number;
  silverTransactions: number;
  monthlyData: {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[];
  categoryExpenses: {
    category: string;
    amount: number;
  }[];
}
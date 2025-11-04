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
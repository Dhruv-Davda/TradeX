import { Trade } from '../types';

export const calculateMerchantBalance = (merchantId: string, trades: Trade[], merchantTotalDue: number = 0): { due: number; owe: number } => {
  const merchantTrades = trades.filter(trade => trade.merchantId === merchantId);
  
  let due = merchantTotalDue; // Start with older dues from merchant
  let owe = 0;

  merchantTrades.forEach((trade, index) => {
    switch (trade.type) {
      case 'buy':
        if (trade.amountPaid !== undefined && trade.totalAmount) {
          const remaining = trade.totalAmount - trade.amountPaid;
          if (remaining > 0) owe += remaining;
        }
        break;
      case 'sell':
        due += trade.totalAmount;
        // Reduce due by amount received (only if amountReceived is provided)
        if (trade.amountReceived !== undefined) {
          due -= trade.amountReceived;
        }
        break;
      case 'settlement':
        if (trade.settlementDirection === 'receiving') {
          // Receiving settlement: reduce what others owe you (reduce due)
          due -= trade.totalAmount;
        } else if (trade.settlementDirection === 'paying') {
          // Paying settlement: reduce what you owe others (reduce owe)
          owe -= trade.totalAmount;
        }
        break;
    }
  });

  // Net-off logic: offset dues and owes against each other
  if (due > 0 && owe > 0) {
    if (due >= owe) {
      // If due amount is greater than or equal to owe amount
      due = due - owe;  // Reduce due by owe amount
      owe = 0;          // Set owe to 0
    } else {
      // If owe amount is greater than due amount
      owe = owe - due;  // Reduce owe by due amount
      due = 0;          // Set due to 0
    }
  }

  return { due: Math.max(0, due), owe: Math.max(0, owe) };
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCurrencyInCR = (amount: number): string => {
  const numAmount = Number(amount);
  
  // Handle very small amounts (less than 1 lakh)
  if (numAmount < 100000) {
    const lakhAmount = numAmount / 100000;
    return `${lakhAmount.toFixed(1)} L`;
  }
  
  // Handle amounts in lakhs (1 lakh to 99 lakhs)
  if (numAmount < 10000000) {
    const lakhAmount = numAmount / 100000;
    return `${lakhAmount.toFixed(1)} L`;
  }
  
  // Handle amounts in crores (1 crore and above)
  const crAmount = numAmount / 10000000;
  
  // For very large amounts, show without decimal
  if (crAmount >= 100) {
    return `${crAmount.toFixed(0)} CR`;
  }
  
  // Default case: show in crores with 1 decimal place
  return `${crAmount.toFixed(1)} CR`;
};

export const formatWeight = (weight: number | string | undefined, metalType: 'gold' | 'silver'): string => {
  const unit = metalType === 'gold' ? 'g' : 'kg';
  const numericWeight = Number(weight) || 0;
  return `${numericWeight.toFixed(2)} ${unit}`;
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
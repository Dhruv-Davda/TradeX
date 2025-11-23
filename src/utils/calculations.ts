import { Trade } from '../types';

export const calculateMerchantBalance = (merchantId: string, trades: Trade[], merchantTotalDue: number = 0, merchantTotalOwe: number = 0): { due: number; owe: number } => {
  const merchantTrades = trades.filter(trade => trade.merchantId === merchantId);
  
  let due = merchantTotalDue; // Start with older dues from merchant
  let owe = merchantTotalOwe; // Start with older advances from merchant
  
  // Process trades in chronological order
  merchantTrades.forEach((trade) => {
    switch (trade.type) {
      case 'buy':
        if (trade.totalAmount) {
          // Treat undefined amountPaid as 0 (no payment made)
          const amountPaid = trade.amountPaid ?? 0;
          const difference = amountPaid - trade.totalAmount;
          
          if (difference < 0) {
            // We paid less than total (or nothing) -> reduce their dues or increase our owes
            const unpaidAmount = Math.abs(difference);
            if (due >= unpaidAmount) {
              // They have enough dues, reduce it
              due -= unpaidAmount;
            } else {
              // They don't have enough dues, so we owe them the remainder
              const remainder = unpaidAmount - due;
              due = 0;
              owe += remainder;
            }
          } else if (difference > 0) {
            // We overpaid -> they owe us the excess (advance)
            due += difference;
          }
        }
        break;
      case 'sell':
        due += trade.totalAmount;
        // Reduce due by amount received (only if amountReceived is provided)
        if (trade.amountReceived !== undefined) {
          due -= trade.amountReceived;
          // If due becomes negative (overpayment), convert excess to owe
          if (due < 0) {
            owe += Math.abs(due); // We owe them the excess amount
            due = 0; // Reset due to 0
          }
        }
        break;
      case 'settlement':
        if (trade.settlementDirection === 'receiving') {
          // Receiving settlement: customer pays us money
          // This reduces what they owe us (due) and if they overpay, we owe them
          if (due > 0) {
            const excess = trade.totalAmount - due;
            due = Math.max(0, due - trade.totalAmount);
            if (excess > 0) {
              owe += excess; // We owe them the excess amount
            }
          } else {
            // No existing dues, so this payment becomes what we owe them
            owe += trade.totalAmount;
          }
        } else if (trade.settlementDirection === 'paying') {
          // Paying settlement: we pay customer money in advance
          // This increases what they owe us (due amount) - they owe us back the advance
          due += trade.totalAmount;
        }
        break;
    }
  });

  // Net-off logic: offset dues and owes against each other
  // This is necessary to handle cases where someone owes us and we owe them
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

  // Final result
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
  return `${numericWeight.toFixed(3)} ${unit}`;
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export interface TradeWithBalance extends Trade {
  runningDues: number;
  runningAdvances: number;
}

/**
 * Calculate running balances (dues and advances) for each trade
 * Uses the EXACT same logic as calculateMerchantBalance, just applied per trade
 * @param merchantId - The merchant ID
 * @param trades - All trades (will be filtered and sorted)
 * @param merchantInitialDue - Initial dues from merchant (merchant.totalDue)
 * @param merchantInitialOwe - Initial advances from merchant (merchant.totalOwe)
 * @returns Array of trades with running balances (newest to oldest for display)
 */
export const calculateTradesWithRunningBalance = (
  merchantId: string,
  trades: Trade[],
  merchantInitialDue: number = 0,
  merchantInitialOwe: number = 0
): TradeWithBalance[] => {
  // Filter and sort trades chronologically (oldest to newest) for calculation
  const merchantTrades = trades
    .filter(trade => trade.merchantId === merchantId)
    .sort((a, b) => {
      const dateA = a.tradeDate ? new Date(a.tradeDate) : new Date(a.createdAt);
      const dateB = b.tradeDate ? new Date(b.tradeDate) : new Date(b.createdAt);
      return dateA.getTime() - dateB.getTime(); // Ascending (oldest first)
    });

  let due = merchantInitialDue; // Start with older dues from merchant
  let owe = merchantInitialOwe; // Start with older advances from merchant

  const tradesWithBalance: TradeWithBalance[] = merchantTrades.map((trade) => {
    // Process the trade using EXACT same logic as calculateMerchantBalance
    switch (trade.type) {
      case 'buy':
        if (trade.totalAmount) {
          // Treat undefined amountPaid as 0 (no payment made)
          const amountPaid = trade.amountPaid ?? 0;
          const difference = amountPaid - trade.totalAmount;
          
          if (difference < 0) {
            // We paid less than total (or nothing) -> reduce their dues or increase our owes
            const unpaidAmount = Math.abs(difference);
            if (due >= unpaidAmount) {
              // They have enough dues, reduce it
              due -= unpaidAmount;
            } else {
              // They don't have enough dues, so we owe them the remainder
              const remainder = unpaidAmount - due;
              due = 0;
              owe += remainder;
            }
          } else if (difference > 0) {
            // We overpaid -> they owe us the excess (advance)
            due += difference;
          }
        }
        break;
      case 'sell':
        due += trade.totalAmount;
        // Reduce due by amount received (only if amountReceived is provided)
        if (trade.amountReceived !== undefined) {
          due -= trade.amountReceived;
          // If due becomes negative (overpayment), convert excess to owe
          if (due < 0) {
            owe += Math.abs(due); // We owe them the excess amount
            due = 0; // Reset due to 0
          }
        }
        break;
      case 'settlement':
        if (trade.settlementDirection === 'receiving') {
          // Receiving settlement: customer pays us money
          // This reduces what they owe us (due) and if they overpay, we owe them
          if (due > 0) {
            const excess = trade.totalAmount - due;
            due = Math.max(0, due - trade.totalAmount);
            if (excess > 0) {
              owe += excess; // We owe them the excess amount
            }
          } else {
            // No existing dues, so this payment becomes what we owe them
            owe += trade.totalAmount;
          }
        } else if (trade.settlementDirection === 'paying') {
          // Paying settlement: we pay customer money in advance
          // This increases what they owe us (due amount) - they owe us back the advance
          due += trade.totalAmount;
        }
        break;
    }

    // Net-off logic: offset dues and owes against each other
    // This is necessary to handle cases where someone owes us and we owe them
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

    // Return trade with running balances (after net-off)
    // Store current values for this trade, then continue with updated values for next trade
    const currentDue = Math.max(0, due);
    const currentOwe = Math.max(0, owe);
    
    return {
      ...trade,
      runningDues: currentDue,
      runningAdvances: currentOwe,
    };
  });

  // Reverse the array to display newest to oldest
  return tradesWithBalance.reverse();
};
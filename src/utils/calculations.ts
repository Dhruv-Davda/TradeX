import { Trade } from '../types';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';

export const calculateMerchantBalance = (merchantId: string, trades: Trade[], merchantTotalDue: number = 0, merchantTotalOwe: number = 0): { due: number; owe: number } => {
  const merchantTrades = trades.filter(trade => trade.merchantId === merchantId);
  
  let due = merchantTotalDue; // Start with older dues from merchant
  let owe = merchantTotalOwe; // Start with older advances from merchant (THIS WAS THE BUG - was 0!)
  
  // Process trades in chronological order
  merchantTrades.forEach((trade) => {
    switch (trade.type) {
      case 'buy':
        // We bought from merchant - merchant owes us or we owe merchant
        const amountPaid = trade.amountPaid ?? 0;
        const buyTotalAmount = trade.totalAmount || 0;
        
        // Calculate what this trade creates
        let buyDues = 0;
        let buyAdvances = 0;
        
        if (amountPaid < buyTotalAmount) {
          // We paid less than total → Merchant owes us (Dues)
          buyDues = buyTotalAmount - amountPaid;
        } else if (amountPaid > buyTotalAmount) {
          // We paid more than total → We owe merchant (Advance)
          buyAdvances = amountPaid - buyTotalAmount;
        }
        
        // Apply to running balance - reduce advances first if we have them
        if (buyDues > 0) {
          // Trade creates dues - but if we have advances, reduce advances first
          if (owe > 0) {
            if (owe >= buyDues) {
              // Advances cover all dues - just reduce advances
              owe -= buyDues;
            } else {
              // Advances partially cover - reduce advances to 0, create remaining dues
              const remainingDues = buyDues - owe;
              owe = 0;
              due += remainingDues;
            }
          } else {
            // No advances - create dues directly
            due += buyDues;
          }
        } else if (buyAdvances > 0) {
          // Trade creates advances - but if we have dues, reduce dues first
          if (due > 0) {
            if (due >= buyAdvances) {
              // Dues cover all advances - just reduce dues
              due -= buyAdvances;
            } else {
              // Dues partially cover - reduce dues to 0, create remaining advances
              const remainingAdvances = buyAdvances - due;
              due = 0;
              owe += remainingAdvances;
            }
          } else {
            // No dues - create advances directly
            owe += buyAdvances;
          }
        }
        break;
      case 'sell':
        // We sold to merchant - merchant owes us or we owe merchant
        const amountReceived = trade.amountReceived ?? 0;
        const sellTotalAmount = trade.totalAmount || 0;
        
        // Calculate what this trade creates
        let sellDues = 0;
        let sellAdvances = 0;
        
        if (amountReceived < sellTotalAmount) {
          // We received less than total → Merchant owes us (Dues)
          sellDues = sellTotalAmount - amountReceived;
        } else if (amountReceived > sellTotalAmount) {
          // We received more than total → We owe merchant (Advance)
          sellAdvances = amountReceived - sellTotalAmount;
        }
        
        // Apply to running balance - reduce advances first if we have them
        if (sellDues > 0) {
          // Trade creates dues - but if we have advances, reduce advances first
          if (owe > 0) {
            if (owe >= sellDues) {
              // Advances cover all dues - just reduce advances
              owe -= sellDues;
            } else {
              // Advances partially cover - reduce advances to 0, create remaining dues
              const remainingDues = sellDues - owe;
              owe = 0;
              due += remainingDues;
            }
          } else {
            // No advances - create dues directly
            due += sellDues;
          }
        } else if (sellAdvances > 0) {
          // Trade creates advances - but if we have dues, reduce dues first
          if (due > 0) {
            if (due >= sellAdvances) {
              // Dues cover all advances - just reduce dues
              due -= sellAdvances;
            } else {
              // Dues partially cover - reduce dues to 0, create remaining advances
              const remainingAdvances = sellAdvances - due;
              due = 0;
              owe += remainingAdvances;
            }
          } else {
            // No dues - create advances directly
            owe += sellAdvances;
          }
        }
        break;
      case 'settlement':
        // Get settlement amount - use amountPaid/amountReceived if available, else totalAmount
        let settlementAmount = 0;
        if (trade.settlementDirection === 'paying') {
          settlementAmount = trade.amountPaid || trade.totalAmount || 0;
        } else if (trade.settlementDirection === 'receiving') {
          settlementAmount = trade.amountReceived || trade.totalAmount || 0;
        } else {
          settlementAmount = trade.totalAmount || trade.amountPaid || trade.amountReceived || 0;
        }
        
        if (trade.settlementDirection === 'receiving') {
          // Receiving settlement: customer pays us money
          // This reduces what they owe us (due) first, then reduces what we owe them (owe/advances)
          if (due > 0) {
            // Reduce dues first
            if (due >= settlementAmount) {
              due -= settlementAmount;
            } else {
              // Dues partially covered, excess reduces advances
              const remaining = settlementAmount - due;
              due = 0;
              if (owe >= remaining) {
                owe -= remaining;
              } else {
                // Even advances can't cover - this shouldn't happen normally
                owe = 0;
              }
            }
          } else if (owe > 0) {
            // No dues, reduce advances
            if (owe >= settlementAmount) {
              owe -= settlementAmount;
            } else {
              owe = 0;
            }
          } else {
            // No dues or advances - this payment becomes what we owe them (advance)
            owe += settlementAmount;
          }
        } else if (trade.settlementDirection === 'paying') {
          // Paying settlement: we pay customer money
          // This reduces what we owe them (owe/advances) first, then creates dues if excess
          if (owe > 0) {
            // Reduce advances first
            if (owe >= settlementAmount) {
              owe -= settlementAmount;
            } else {
              // Advances partially covered, excess creates dues
              const remaining = settlementAmount - owe;
              owe = 0;
              due += remaining;
            }
          } else {
            // No advances - this payment creates dues (they owe us back)
            due += settlementAmount;
          }
        }
        break;
    }
  });

  // Round to avoid floating point precision issues
  due = Math.round(due * 100) / 100;
  owe = Math.round(owe * 100) / 100;
  
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

  // Final result (round again after net-off)
  return { 
    due: Math.max(0, Math.round(due * 100) / 100), 
    owe: Math.max(0, Math.round(owe * 100) / 100) 
  };
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

/**
 * Calculate dues and advances for a single trade
 * Returns the dues and advances created by this specific trade
 */
export const calculateTradeDuesAdvance = (trade: Trade): { dues: number; advances: number } => {
  let dues = 0;
  let advances = 0;

  if (trade.type === 'buy') {
    // We bought from merchant - merchant owes us or we owe merchant
    const amountPaid = trade.amountPaid || 0;
    const totalAmount = trade.totalAmount || 0;

    if (amountPaid < totalAmount) {
      // We paid less than total → Merchant owes us (Dues)
      dues = totalAmount - amountPaid;
    } else if (amountPaid > totalAmount) {
      // We paid more than total → We owe merchant (Advance)
      advances = amountPaid - totalAmount;
    }
    // If equal, no dues/advances
  } else if (trade.type === 'sell') {
    // We sold to merchant - merchant owes us or we owe merchant
    const amountReceived = trade.amountReceived || 0;
    const totalAmount = trade.totalAmount || 0;

    if (amountReceived < totalAmount) {
      // We received less than total → Merchant owes us (Dues)
      dues = totalAmount - amountReceived;
    } else if (amountReceived > totalAmount) {
      // We received more than total → We owe merchant (Advance)
      advances = amountReceived - totalAmount;
    }
    // If equal, no dues/advances
  } else if (trade.type === 'settlement') {
    // Standalone payment for clearing dues/advances
    // For paying: use amountPaid if available, else totalAmount
    // For receiving: use amountReceived if available, else totalAmount
    let settlementAmount = 0;
    if (trade.settlementDirection === 'paying') {
      settlementAmount = trade.amountPaid || trade.totalAmount || 0;
    } else if (trade.settlementDirection === 'receiving') {
      settlementAmount = trade.amountReceived || trade.totalAmount || 0;
    } else {
      settlementAmount = trade.totalAmount || trade.amountPaid || trade.amountReceived || 0;
    }

    if (trade.settlementDirection === 'receiving') {
      // We received money → This reduces dues or creates advance
      // We'll return negative to indicate it reduces dues
      // The running balance calculation will handle this properly
      dues = -settlementAmount;
    } else if (trade.settlementDirection === 'paying') {
      // We paid money → This reduces advances or creates dues
      // We'll return negative to indicate it reduces advances
      advances = -settlementAmount;
    }
  }

  return { dues, advances };
};

/**
 * Calculate running balance with trade-wise dues/advances
 * Starts with merchant's initial balance and processes trades chronologically
 * Returns trades with their individual dues/advances and running balance
 */
export interface TradeWithBalance extends Trade {
  tradeDues: number;
  tradeAdvances: number;
  runningDues: number;
  runningAdvances: number;
}

export const calculateTradesWithBalance = (
  merchantId: string,
  merchantInitialDue: number,
  merchantInitialOwe: number,
  trades: Trade[],
  dateRange?: { startDate: string; endDate: string } | null
): TradeWithBalance[] => {
  // Start with initial balance from merchants table (round to avoid precision issues)
  let runningDues = Math.round((merchantInitialDue || 0) * 100) / 100;
  let runningAdvances = Math.round((merchantInitialOwe || 0) * 100) / 100;

  // Filter trades for this merchant
  let relevantTrades = trades.filter(t => t.merchantId === merchantId);

  // Sort trades chronologically (oldest first)
  relevantTrades = relevantTrades.sort((a, b) => {
    const dateA = a.tradeDate
      ? (typeof a.tradeDate === 'string' ? new Date(a.tradeDate) : a.tradeDate)
      : new Date(a.createdAt);
    const dateB = b.tradeDate
      ? (typeof b.tradeDate === 'string' ? new Date(b.tradeDate) : b.tradeDate)
      : new Date(b.createdAt);
    return dateA.getTime() - dateB.getTime();
  });

  // Apply date filter if provided
  if (dateRange?.startDate && dateRange?.endDate) {
    const start = startOfDay(new Date(dateRange.startDate));
    const end = endOfDay(new Date(dateRange.endDate));
    relevantTrades = relevantTrades.filter(t => {
      const tradeDate = t.tradeDate
        ? (typeof t.tradeDate === 'string' ? new Date(t.tradeDate) : t.tradeDate)
        : new Date(t.createdAt);
      return isWithinInterval(tradeDate, { start, end });
    });
  }

  // Process each trade and calculate running balance
  const tradesWithBalance: TradeWithBalance[] = relevantTrades.map(trade => {
    const { dues, advances } = calculateTradeDuesAdvance(trade);
    
    // Store the dues/advances this trade creates (before applying to running balance)
    let tradeDuesCreated = 0;
    let tradeAdvancesCreated = 0;

    // Apply to running balance
    if (trade.type === 'settlement') {
      // Settlements reduce dues/advances
      if (dues < 0) {
        // Receiving money - reduces dues first, then advances
        const amount = Math.abs(dues);
        // Round to avoid floating point precision issues
        const roundedAmount = Math.round(amount * 100) / 100;
        const roundedRunningDues = Math.round(runningDues * 100) / 100;
        
        if (roundedRunningDues >= roundedAmount) {
          // Dues cover the full amount
          runningDues = roundedRunningDues - roundedAmount;
        } else {
          // Dues partially cover, excess reduces advances
          const remaining = roundedAmount - roundedRunningDues;
          runningDues = 0;
          const roundedRunningAdvances = Math.round(runningAdvances * 100) / 100;
          if (roundedRunningAdvances >= remaining) {
            runningAdvances = roundedRunningAdvances - remaining;
          } else {
            // Even advances can't cover - excess becomes new advance
            const excess = remaining - roundedRunningAdvances;
            runningAdvances = 0;
            runningAdvances += excess; // This shouldn't happen in normal flow
          }
        }
      } else if (advances < 0) {
        // Paying money - reduces advances first, then creates dues
        const amount = Math.abs(advances);
        // Round to avoid floating point precision issues
        const roundedAmount = Math.round(amount * 100) / 100;
        const roundedRunningAdvances = Math.round(runningAdvances * 100) / 100;
        
        if (roundedRunningAdvances >= roundedAmount) {
          // Advances cover the full amount - just reduce advances
          runningAdvances = roundedRunningAdvances - roundedAmount;
        } else {
          // Advances partially cover - reduce to 0, excess creates dues
          const remaining = roundedAmount - roundedRunningAdvances;
          runningAdvances = 0;
          runningDues += remaining;
        }
      }
    } else {
      // Regular trades (buy/sell) - apply to running balance intelligently
      if (dues > 0) {
        // Trade creates dues - but if we have advances, reduce advances first
        if (runningAdvances > 0) {
          if (runningAdvances >= dues) {
            // Advances cover all dues - just reduce advances
            runningAdvances -= dues;
            tradeDuesCreated = 0;
            tradeAdvancesCreated = -dues; // Shows reduction in advances
          } else {
            // Advances partially cover - reduce advances to 0, create remaining dues
            const remainingDues = dues - runningAdvances;
            tradeDuesCreated = remainingDues;
            tradeAdvancesCreated = -runningAdvances; // Shows reduction in advances
            runningAdvances = 0;
            runningDues += remainingDues;
          }
        } else {
          // No advances - create dues directly
          runningDues += dues;
          tradeDuesCreated = dues;
        }
      } else if (advances > 0) {
        // Trade creates advances - but if we have dues, reduce dues first
        if (runningDues > 0) {
          if (runningDues >= advances) {
            // Dues cover all advances - just reduce dues
            runningDues -= advances;
            tradeAdvancesCreated = 0;
            tradeDuesCreated = -advances; // Shows reduction in dues
          } else {
            // Dues partially cover - reduce dues to 0, create remaining advances
            const remainingAdvances = advances - runningDues;
            tradeAdvancesCreated = remainingAdvances;
            tradeDuesCreated = -runningDues; // Shows reduction in dues
            runningDues = 0;
            runningAdvances += remainingAdvances;
          }
        } else {
          // No dues - create advances directly
          runningAdvances += advances;
          tradeAdvancesCreated = advances;
        }
      }
    }

    // Round to 2 decimal places to avoid floating point precision issues
    const roundedRunningDues = Math.round(runningDues * 100) / 100;
    const roundedRunningAdvances = Math.round(runningAdvances * 100) / 100;
    
    return {
      ...trade,
      tradeDues: Math.max(0, tradeDuesCreated),
      tradeAdvances: Math.max(0, tradeAdvancesCreated),
      runningDues: Math.max(0, roundedRunningDues),
      runningAdvances: Math.max(0, roundedRunningAdvances),
    };
  });

  return tradesWithBalance;
};
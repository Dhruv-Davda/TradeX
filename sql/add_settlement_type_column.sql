-- Add settlement_type column to trades table
-- This column will store the settlement type for settlement trades

ALTER TABLE trades 
ADD COLUMN settlement_type TEXT CHECK (settlement_type IN ('cash', 'bank', 'gold', 'silver'));

-- Add comment to explain the column
COMMENT ON COLUMN trades.settlement_type IS 'Type of settlement: cash, bank, gold, or silver. Only relevant for settlement trades.';

-- Update existing settlement trades to have 'cash' as default settlement type
UPDATE trades 
SET settlement_type = 'cash' 
WHERE type = 'settlement' AND settlement_type IS NULL;

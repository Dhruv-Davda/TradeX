-- Add settlement_type and settlement_direction columns to trades table
-- This will enable proper handling of settlement trades

-- Add settlement_type column
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS settlement_type TEXT CHECK (settlement_type IN ('cash', 'bank', 'gold', 'silver'));

-- Add settlement_direction column  
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS settlement_direction TEXT CHECK (settlement_direction IN ('receiving', 'paying'));

-- Add comments to explain the columns
COMMENT ON COLUMN trades.settlement_type IS 'Type of settlement: cash, bank, gold, or silver. Only relevant for settlement trades.';
COMMENT ON COLUMN trades.settlement_direction IS 'Direction of settlement: receiving (you get money/metal) or paying (you give money/metal).';

-- Update existing settlement trades to have default values
UPDATE trades 
SET settlement_type = 'cash', settlement_direction = 'paying'
WHERE type = 'settlement' AND (settlement_type IS NULL OR settlement_direction IS NULL);

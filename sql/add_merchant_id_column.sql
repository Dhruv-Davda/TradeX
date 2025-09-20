-- Add merchant_id column to trades table
-- This will enable proper linking between trades and merchants

-- Add merchant_id column
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS merchant_id TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN trades.merchant_id IS 'Foreign key reference to merchants table. Links trades to specific merchants.';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_trades_merchant_id ON trades(merchant_id);

-- Note: Existing trades will have merchant_id as NULL
-- New trades will have proper merchant_id values

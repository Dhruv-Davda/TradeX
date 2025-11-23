-- Add trade_date column to trades table
-- This allows users to edit the actual trade date separate from when the record was created

-- Add the trade_date column
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS trade_date DATE DEFAULT CURRENT_DATE;

-- Update existing records to use created_at date as trade_date
UPDATE trades 
SET trade_date = created_at::date 
WHERE trade_date IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN trades.trade_date IS 'The actual date when the trade occurred. Separate from created_at which is when the record was created.';

-- Create index for better performance on date queries
CREATE INDEX IF NOT EXISTS idx_trades_trade_date ON trades(trade_date);

-- Success message
SELECT '✅ Trade date column added successfully to trades table!' as message;


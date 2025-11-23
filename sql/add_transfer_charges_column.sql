-- Add transfer_charges column to trades table
-- This allows proper tracking of transfer profits in analytics

-- Add the transfer_charges column
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS transfer_charges DECIMAL(12,2) DEFAULT 0;

-- Add pickup_location and drop_location columns for transfer trades
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS pickup_location TEXT;

ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS drop_location TEXT;

-- Add settlement_type and settlement_direction columns for settlement trades
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS settlement_type TEXT CHECK (settlement_type IN ('cash', 'bank', 'gold', 'silver'));

ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS settlement_direction TEXT CHECK (settlement_direction IN ('receiving', 'paying'));

-- Add merchant_id column for better merchant tracking
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS merchant_id TEXT;

-- Add foreign key constraint for merchant_id (optional, can be null)
-- ALTER TABLE trades ADD CONSTRAINT fk_trades_merchant_id FOREIGN KEY (merchant_id) REFERENCES merchants(id);

-- Success message
SELECT '✅ Transfer charges and additional columns added successfully to trades table!' as message;

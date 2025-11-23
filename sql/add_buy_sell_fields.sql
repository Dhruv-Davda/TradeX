-- Add missing fields for buy/sell transactions
-- This enables proper merchant debt tracking

-- Add amount_paid field for buy transactions (how much you actually paid)
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12,2) DEFAULT 0;

-- Add amount_received field for sell transactions (how much you actually received)
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS amount_received DECIMAL(12,2) DEFAULT 0;

-- Add labor_charges field for sell transactions (additional charges)
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS labor_charges DECIMAL(12,2) DEFAULT 0;

-- Add payment_type field for better payment tracking
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('cash', 'bank_transfer', 'upi', 'cheque'));

-- Success message
SELECT '✅ Buy/Sell transaction fields added successfully to trades table!' as message;

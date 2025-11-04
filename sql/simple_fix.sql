-- Simple fix to populate user_email in existing trades
-- Run this in Supabase SQL Editor

-- Step 1: Check current data
SELECT 'Before update:' as status, COUNT(*) as total_trades FROM trades;

-- Step 2: Update all trades to have user_email populated
UPDATE trades 
SET user_email = (
  SELECT email 
  FROM users 
  WHERE users.id = trades.user_id
)
WHERE user_email IS NULL OR user_email = '';

-- Step 3: Check after update
SELECT 'After update:' as status, COUNT(*) as total_trades FROM trades;

-- Step 4: Show sample data
SELECT 
  id,
  user_id,
  user_email,
  type,
  party_name,
  created_at
FROM trades 
ORDER BY created_at DESC 
LIMIT 3;

-- Success message
SELECT '✅ All trades now have user_email populated!' as result;

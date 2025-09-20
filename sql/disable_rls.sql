-- Disable RLS to test shared data functionality
-- Run this in Supabase SQL Editor

-- 1. Disable RLS on trades table
ALTER TABLE trades DISABLE ROW LEVEL SECURITY;

-- 2. Check current data
SELECT 'RLS disabled - checking data:' as status, COUNT(*) as total_trades FROM trades;

-- 3. Show sample data with emails
SELECT 
  id,
  user_id,
  user_email,
  type,
  party_name,
  created_at
FROM trades 
ORDER BY created_at DESC 
LIMIT 5;

-- Success message
SELECT '✅ RLS disabled! Now test shared data across browsers!' as message;

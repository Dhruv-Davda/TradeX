-- Test query to see what's in the database
-- Run this in Supabase SQL Editor

-- 1. Check all trades
SELECT 'All trades:' as info, COUNT(*) as count FROM trades;

-- 2. Check trades by email
SELECT 
  user_email,
  COUNT(*) as trade_count
FROM trades 
GROUP BY user_email;

-- 3. Check users table
SELECT 'All users:' as info, COUNT(*) as count FROM users;

-- 4. Show user details
SELECT 
  id,
  email,
  business_name,
  created_at
FROM users 
ORDER BY created_at DESC;

-- 5. Show all trades with details
SELECT 
  id,
  user_id,
  user_email,
  type,
  party_name,
  created_at
FROM trades 
ORDER BY created_at DESC;

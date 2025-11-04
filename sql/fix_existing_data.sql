-- Fix existing data for shared functionality
-- Run this in Supabase SQL Editor after running the main setup_database.sql

-- 1. First, let's see what data we have
SELECT 
  'Current trades count:' as info,
  COUNT(*) as count
FROM trades;

-- 2. Check which trades are missing user_email
SELECT 
  'Trades missing user_email:' as info,
  COUNT(*) as count
FROM trades 
WHERE user_email IS NULL OR user_email = '';

-- 3. Update all existing trades to populate user_email field
UPDATE trades 
SET user_email = (
  SELECT email 
  FROM users 
  WHERE users.id = trades.user_id
)
WHERE user_email IS NULL OR user_email = '';

-- 4. Verify the update worked
SELECT 
  'Trades after update:' as info,
  COUNT(*) as total_trades,
  COUNT(CASE WHEN user_email IS NOT NULL AND user_email != '' THEN 1 END) as trades_with_email
FROM trades;

-- 5. Show sample of updated data
SELECT 
  id,
  user_id,
  user_email,
  type,
  metal_type,
  party_name,
  created_at
FROM trades 
ORDER BY created_at DESC 
LIMIT 5;

-- Success message
SELECT 'Data fix completed! All trades now have user_email populated.' as message;

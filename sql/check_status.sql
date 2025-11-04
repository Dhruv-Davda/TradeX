-- Check current database status
-- Run this in Supabase SQL Editor

-- 1. Check if trades table exists and has data
SELECT 'Trades table status:' as info, COUNT(*) as total_trades FROM trades;

-- 2. Check current RLS policies on trades table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'trades';

-- 3. Check if user_email column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'trades' 
AND column_name = 'user_email';

-- 4. Show sample trades data
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

-- 5. Check users table
SELECT 'Users table status:' as info, COUNT(*) as total_users FROM users;

-- Success message
SELECT '✅ Database status check completed!' as message;

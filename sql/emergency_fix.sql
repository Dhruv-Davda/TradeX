-- EMERGENCY FIX: Restore data access
-- Run this immediately in Supabase SQL Editor

-- 1. Drop all complex RLS policies
DROP POLICY IF EXISTS "Users can view trades by email" ON trades;
DROP POLICY IF EXISTS "Users can insert trades with their email" ON trades;
DROP POLICY IF EXISTS "Users can update trades by email" ON trades;
DROP POLICY IF EXISTS "Users can delete trades by email" ON trades;

-- 2. Create simple RLS policies based on user_id only
CREATE POLICY "Users can view own trades" ON trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" ON trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" ON trades
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades" ON trades
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Check if data exists
SELECT 'Data check:' as info, COUNT(*) as total_trades FROM trades;

-- 4. Show sample data
SELECT 
  id,
  user_id,
  type,
  party_name,
  created_at
FROM trades 
ORDER BY created_at DESC 
LIMIT 5;

-- Success message
SELECT '🚨 EMERGENCY FIX APPLIED - Data access restored!' as message;

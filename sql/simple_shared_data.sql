-- Simple shared data solution using email
-- Run this in Supabase SQL Editor

-- 1. Disable RLS temporarily to fix data access
ALTER TABLE trades DISABLE ROW LEVEL SECURITY;

-- 2. Add user_email column if it doesn't exist
ALTER TABLE trades ADD COLUMN IF NOT EXISTS user_email TEXT;

-- 3. Update all existing trades to have user_email
UPDATE trades 
SET user_email = (
  SELECT email 
  FROM users 
  WHERE users.id = trades.user_id
)
WHERE user_email IS NULL OR user_email = '';

-- 4. Re-enable RLS with simple email-based policy
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- 5. Drop all existing policies
DROP POLICY IF EXISTS "Users can view own trades" ON trades;
DROP POLICY IF EXISTS "Users can insert own trades" ON trades;
DROP POLICY IF EXISTS "Users can update own trades" ON trades;
DROP POLICY IF EXISTS "Users can delete own trades" ON trades;
DROP POLICY IF EXISTS "Users can view trades by email" ON trades;
DROP POLICY IF EXISTS "Users can insert trades with their email" ON trades;
DROP POLICY IF EXISTS "Users can update trades by email" ON trades;
DROP POLICY IF EXISTS "Users can delete trades by email" ON trades;

-- 6. Create simple email-based policies for shared data
CREATE POLICY "Shared data by email" ON trades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = trades.user_email
    )
  );

-- 7. Check the result
SELECT 'Setup complete!' as status, COUNT(*) as total_trades FROM trades;

-- Success message
SELECT '✅ Simple shared data setup completed! Same email = Same data across all devices!' as message;

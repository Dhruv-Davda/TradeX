-- Create Income and Expenses Tables for Trade Manager
-- Run this in your Supabase SQL Editor

-- 1. Create income table
CREATE TABLE IF NOT EXISTS income (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL, -- For shared data across devices
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('cash', 'bank_transfer', 'upi', 'cheque')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL, -- For shared data across devices
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('cash', 'bank_transfer', 'upi', 'cheque')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for income table (email-based for shared data)
DROP POLICY IF EXISTS "Users can view income by email" ON income;
CREATE POLICY "Users can view income by email" ON income
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = income.user_email
    )
  );

DROP POLICY IF EXISTS "Users can insert income by email" ON income;
CREATE POLICY "Users can insert income by email" ON income
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = income.user_email
    )
  );

DROP POLICY IF EXISTS "Users can update income by email" ON income;
CREATE POLICY "Users can update income by email" ON income
  FOR UPDATE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = income.user_email
    )
  );

DROP POLICY IF EXISTS "Users can delete income by email" ON income;
CREATE POLICY "Users can delete income by email" ON income
  FOR DELETE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = income.user_email
    )
  );

-- 5. Create RLS policies for expenses table (email-based for shared data)
DROP POLICY IF EXISTS "Users can view expenses by email" ON expenses;
CREATE POLICY "Users can view expenses by email" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = expenses.user_email
    )
  );

DROP POLICY IF EXISTS "Users can insert expenses by email" ON expenses;
CREATE POLICY "Users can insert expenses by email" ON expenses
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = expenses.user_email
    )
  );

DROP POLICY IF EXISTS "Users can update expenses by email" ON expenses;
CREATE POLICY "Users can update expenses by email" ON expenses
  FOR UPDATE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = expenses.user_email
    )
  );

DROP POLICY IF EXISTS "Users can delete expenses by email" ON expenses;
CREATE POLICY "Users can delete expenses by email" ON expenses
  FOR DELETE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = expenses.user_email
    )
  );

-- Success message
SELECT '✅ Income and Expenses tables created successfully!' as message;

-- Complete Database Setup for Trade Manager
-- Run this in your Supabase SQL Editor

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL DEFAULT 'My Business',
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL, -- For shared data across devices
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'transfer', 'settlement')),
  metal_type TEXT NOT NULL CHECK (metal_type IN ('gold', 'silver')),
  quantity DECIMAL(10,3) NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  party_name TEXT NOT NULL,
  party_phone TEXT,
  party_address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create income table
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

-- 4. Create expenses table
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

-- 5. Create merchants table
CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL, -- For shared data across devices
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  total_due DECIMAL(12,2) DEFAULT 0,
  total_owe DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 8. Create RLS policies for trades table (email-based for shared data)
DROP POLICY IF EXISTS "Users can view trades by email" ON trades;
CREATE POLICY "Users can view trades by email" ON trades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = trades.user_email
    )
  );

DROP POLICY IF EXISTS "Users can insert trades by email" ON trades;
CREATE POLICY "Users can insert trades by email" ON trades
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = trades.user_email
    )
  );

DROP POLICY IF EXISTS "Users can update trades by email" ON trades;
CREATE POLICY "Users can update trades by email" ON trades
  FOR UPDATE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = trades.user_email
    )
  );

DROP POLICY IF EXISTS "Users can delete trades by email" ON trades;
CREATE POLICY "Users can delete trades by email" ON trades
  FOR DELETE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = trades.user_email
    )
  );

-- 9. Create RLS policies for income table (email-based for shared data)
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

-- 10. Create RLS policies for expenses table (email-based for shared data)
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

-- 11. Create RLS policies for merchants table (email-based for shared data)
DROP POLICY IF EXISTS "Users can view merchants by email" ON merchants;
CREATE POLICY "Users can view merchants by email" ON merchants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = merchants.user_email
    )
  );

DROP POLICY IF EXISTS "Users can insert merchants by email" ON merchants;
CREATE POLICY "Users can insert merchants by email" ON merchants
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = merchants.user_email
    )
  );

DROP POLICY IF EXISTS "Users can update merchants by email" ON merchants;
CREATE POLICY "Users can update merchants by email" ON merchants
  FOR UPDATE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = merchants.user_email
    )
  );

DROP POLICY IF EXISTS "Users can delete merchants by email" ON merchants;
CREATE POLICY "Users can delete merchants by email" ON merchants
  FOR DELETE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = merchants.user_email
    )
  );

-- 12. Create stock table
CREATE TABLE IF NOT EXISTS stock (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL, -- For shared data across devices
  metal_type TEXT NOT NULL CHECK (metal_type IN ('gold', 'silver')),
  quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, metal_type) -- One record per user per metal type
);

-- 13. Enable Row Level Security for stock table
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

-- 14. Create RLS policies for stock table (email-based for shared data)
DROP POLICY IF EXISTS "Users can view stock by email" ON stock;
CREATE POLICY "Users can view stock by email" ON stock
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = stock.user_email
    )
  );

DROP POLICY IF EXISTS "Users can insert stock by email" ON stock;
CREATE POLICY "Users can insert stock by email" ON stock
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = stock.user_email
    )
  );

DROP POLICY IF EXISTS "Users can update stock by email" ON stock;
CREATE POLICY "Users can update stock by email" ON stock
  FOR UPDATE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = stock.user_email
    )
  );

DROP POLICY IF EXISTS "Users can delete stock by email" ON stock;
CREATE POLICY "Users can delete stock by email" ON stock
  FOR DELETE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = stock.user_email
    )
  );

-- Success message
SELECT '✅ All tables created successfully! Trades, Income, Expenses, Merchants, and Stock are now shared across devices!' as message;

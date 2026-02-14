-- Ghaat (Jewellery) Feature - Database Setup
-- Run this in your Supabase SQL Editor

-- 1. Create karigars table
CREATE TABLE IF NOT EXISTS karigars (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create ghaat_transactions table
CREATE TABLE IF NOT EXISTS ghaat_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  karigar_id TEXT,
  karigar_name TEXT,
  merchant_id TEXT,
  merchant_name TEXT,
  category TEXT NOT NULL,
  units INTEGER NOT NULL DEFAULT 1,
  gross_weight_per_unit DECIMAL(10,3) NOT NULL,
  purity DECIMAL(5,2) NOT NULL,
  total_gross_weight DECIMAL(10,3) NOT NULL,
  fine_gold DECIMAL(10,3) NOT NULL,
  labor_type TEXT CHECK (labor_type IN ('cash', 'gold')),
  labor_amount DECIMAL(12,2) DEFAULT 0,
  amount_received DECIMAL(12,2),
  notes TEXT,
  transaction_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create jewellery_categories table (for custom user categories)
CREATE TABLE IF NOT EXISTS jewellery_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security
ALTER TABLE karigars ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghaat_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jewellery_categories ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for karigars table
DROP POLICY IF EXISTS "Users can view karigars by email" ON karigars;
CREATE POLICY "Users can view karigars by email" ON karigars
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email = karigars.user_email
    )
  );

DROP POLICY IF EXISTS "Users can insert karigars by email" ON karigars;
CREATE POLICY "Users can insert karigars by email" ON karigars
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email = karigars.user_email
    )
  );

DROP POLICY IF EXISTS "Users can update karigars by email" ON karigars;
CREATE POLICY "Users can update karigars by email" ON karigars
  FOR UPDATE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email = karigars.user_email
    )
  );

DROP POLICY IF EXISTS "Users can delete karigars by email" ON karigars;
CREATE POLICY "Users can delete karigars by email" ON karigars
  FOR DELETE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email = karigars.user_email
    )
  );

-- 6. RLS policies for ghaat_transactions table
DROP POLICY IF EXISTS "Users can view ghaat_transactions by email" ON ghaat_transactions;
CREATE POLICY "Users can view ghaat_transactions by email" ON ghaat_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email = ghaat_transactions.user_email
    )
  );

DROP POLICY IF EXISTS "Users can insert ghaat_transactions by email" ON ghaat_transactions;
CREATE POLICY "Users can insert ghaat_transactions by email" ON ghaat_transactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email = ghaat_transactions.user_email
    )
  );

DROP POLICY IF EXISTS "Users can update ghaat_transactions by email" ON ghaat_transactions;
CREATE POLICY "Users can update ghaat_transactions by email" ON ghaat_transactions
  FOR UPDATE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email = ghaat_transactions.user_email
    )
  );

DROP POLICY IF EXISTS "Users can delete ghaat_transactions by email" ON ghaat_transactions;
CREATE POLICY "Users can delete ghaat_transactions by email" ON ghaat_transactions
  FOR DELETE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email = ghaat_transactions.user_email
    )
  );

-- 7. RLS policies for jewellery_categories table
DROP POLICY IF EXISTS "Users can view jewellery_categories by email" ON jewellery_categories;
CREATE POLICY "Users can view jewellery_categories by email" ON jewellery_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email = jewellery_categories.user_email
    )
  );

DROP POLICY IF EXISTS "Users can insert jewellery_categories by email" ON jewellery_categories;
CREATE POLICY "Users can insert jewellery_categories by email" ON jewellery_categories
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email = jewellery_categories.user_email
    )
  );

DROP POLICY IF EXISTS "Users can delete jewellery_categories by email" ON jewellery_categories;
CREATE POLICY "Users can delete jewellery_categories by email" ON jewellery_categories
  FOR DELETE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email = jewellery_categories.user_email
    )
  );

SELECT 'Ghaat tables created successfully! karigars, ghaat_transactions, and jewellery_categories are ready.' as message;

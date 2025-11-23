-- Create Stock Table for Trade Manager
-- Run this in your Supabase SQL Editor

-- 1. Create stock table
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

-- 2. Enable Row Level Security (RLS)
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for stock table (email-based for shared data)
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
SELECT '✅ Stock table created successfully!' as message;

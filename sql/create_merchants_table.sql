-- Create Merchants Table for Trade Manager
-- Run this in your Supabase SQL Editor

-- 1. Create merchants table
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

-- 2. Enable Row Level Security (RLS)
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for merchants table (email-based for shared data)
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

-- Success message
SELECT '✅ Merchants table created successfully!' as message;

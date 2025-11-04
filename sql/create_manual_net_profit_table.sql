-- Create manual_net_profit table
-- This table stores manually entered net profit values per month
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS manual_net_profit (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL, -- For shared data across devices
  month_year TEXT NOT NULL, -- Format: 'YYYY-MM' (e.g., '2025-09')
  net_profit DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT, -- Optional notes for the month
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month_year), -- One record per user per month
  UNIQUE(user_email, month_year) -- Also unique by email for shared data
);

-- Enable Row Level Security
ALTER TABLE manual_net_profit ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for manual_net_profit table (email-based for shared data)
DROP POLICY IF EXISTS "Users can view manual net profit by email" ON manual_net_profit;
CREATE POLICY "Users can view manual net profit by email" ON manual_net_profit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = manual_net_profit.user_email
    )
  );

DROP POLICY IF EXISTS "Users can insert manual net profit by email" ON manual_net_profit;
CREATE POLICY "Users can insert manual net profit by email" ON manual_net_profit
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = manual_net_profit.user_email
    )
  );

DROP POLICY IF EXISTS "Users can update manual net profit by email" ON manual_net_profit;
CREATE POLICY "Users can update manual net profit by email" ON manual_net_profit
  FOR UPDATE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = manual_net_profit.user_email
    )
  );

DROP POLICY IF EXISTS "Users can delete manual net profit by email" ON manual_net_profit;
CREATE POLICY "Users can delete manual net profit by email" ON manual_net_profit
  FOR DELETE USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.email = manual_net_profit.user_email
    )
  );

-- Success message
SELECT '✅ manual_net_profit table created successfully!' as message;


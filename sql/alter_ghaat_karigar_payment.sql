-- Migration: Karigar Payment Tracking + Raw Gold Balance Ledger
-- Run this in Supabase SQL Editor AFTER the pending/sold migration

-- 1a. Add payment columns to ghaat_transactions (for buy transactions)
ALTER TABLE ghaat_transactions
  ADD COLUMN IF NOT EXISTS gold_given_weight DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS gold_given_purity DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS gold_given_fine DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS cash_paid DECIMAL(12,2);

-- 1b. Create raw_gold_ledger table
CREATE TABLE IF NOT EXISTS raw_gold_ledger (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('in', 'out')),
  source TEXT NOT NULL CHECK (source IN ('merchant_return', 'karigar_payment', 'manual_adjustment', 'initial_balance')),
  reference_id TEXT,
  gross_weight DECIMAL(10,3) NOT NULL DEFAULT 0,
  purity DECIMAL(5,2) NOT NULL DEFAULT 0,
  fine_gold DECIMAL(10,3) NOT NULL DEFAULT 0,
  cash_amount DECIMAL(12,2),
  counterparty_name TEXT NOT NULL DEFAULT '',
  counterparty_id TEXT,
  notes TEXT,
  transaction_date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_gold_ledger_user_email ON raw_gold_ledger(user_email);
CREATE INDEX IF NOT EXISTS idx_raw_gold_ledger_reference_id ON raw_gold_ledger(reference_id);

-- 1c. Enable RLS
ALTER TABLE raw_gold_ledger ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as ghaat_transactions)
CREATE POLICY "Users can view own raw gold ledger entries"
  ON raw_gold_ledger FOR SELECT
  USING (user_email = (SELECT email FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own raw gold ledger entries"
  ON raw_gold_ledger FOR INSERT
  WITH CHECK (user_email = (SELECT email FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own raw gold ledger entries"
  ON raw_gold_ledger FOR UPDATE
  USING (user_email = (SELECT email FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete own raw gold ledger entries"
  ON raw_gold_ledger FOR DELETE
  USING (user_email = (SELECT email FROM users WHERE id = auth.uid()));

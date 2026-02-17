-- Migration: Add pending/sold status flow columns to ghaat_transactions
-- Run this in your Supabase SQL Editor AFTER the initial create_ghaat_tables.sql

-- Status: 'pending' (with merchant) or 'sold' (confirmed). NULL for buy txns and legacy sells.
-- group_id: Links multi-line-item pending sales together (same merchant, same day = same group)
-- rate_per_10gm: Market rate when merchant confirms the sale
-- total_amount: confirmedFineGold * rate / 10 (INR)
-- settlement_type: 'gold' | 'cash' | 'mixed'
-- gold_returned_weight/purity/fine: Gross gold returned by merchant as payment
-- cash_received: Cash portion received from merchant
-- confirmed_date: Date merchant confirmed/booked the sale
-- confirmed_units/gross_weight/fine_gold: Actual values after merchant returns some pieces
-- dues_shortfall: If merchant pays less than total, shortfall goes to merchant dues

ALTER TABLE ghaat_transactions
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending', 'sold')),
  ADD COLUMN IF NOT EXISTS group_id TEXT,
  ADD COLUMN IF NOT EXISTS rate_per_10gm DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS settlement_type TEXT CHECK (settlement_type IN ('gold', 'cash', 'mixed')),
  ADD COLUMN IF NOT EXISTS gold_returned_weight DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS gold_returned_purity DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS gold_returned_fine DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS cash_received DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS confirmed_date TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_units INTEGER,
  ADD COLUMN IF NOT EXISTS confirmed_gross_weight DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS confirmed_fine_gold DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS dues_shortfall DECIMAL(12,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ghaat_status ON ghaat_transactions(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ghaat_group_id ON ghaat_transactions(group_id) WHERE group_id IS NOT NULL;

SELECT 'Ghaat migration complete: pending/sold status flow columns added.' as message;

-- Ghaat Settlements table for recording gold/cash settlements with merchants and karigars
CREATE TABLE IF NOT EXISTS ghaat_settlements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  party_type TEXT NOT NULL CHECK (party_type IN ('merchant', 'karigar')),
  party_id TEXT NOT NULL,
  party_name TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('receiving', 'paying')),
  cash_amount DECIMAL(12,2) DEFAULT 0,
  gold_weight DECIMAL(10,3) DEFAULT 0,
  gold_purity DECIMAL(5,2) DEFAULT 0,
  gold_fine DECIMAL(10,3) DEFAULT 0,
  rate_per_10gm DECIMAL(12,2),
  gold_value DECIMAL(12,2),
  notes TEXT,
  settlement_date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ghaat_settlements_party ON ghaat_settlements(party_type, party_id);
CREATE INDEX IF NOT EXISTS idx_ghaat_settlements_user ON ghaat_settlements(user_email);

-- Enable RLS
ALTER TABLE ghaat_settlements ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own ghaat settlements" ON ghaat_settlements
  FOR SELECT USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can insert own ghaat settlements" ON ghaat_settlements
  FOR INSERT WITH CHECK (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can update own ghaat settlements" ON ghaat_settlements
  FOR UPDATE USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can delete own ghaat settlements" ON ghaat_settlements
  FOR DELETE USING (user_email = auth.jwt() ->> 'email');

-- Extend raw_gold_ledger source constraint to include ghaat_settlement
ALTER TABLE raw_gold_ledger DROP CONSTRAINT IF EXISTS raw_gold_ledger_source_check;
ALTER TABLE raw_gold_ledger ADD CONSTRAINT raw_gold_ledger_source_check
  CHECK (source IN ('merchant_return', 'karigar_payment', 'manual_adjustment', 'initial_balance', 'ghaat_settlement'));

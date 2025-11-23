-- Clear all data from Trade Manager tables
-- Run this in Supabase SQL Editor

-- 1. Delete all trades
DELETE FROM trades;

-- 2. Delete all income
DELETE FROM income;

-- 3. Delete all expenses
DELETE FROM expenses;

-- 4. Delete all merchants
DELETE FROM merchants;

-- 5. Delete all stock
DELETE FROM stock;

-- 6. Verify data is cleared
SELECT 'Trades cleared:' as status, COUNT(*) as remaining_trades FROM trades;
SELECT 'Income cleared:' as status, COUNT(*) as remaining_income FROM income;
SELECT 'Expenses cleared:' as status, COUNT(*) as remaining_expenses FROM expenses;
SELECT 'Merchants cleared:' as status, COUNT(*) as remaining_merchants FROM merchants;
SELECT 'Stock cleared:' as status, COUNT(*) as remaining_stock FROM stock;

-- 7. Show users (keep users, just clear data)
SELECT 'Users remaining:' as status, COUNT(*) as user_count FROM users;

-- Success message
SELECT '✅ All data cleared! Trades, Income, Expenses, Merchants, and Stock data cleared!' as message;

# Debug Date Issue

## Step 1: Check Database Schema
Run this query in Supabase SQL Editor to check if trade_date column exists:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'trades' 
AND column_name IN ('trade_date', 'created_at');
```

## Step 2: Check Current Data
Run this query to see if trade_date is populated:

```sql
SELECT id, party_name, trade_date, created_at, updated_at 
FROM trades 
ORDER BY updated_at DESC 
LIMIT 5;
```

## Step 3: Test Date Update
Try updating a trade date manually:

```sql
UPDATE trades 
SET trade_date = '2024-01-15' 
WHERE id = 'your-trade-id';
```

## Step 4: Check Browser Console
Open browser DevTools (F12) and check Console tab for:
- Any error messages
- Cache invalidation logs
- Database update logs

## Step 5: Clear Browser Cache
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or clear browser cache completely

## Step 6: Check Network Tab
In DevTools Network tab, look for:
- Database update requests
- Any failed requests
- Response data

## Common Issues:
1. **Database migration not run** - trade_date column doesn't exist
2. **Cache not cleared** - old data still showing
3. **Browser cache** - old JavaScript still running
4. **Database permissions** - user can't update trade_date column

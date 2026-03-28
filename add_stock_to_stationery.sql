-- Supabase SQL Migration
-- Run this in the SQL Editor to support individual item inventory tracking!

-- 1. Add Total stock column if it doesn't exist, initializing with 100
ALTER TABLE public."Stationery Details" 
ADD COLUMN IF NOT EXISTS total_stock INTEGER DEFAULT 100 NOT NULL;

-- 2. Add Remaining stock column if it doesn't exist, initializing with 100
ALTER TABLE public."Stationery Details" 
ADD COLUMN IF NOT EXISTS remaining_stock INTEGER DEFAULT 100 NOT NULL;

-- 3. Update the default value to explicitly be 100 for future inserts
ALTER TABLE public."Stationery Details" 
ALTER COLUMN total_stock SET DEFAULT 100,
ALTER COLUMN remaining_stock SET DEFAULT 100;

-- 4. Run this to push the new Default 100 to all older items natively!
UPDATE public."Stationery Details" 
SET total_stock = 100 
WHERE total_stock = 0;

UPDATE public."Stationery Details" 
SET remaining_stock = 100 
WHERE remaining_stock = 0;

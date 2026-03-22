-- =========================================================================
-- RUN THIS PATCH IN YOUR SUPABASE SQL EDITOR TO SUPPORT SET-BASED INVENTORY
-- =========================================================================

-- Add the 'total_stock' tracker to the existing inventory table so the app
-- can visually separate "Total Initial Sets" from "Remaining Available Sets".
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS total_stock INTEGER DEFAULT 0;

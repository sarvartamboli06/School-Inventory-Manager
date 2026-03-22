-- School Stationery Inventory & Automated Billing System - Phase 2 Schema Upgrade
-- Please run this entire file in your Supabase SQL Editor to apply the Phase 2 upgrades.

-- 1. Create the `schools` table
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_name TEXT NOT NULL,
    address TEXT,
    contact_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS) for schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.schools FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.schools FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON public.schools FOR DELETE USING (true);

-- 2. Modify the `students` table to link it to Schools
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

-- 3. Automated Inventory Stock Deduction Triggers
-- These functions guarantee that stock is cleanly subtracted when a bill is processed natively inside your Postgres database.

-- TRIGGER A: When an invoice is UPDATED from UNPAID to PAID.
CREATE OR REPLACE FUNCTION process_invoice_stock_deduction()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    -- Check if the invoice status has just been changed to 'PAID' explicitly from something else
    IF NEW.status = 'PAID' AND OLD.status != 'PAID' THEN
        -- Loop through all items associated with this exact invoice
        FOR item IN SELECT * FROM public.invoice_items WHERE invoice_id = NEW.id LOOP
            IF item.product_type = 'STATIONERY' THEN
                UPDATE public.inventory_items SET stock_count = stock_count - item.quantity WHERE id = item.product_id;
            ELSIF item.product_type = 'BOOK' THEN
                UPDATE public.books SET stock_count = stock_count - item.quantity WHERE id = item.product_id;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_invoice_paid_update ON public.invoices;
CREATE TRIGGER on_invoice_paid_update
AFTER UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION process_invoice_stock_deduction();

-- TRIGGER B: When items are INSERTED into a bill that is ALREADY marked as 'PAID'
CREATE OR REPLACE FUNCTION process_single_item_deduction()
RETURNS TRIGGER AS $$
DECLARE
    inv_status TEXT;
BEGIN
    SELECT status INTO inv_status FROM public.invoices WHERE id = NEW.invoice_id;
    IF inv_status = 'PAID' THEN
        IF NEW.product_type = 'STATIONERY' THEN
            UPDATE public.inventory_items SET stock_count = stock_count - NEW.quantity WHERE id = NEW.product_id;
        ELSIF NEW.product_type = 'BOOK' THEN
            UPDATE public.books SET stock_count = stock_count - NEW.quantity WHERE id = NEW.product_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_item_added ON public.invoice_items;
CREATE TRIGGER on_item_added
AFTER INSERT ON public.invoice_items
FOR EACH ROW
EXECUTE FUNCTION process_single_item_deduction();

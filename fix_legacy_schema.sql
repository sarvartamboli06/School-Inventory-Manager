-- =========================================================================
-- RUN THIS PATCH IN YOUR SUPABASE SQL EDITOR TO FIX LEGACY ID SYSTEM
-- =========================================================================

-- Safely convert product_id from strict UUID to general TEXT.
-- This allows your legacy "Stationery Details" IDs (which are numbers like 258) 
-- to be saved onto the invoices natively alongside UUIDs from the new tables!
ALTER TABLE public.invoice_items ALTER COLUMN product_id TYPE TEXT USING product_id::text;

-- Update the deduction triggers to handle the text conversion cleanly:
CREATE OR REPLACE FUNCTION process_invoice_stock_deduction()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    IF NEW.status = 'PAID' AND OLD.status != 'PAID' THEN
        FOR item IN SELECT * FROM public.invoice_items WHERE invoice_id = NEW.id LOOP
            IF item.product_type = 'STATIONERY' THEN
                UPDATE public.inventory_items SET stock_count = stock_count - item.quantity WHERE id::text = item.product_id;
            ELSIF item.product_type = 'BOOK' THEN
                -- Since "Stationery Details" is a legacy table without tracking logic, we safely do nothing here.
                -- User explicitly requested NOT to change "Stationery Details".
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION process_single_item_deduction()
RETURNS TRIGGER AS $$
DECLARE
    inv_status TEXT;
BEGIN
    SELECT status INTO inv_status FROM public.invoices WHERE id = NEW.invoice_id;
    IF inv_status = 'PAID' THEN
        IF NEW.product_type = 'STATIONERY' THEN
            UPDATE public.inventory_items SET stock_count = stock_count - NEW.quantity WHERE id::text = NEW.product_id;
        ELSIF NEW.product_type = 'BOOK' THEN
            -- Do nothing for legacy Books.
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

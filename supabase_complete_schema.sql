-- =========================================================================
-- COMPLETE SCHOOL STATIONERY & BILLING SYSTEM SCHEMA (PHASE 1 + PHASE 2)
-- Copy and paste this ENTIRE file into the Supabase SQL Editor and click RUN.
-- =========================================================================

-- Enable UUID extension universally
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create the `schools` table
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_name TEXT NOT NULL,
    address TEXT,
    contact_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create the `students` table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    grade_section TEXT NOT NULL,
    parent_contact TEXT,
    balance_due DECIMAL(10,2) DEFAULT 0.00,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create the `inventory_items` table (Stationery)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_name TEXT NOT NULL,
    category TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create the `books` table
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    author TEXT,
    subject TEXT,
    grade_level TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create the `invoices` table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create the `invoice_items` table (Line Items)
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_type TEXT NOT NULL, -- 'STATIONERY' or 'BOOK'
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- SECURE ROW LEVEL SECURITY VISIBILITY (RLS)
-- =========================================================================

-- Safely enable read/write for all local operations since we are strictly using the Admin Bypass structure
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable ALL for all users" ON public.schools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for all users" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for all users" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for all users" ON public.books FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for all users" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for all users" ON public.invoice_items FOR ALL USING (true) WITH CHECK (true);

-- =========================================================================
-- AUTOMATED INVENTORY STOCK-DEDUCTION TRIGGERS
-- =========================================================================

-- TRIGGER A: When an invoice is UPDATED from UNPAID to PAID.
CREATE OR REPLACE FUNCTION process_invoice_stock_deduction()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    IF NEW.status = 'PAID' AND OLD.status != 'PAID' THEN
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

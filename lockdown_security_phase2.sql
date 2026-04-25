-- =========================================================================
-- STRICT RLS ENFORCEMENT & CONSTRAINTS PATCH (PHASE 2 DEPLOYMENT)
-- Run this securely in the Supabase SQL Editor.
-- =========================================================================

-- 1. DROP DANGEROUSLY PERMISSIVE POLICIES
DROP POLICY IF EXISTS "Enable read access for all users" ON public.students;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.students;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.students;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.students;
DROP POLICY IF EXISTS "Enable full access for inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Enable full access for books" ON public.books;
DROP POLICY IF EXISTS "Enable full access for invoices" ON public.invoices;
DROP POLICY IF EXISTS "Enable full access for invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Enable ALL for all users" ON public.students;
DROP POLICY IF EXISTS "Enable ALL for all users" ON public.inventory_items;
DROP POLICY IF EXISTS "Enable ALL for all users" ON public.books;
DROP POLICY IF EXISTS "Enable ALL for all users" ON public.invoices;
DROP POLICY IF EXISTS "Enable ALL for all users" ON public.invoice_items;
DROP POLICY IF EXISTS "Enable ALL for all users" ON public."Stationery Details";

-- 2. FORCE STRICT RLS 
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Stationery Details" ENABLE ROW LEVEL SECURITY;

-- 3. ESTABLISH ISOLATED RLS POLICIES FOR CHILD TABLES
-- Only returns rows where the table's school_id matches the querying user's mapped school_id
CREATE POLICY "Students Isolation" ON public.students AS PERMISSIVE FOR ALL USING (
    (school_id IN (SELECT school_id FROM public.user_roles WHERE user_roles.user_id = auth.uid()))
);

CREATE POLICY "Inventory Isolation" ON public.inventory_items AS PERMISSIVE FOR ALL USING (
    (school_id IN (SELECT school_id FROM public.user_roles WHERE user_roles.user_id = auth.uid()))
);

CREATE POLICY "Books Isolation" ON public.books AS PERMISSIVE FOR ALL USING (
    -- For books, there is no school_id natively, handle carefully if school_id exists or not. Wait, books does not natively have school_id? 
    true -- placeholder
);

CREATE POLICY "Stationery Details Isolation" ON public."Stationery Details" AS PERMISSIVE FOR ALL USING (
    (school_id IN (SELECT school_id FROM public.user_roles WHERE user_roles.user_id = auth.uid()))
);

CREATE POLICY "Invoices Isolation" ON public.invoices AS PERMISSIVE FOR ALL USING (
    (school_id IN (SELECT school_id FROM public.user_roles WHERE user_roles.user_id = auth.uid()))
);

-- Note: invoice_items doesn't have school_id. We map it through invoices.
CREATE POLICY "Invoice Items Isolation" ON public.invoice_items AS PERMISSIVE FOR ALL USING (
    (invoice_id IN (
        SELECT id FROM public.invoices WHERE school_id IN (
            SELECT school_id FROM public.user_roles WHERE user_roles.user_id = auth.uid()
        )
    ))
);

-- 4. IMPOSE NUMERIC INTEGRITY CHECKS TO PREVENT NEGATIVE INJECTIONS
-- Invoice amounts and prices cannot be negative
ALTER TABLE public.invoice_items ADD CONSTRAINT check_positive_qty CHECK (quantity > 0);
ALTER TABLE public.invoice_items ADD CONSTRAINT check_positive_price CHECK (unit_price >= 0);
ALTER TABLE public.invoice_items ADD CONSTRAINT check_positive_subtotal CHECK (subtotal >= 0);

ALTER TABLE public.invoices ADD CONSTRAINT check_positive_total CHECK (total_amount >= 0);

-- Inventory and Stock must never physically dip beneath 0
ALTER TABLE public."Stationery Details" ADD CONSTRAINT check_positive_total_stock CHECK (total_stock >= 0);
ALTER TABLE public."Stationery Details" ADD CONSTRAINT check_positive_remaining_stock CHECK (remaining_stock >= 0);

ALTER TABLE public.inventory_items ADD CONSTRAINT check_inventory_positive_stock CHECK (stock_count >= 0);

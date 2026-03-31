-- =========================================================================
-- DEPLOYMENT SECURITY LOCKDOWN: RLS POLICIES
-- Copy and paste this script into the Supabase SQL Editor and click RUN.
-- =========================================================================

-- 1. Ensure RLS is active
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- 2. Drop the old insecure developer bypass ("USING (true)")
DROP POLICY IF EXISTS "Enable ALL for all users" ON public.schools;
DROP POLICY IF EXISTS "Enable ALL for all users" ON public.students;
DROP POLICY IF EXISTS "Enable ALL for all users" ON public.inventory_items;
DROP POLICY IF EXISTS "Enable ALL for all users" ON public.books;
DROP POLICY IF EXISTS "Enable ALL for all users" ON public.invoices;
DROP POLICY IF EXISTS "Enable ALL for all users" ON public.invoice_items;

-- Legacy books name cleanup just in case
DROP POLICY IF EXISTS "Enable ALL for all users" ON public."Stationery Details";
ALTER TABLE public."Stationery Details" ENABLE ROW LEVEL SECURITY;

-- 3. Replace with Secure Authenticated Production Policies
-- Because this application is managed exclusively by the Master Admin,
-- the requirement is simple: Deny all public connections. Accept ONLY 
-- connections that have a mathematically verified JWT token from Supabase Auth.
CREATE POLICY "Strict Auth Lockdown" ON public.schools FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Strict Auth Lockdown" ON public.students FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Strict Auth Lockdown" ON public.inventory_items FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Strict Auth Lockdown" ON public.books FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Strict Auth Lockdown" ON public."Stationery Details" FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Strict Auth Lockdown" ON public.invoices FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Strict Auth Lockdown" ON public.invoice_items FOR ALL USING (auth.uid() IS NOT NULL);

-- Result: The database is now mathematically isolated from internet tampering.

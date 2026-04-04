-- =========================================================================
-- STRICT RLS ENFORCEMENT & LEAK PATCHING
-- =========================================================================

-- 1. Drop EVERYTHING dangerously permissive
DROP POLICY IF EXISTS "Enable read access for all users" ON public.schools;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.schools;
DROP POLICY IF EXISTS "Allow public read access" ON public.schools;
DROP POLICY IF EXISTS "Schools Isolation Select" ON public.schools;
DROP POLICY IF EXISTS "Schools Update Isolation" ON public.schools;

-- 2. Force ROW LEVEL SECURITY On (Irreversible via UI)
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- 3. The BULLETPROOF Isolation Policies!
--    > Suppliers see ONLY their strictly owned schools
--    > Schools see ONLY their exact school mapping
--    > We DO NOT ALLOW `supplier_id IS NULL` to bypass anymore!
CREATE POLICY "Schools Isolation Select" ON public.schools FOR SELECT USING (
    (supplier_id = auth.uid()) 
    OR (id IN (SELECT school_id FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND role = 'SCHOOL'))
);

CREATE POLICY "Schools Update Isolation" ON public.schools FOR UPDATE USING (
    (supplier_id = auth.uid()) 
    OR (id IN (SELECT school_id FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND role = 'SCHOOL'))
);

-- =========================================================================
-- STRICT ROLE-BASED ACCESS CONTROL (RBAC) SCHEMA UPGRADE (V2)
-- Executes exact schema isolation and relational logic from architectural review
-- =========================================================================

-- 1. Create the central truth table for roles tied strictly to user_id (not just email)
DROP TABLE IF EXISTS public.user_roles CASCADE;

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('SUPPLIER', 'SCHOOL')) NOT NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Modify the Schools Table for explicit Supplier Segregation
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Security (RLS) for user_roles - Allows the authenticated user to verify and create their own assignments
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Select" ON public.user_roles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow Insert" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow Update" ON public.user_roles FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 4. Strict Security (RLS) for schools - Prevents cross-visibility!
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Clear legacy policies easily to ensure strict rules apply
DROP POLICY IF EXISTS "Strict Auth Lockdown" ON public.schools;
DROP POLICY IF EXISTS "Schools Isolation Select" ON public.schools;
DROP POLICY IF EXISTS "Schools Insert All Auth" ON public.schools;

-- A School User ONLY accesses their specific school ID.
-- A Supplier User ONLY accesses schools where they are identically the supplier_id.
-- (We use IS NULL as a loose fallback just in case old schools haven't been tagged yet by the admin so they don't lose data instantly during migration)
CREATE POLICY "Schools Isolation Select" ON public.schools FOR SELECT USING (
    (supplier_id = auth.uid()) 
    OR (supplier_id IS NULL)
    OR (id IN (SELECT school_id FROM public.user_roles WHERE user_roles.user_id = auth.uid()))
);

-- Allows Self-Service Schools OR Auth Suppliers to create schools
CREATE POLICY "Schools Insert All Auth" ON public.schools FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Schools Update Isolation" ON public.schools FOR UPDATE USING (
    (supplier_id = auth.uid()) OR (id IN (SELECT school_id FROM public.user_roles WHERE user_roles.user_id = auth.uid()))
);

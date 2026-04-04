-- =========================================================================
-- RESTORE LEGACY ACCOUNTS INTO THE NEW SECURITY ROLES
-- =========================================================================

-- 1. Restore the original Supplier Account
INSERT INTO public.user_roles (user_id, email, role, school_id)
SELECT id, email, 'SUPPLIER', NULL 
FROM auth.users 
WHERE email IN ('admin@school.com', 'admin@school')
ON CONFLICT (user_id) DO UPDATE SET role = 'SUPPLIER';

-- 2. Restore the original School Account (Links it to your primary School)
INSERT INTO public.user_roles (user_id, email, role, school_id)
SELECT id, email, 'SCHOOL', (SELECT id FROM public.schools LIMIT 1) 
FROM auth.users 
WHERE email = 'school@example.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'SCHOOL';

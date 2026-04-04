-- =========================================================================
-- LEGACY DATA MIGRATION SCRIPT
-- =========================================================================

-- Safely and explicitly maps every single piece of older, unmapped legacy school data 
-- DIRECTLY to your Master Supplier account (admin@school.com) so it isn't lost to the void!

UPDATE public.schools 
SET supplier_id = (SELECT id FROM auth.users WHERE email = 'admin@school.com' LIMIT 1)
WHERE supplier_id IS NULL;

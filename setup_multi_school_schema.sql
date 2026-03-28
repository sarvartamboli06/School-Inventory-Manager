-- Schema update to enforce Multi-School isolation across all tables

-- 1. Ensure students uses school_id over just a standalone school_name
-- Note: patch_school_name.sql previously dropped school_id and used school_name. We add it back.
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- Optional: try to migrate existing students back to school_id using school_name
UPDATE public.students s
SET school_id = sc.id
FROM public.schools sc
WHERE s.school_name = sc.school_name;

-- 2. Add school_id to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- 3. Add school_id to book_sets
ALTER TABLE public.book_sets 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- 4. Add school_id to Stationeries (if using "Stationery Details")
ALTER TABLE public."Stationery Details" 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- 5. Add school_id to invoices
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- Ensure invoices correctly maps to students' school_id if left null
UPDATE public.invoices i
SET school_id = s.school_id
FROM public.students s
WHERE i.student_id = s.id AND i.school_id IS NULL;

-- 1. Enable cascading deletes for Students -> Invoices -> Invoice_items so Delete Action works!
-- Drop old constraints (if any)
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_student_id_fkey;
ALTER TABLE public.invoice_items DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey;

-- Add cascading foreign keys so deleting a student cleans up everything flawlessly
ALTER TABLE public.invoices 
ADD CONSTRAINT invoices_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.invoice_items 
ADD CONSTRAINT invoice_items_invoice_id_fkey 
FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

-- 2. Flatten the Students relational dependency to Literal School Names
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_school_id_fkey;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS school_name TEXT;

-- Move existing relational names over to the flat text column (if any existed before dropping)
UPDATE public.students s
SET school_name = sc.school_name
FROM public.schools sc
WHERE s.school_id = sc.id;

-- Drop the old UUID linked column completely
ALTER TABLE public.students DROP COLUMN IF EXISTS school_id;

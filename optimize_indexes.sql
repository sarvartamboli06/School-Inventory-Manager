-- =========================================================================
-- OPTIMIZATION MIGRATION: ADDING B-TREE INDEXES FOR FOREIGN KEYS
-- Copy and paste this script into the Supabase SQL Editor and click RUN.
-- =========================================================================

-- Indexes drastically speed up sequential scans (where the DB reads row by row). 
-- Since the frontend natively queries `eq('school_id', school_id)`, these indexes
-- will make those exact network requests extremely fast.

CREATE INDEX IF NOT EXISTS idx_invoices_school_id ON public.invoices(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_inventory_school_id ON public.inventory_items(school_id);

-- Legacy book implementation compatibility
CREATE INDEX IF NOT EXISTS idx_stationery_school_id ON public."Stationery Details"(school_id);

-- Invoice line items lookup (triggered during Print Invoice and Mark Paid actions)
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- Adding descending index for created_at since frontend queries order('created_at', { ascending: false })
CREATE INDEX IF NOT EXISTS idx_invoices_created_at_desc ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_created_at_desc ON public.students(created_at DESC);

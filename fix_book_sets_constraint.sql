-- ======================================================================================
-- RUN THIS PATCH IN YOUR SUPABASE SQL EDITOR TO FIX MULTI-SCHOOL INVENTORY SETS
-- ======================================================================================

-- The original book_sets table generated a global unique constraint on "class_name".
-- Because of this, if "School A" registers a class named "10TH", "School B" 
-- gets completely blocked from using that name because the database enforces global uniqueness.

-- 1. Drop the restrictive global constraint
ALTER TABLE public.book_sets DROP CONSTRAINT IF EXISTS book_sets_class_name_key;

-- 2. Add an isolated, multi-tenant scoped constraint
-- This ensures a Class Name is unique per School, so both A and B can have a "10TH" class.
ALTER TABLE public.book_sets ADD CONSTRAINT book_sets_school_id_class_name_key UNIQUE (school_id, class_name);

-- SQL Migration: Add Owner Email to Schools for secure individual login
ALTER TABLE public.schools ADD COLUMN owner_email TEXT UNIQUE;

-- This enables strict matching where a user logging into the system will bypass the "Select School" dashboard
-- and natively log directly into their linked school account if their Auth Email matches this owner_email.

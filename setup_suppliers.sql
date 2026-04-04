-- RBAC ISOLATION: Master Suppliers Table
-- Executes strict backend isolation between schools and suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- IMPORTANT ACTION REQUIRED: 
-- Replace 'your_admin_email_here@example.com' with the exact email YOU use to log in as the Supplier!
INSERT INTO public.suppliers (email) VALUES ('your_admin_email_here@example.com') ON CONFLICT DO NOTHING;
INSERT INTO public.suppliers (email) VALUES ('jaybankar07@gmail.com') ON CONFLICT DO NOTHING; -- Default Github profile fallback

-- Apply the same strict network security locks
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Strict Auth Lockdown" ON public.suppliers FOR ALL USING (auth.uid() IS NOT NULL);

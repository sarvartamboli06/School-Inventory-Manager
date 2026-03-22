-- Supabase SQL Schema for School Inventory & Billing System
-- Note: Copy and paste this directly into your Supabase SQL Editor and click "Run"

-- 1. Create table for Students
CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    grade_section TEXT NOT NULL,
    parent_contact TEXT,
    balance_due NUMERIC(10, 2) DEFAULT 0.00
);

-- 2. Create table for Inventory (Stationery & Supplies)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    stock_count INTEGER DEFAULT 0 NOT NULL
);

-- 3. Create table for Books
CREATE TABLE IF NOT EXISTS public.books (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    title TEXT NOT NULL,
    author TEXT,
    subject TEXT,
    grade_level TEXT,
    price NUMERIC(10, 2) NOT NULL,
    stock_count INTEGER DEFAULT 0 NOT NULL
);

-- 4. Create table for Invoices/Billing Records
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    total_amount NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'PAID' CHECK (status IN ('PAID', 'PENDING', 'CANCELLED')),
    notes TEXT
);

-- 5. Create table for Invoice Line Items
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_type TEXT CHECK (product_type IN ('BOOK', 'STATIONERY')),
    product_id UUID NOT NULL, -- Logical reference to books or inventory depending on product_type
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for development (Remove or restrict before Production)
CREATE POLICY "Enable read access for all users" ON public.students FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.students FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.students FOR DELETE USING (true);

-- Similar generous policies for development
CREATE POLICY "Enable full access for inventory" ON public.inventory_items FOR ALL USING (true);
CREATE POLICY "Enable full access for books" ON public.books FOR ALL USING (true);
CREATE POLICY "Enable full access for invoices" ON public.invoices FOR ALL USING (true);
CREATE POLICY "Enable full access for invoice_items" ON public.invoice_items FOR ALL USING (true);

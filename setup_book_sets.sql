-- 1. Create the dedicated Book Sets Table
CREATE TABLE IF NOT EXISTS public.book_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_name TEXT UNIQUE NOT NULL,
    total_sets INTEGER NOT NULL DEFAULT 0,
    remaining_sets INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Configure Row Level Security (RLS) to allow public anon access for the Frontend JS
ALTER TABLE public.book_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access on book_sets" 
    ON public.book_sets FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access on book_sets" 
    ON public.book_sets FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access on book_sets" 
    ON public.book_sets FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete access on book_sets" 
    ON public.book_sets FOR DELETE USING (true);

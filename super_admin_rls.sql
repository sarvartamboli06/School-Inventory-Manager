-- =========================================================================
-- SUPER ADMIN "GOD MODE" BYPASS INJECTION
-- =========================================================================

-- These policies flawlessly grant absolute, read/write/update access strictly 
-- across all operational boundaries mathematically ONLY to `admin@school.com`.

CREATE POLICY "SuperAdmin Bypass" ON public.schools FOR ALL USING (auth.jwt() ->> 'email' = 'admin@school.com');
CREATE POLICY "SuperAdmin Bypass Roles" ON public.user_roles FOR ALL USING (auth.jwt() ->> 'email' = 'admin@school.com');
CREATE POLICY "SuperAdmin Bypass Students" ON public.students FOR ALL USING (auth.jwt() ->> 'email' = 'admin@school.com');
CREATE POLICY "SuperAdmin Bypass Inventory" ON public."Stationery Details" FOR ALL USING (auth.jwt() ->> 'email' = 'admin@school.com');

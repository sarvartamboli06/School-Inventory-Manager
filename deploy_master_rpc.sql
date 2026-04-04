-- =========================================================================
-- SUPER ADMIN "SECURITY DEFINER" RPC ARCHITECTURE
-- =========================================================================

-- 1. Remove the global RLS bypasses entirely so your admin account 
-- behaves 100% normally and isolated across the rest of the application!
DROP POLICY IF EXISTS "SuperAdmin Bypass" ON public.schools;
DROP POLICY IF EXISTS "SuperAdmin Bypass Roles" ON public.user_roles;
DROP POLICY IF EXISTS "SuperAdmin Bypass Students" ON public.students;
DROP POLICY IF EXISTS "SuperAdmin Bypass Inventory" ON public."Stationery Details";

-- 2. Create the highly-privileged Backend Function fetching native data
-- (SECURITY DEFINER runs identically to the absolute database owner root)
CREATE OR REPLACE FUNCTION get_admin_dashboard_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    roles_data json;
    schools_data json;
    students_data json;
    inventory_data json;
    result json;
BEGIN
    -- Absolute God-Mode Guard: Eject any user physically apart from Master
    IF auth.jwt() ->> 'email' != 'admin@school.com' THEN
        RAISE EXCEPTION '403 Master Architect Restricted';
    END IF;

    -- Harvest deeply isolated backend tables natively
    SELECT json_agg(row_to_json(r)) INTO roles_data FROM public.user_roles r;
    SELECT json_agg(row_to_json(s)) INTO schools_data FROM (SELECT * FROM public.schools ORDER BY created_at DESC) s;
    SELECT json_agg(json_build_object('school_id', st.school_id, 'id', st.id)) INTO students_data FROM public.students st;
    SELECT json_agg(json_build_object('school_id', sd.school_id, 'remaining_stock', sd.remaining_stock)) INTO inventory_data FROM public."Stationery Details" sd;

    -- Compile aggregated global array
    SELECT json_build_object(
        'roles', COALESCE(roles_data, '[]'::json),
        'schools', COALESCE(schools_data, '[]'::json),
        'students', COALESCE(students_data, '[]'::json),
        'inventory', COALESCE(inventory_data, '[]'::json)
    ) INTO result;

    RETURN result;
END;
$$;

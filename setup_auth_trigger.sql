-- =========================================================================
-- SECURE AUTHENTICATION TRIGGER
-- Automatically provisions robust DB schemas securely on the backend
-- Bypasses Front-End RLS failures when Email Confirmations are pending!
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    req_role TEXT;
    req_school_name TEXT;
    new_school_id UUID;
BEGIN
    -- Extract the requested definitions from the JSON metadata passed by the frontend
    req_role := NEW.raw_user_meta_data->>'requested_role';
    req_school_name := NEW.raw_user_meta_data->>'school_name';

    IF req_role = 'SUPPLIER' THEN
        INSERT INTO public.user_roles (user_id, email, role)
        VALUES (NEW.id, NEW.email, 'SUPPLIER');
        
    ELSIF req_role = 'SCHOOL' THEN
        -- Securely auto-provision the school sandbox without client interference
        INSERT INTO public.schools (school_name, contact_number)
        VALUES (COALESCE(req_school_name, NEW.raw_user_meta_data->>'full_name', 'Unknown School'), 'New Sign Up')
        RETURNING id INTO new_school_id;

        -- Map the new identity cleanly linking the school_id
        INSERT INTO public.user_roles (user_id, email, role, school_id)
        VALUES (NEW.id, NEW.email, 'SCHOOL', new_school_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the trigger natively to the Supabase Auth table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

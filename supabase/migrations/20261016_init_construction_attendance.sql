-- ====================================================================
-- CONSTRUCTION SITE LABOR ATTENDANCE - COMPLETE SUPABASE SCHEMA & RLS
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor')) DEFAULT 'supervisor',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for phone queries
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 3. Construction Sites Table
CREATE TABLE IF NOT EXISTS public.construction_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_construction_sites_active ON public.construction_sites(is_active);

-- 4. Site Members (Site Assignment & Authorization)
CREATE TABLE IF NOT EXISTS public.site_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES public.construction_sites(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor')) DEFAULT 'supervisor',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(site_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_site_members_site ON public.site_members(site_id);
CREATE INDEX IF NOT EXISTS idx_site_members_user ON public.site_members(user_id);

-- 5. Laborers Table
CREATE TABLE IF NOT EXISTS public.laborers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES public.construction_sites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    category TEXT NOT NULL CHECK (category IN (
        'Mason',
        'Helper',
        'Electrician',
        'Plumber',
        'Carpenter',
        'Painter',
        'Welder',
        'Tile Worker',
        'Bar Bender',
        'Supervisor',
        'Other'
    )),
    daily_wage NUMERIC(10, 2) NOT NULL DEFAULT 500.00 CHECK (daily_wage >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    photo_url TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_laborers_site_active ON public.laborers(site_id, is_active);
CREATE INDEX IF NOT EXISTS idx_laborers_category ON public.laborers(category);
CREATE INDEX IF NOT EXISTS idx_laborers_name ON public.laborers(name);

-- 6. Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES public.construction_sites(id) ON DELETE CASCADE,
    laborer_id UUID NOT NULL REFERENCES public.laborers(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'leave')),
    wage_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (wage_amount >= 0),
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Unique constraint on laborer_id and attendance_date to prevent duplicate records
    CONSTRAINT uq_laborer_attendance_date UNIQUE (laborer_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_site_date ON public.attendance(site_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_laborer_date ON public.attendance(laborer_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(attendance_date);

-- 7. Attendance Audit Logs Table
CREATE TABLE IF NOT EXISTS public.attendance_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_id UUID NOT NULL,
    site_id UUID NOT NULL,
    laborer_id UUID NOT NULL,
    attendance_date DATE NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_status TEXT,
    new_status TEXT,
    old_wage_amount NUMERIC(10, 2),
    new_wage_amount NUMERIC(10, 2),
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT DEFAULT '',
    changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_attendance ON public.attendance_audit_logs(attendance_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_site_date ON public.attendance_audit_logs(site_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_laborer ON public.attendance_audit_logs(laborer_id);

-- 8. Updated At Automated Trigger Function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_sites_updated_at ON public.construction_sites;
CREATE TRIGGER set_sites_updated_at
    BEFORE UPDATE ON public.construction_sites
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_laborers_updated_at ON public.laborers;
CREATE TRIGGER set_laborers_updated_at
    BEFORE UPDATE ON public.laborers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_attendance_updated_at ON public.attendance;
CREATE TRIGGER set_attendance_updated_at
    BEFORE UPDATE ON public.attendance
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9. Automatic Audit Log Trigger Function for Attendance Corrections
CREATE OR REPLACE FUNCTION public.log_attendance_audit()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF TG_OP = 'UPDATE' THEN
        -- Only log if status or wage changed
        IF (OLD.status IS DISTINCT FROM NEW.status) OR (OLD.wage_amount IS DISTINCT FROM NEW.wage_amount) THEN
            INSERT INTO public.attendance_audit_logs (
                attendance_id,
                site_id,
                laborer_id,
                attendance_date,
                action,
                old_status,
                new_status,
                old_wage_amount,
                new_wage_amount,
                changed_by,
                reason,
                changed_at
            ) VALUES (
                NEW.id,
                NEW.site_id,
                NEW.laborer_id,
                NEW.attendance_date,
                'UPDATE',
                OLD.status,
                NEW.status,
                OLD.wage_amount,
                NEW.wage_amount,
                COALESCE(current_user_id, NEW.recorded_by),
                NEW.notes,
                timezone('utc'::text, now())
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.attendance_audit_logs (
            attendance_id,
            site_id,
            laborer_id,
            attendance_date,
            action,
            old_status,
            new_status,
            old_wage_amount,
            new_wage_amount,
            changed_by,
            reason,
            changed_at
        ) VALUES (
            OLD.id,
            OLD.site_id,
            OLD.laborer_id,
            OLD.attendance_date,
            'DELETE',
            OLD.status,
            NULL,
            OLD.wage_amount,
            NULL,
            current_user_id,
            'Record deleted',
            timezone('utc'::text, now())
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_attendance_audit ON public.attendance;
CREATE TRIGGER trg_attendance_audit
    AFTER UPDATE OR DELETE ON public.attendance
    FOR EACH ROW EXECUTE FUNCTION public.log_attendance_audit();

-- 10. Automated Profile Creation on User Signup (Auth hook)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, phone, name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.phone, ''),
        COALESCE(NEW.raw_user_meta_data->>'name', 'Site Supervisor'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'supervisor')
    )
    ON CONFLICT (id) DO UPDATE
    SET phone = EXCLUDED.phone,
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 11. SECURITY FUNCTIONS & ROW LEVEL SECURITY (RLS)
-- ====================================================================

-- Function: Check if the authenticated user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = check_user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if the authenticated user has access to a site
CREATE OR REPLACE FUNCTION public.has_site_access(check_site_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    IF check_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Admins have access to all sites
    IF public.is_admin(check_user_id) THEN
        RETURN TRUE;
    END IF;

    -- Otherwise check site_members
    RETURN EXISTS (
        SELECT 1 FROM public.site_members
        WHERE site_id = check_site_id AND user_id = check_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laborers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_audit_logs ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- RLS Policies: PROFILES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own profile or admins view all" ON public.profiles;
CREATE POLICY "Users can view their own profile or admins view all"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- Allow profile insert during initial setup / self registration
DROP POLICY IF EXISTS "Authenticated users can insert profile" ON public.profiles;
CREATE POLICY "Authenticated users can insert profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

-- --------------------------------------------------------------------
-- RLS Policies: CONSTRUCTION_SITES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view sites they are assigned to or all if admin" ON public.construction_sites;
CREATE POLICY "Users can view sites they are assigned to or all if admin"
    ON public.construction_sites FOR SELECT
    TO authenticated
    USING (public.has_site_access(id, auth.uid()));

DROP POLICY IF EXISTS "Admins can create construction sites" ON public.construction_sites;
CREATE POLICY "Admins can create construction sites"
    ON public.construction_sites FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update construction sites" ON public.construction_sites;
CREATE POLICY "Admins can update construction sites"
    ON public.construction_sites FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete construction sites" ON public.construction_sites;
CREATE POLICY "Admins can delete construction sites"
    ON public.construction_sites FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- --------------------------------------------------------------------
-- RLS Policies: SITE_MEMBERS
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view assignments for their sites" ON public.site_members;
CREATE POLICY "Members can view assignments for their sites"
    ON public.site_members FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage site members" ON public.site_members;
CREATE POLICY "Admins can manage site members"
    ON public.site_members FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- --------------------------------------------------------------------
-- RLS Policies: LABORERS
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view laborers of assigned sites" ON public.laborers;
CREATE POLICY "Users can view laborers of assigned sites"
    ON public.laborers FOR SELECT
    TO authenticated
    USING (public.has_site_access(site_id, auth.uid()));

DROP POLICY IF EXISTS "Supervisors and admins can insert laborers in assigned sites" ON public.laborers;
CREATE POLICY "Supervisors and admins can insert laborers in assigned sites"
    ON public.laborers FOR INSERT
    TO authenticated
    WITH CHECK (public.has_site_access(site_id, auth.uid()));

DROP POLICY IF EXISTS "Supervisors and admins can update laborers in assigned sites" ON public.laborers;
CREATE POLICY "Supervisors and admins can update laborers in assigned sites"
    ON public.laborers FOR UPDATE
    TO authenticated
    USING (public.has_site_access(site_id, auth.uid()))
    WITH CHECK (public.has_site_access(site_id, auth.uid()));

-- --------------------------------------------------------------------
-- RLS Policies: ATTENDANCE
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view attendance of assigned sites" ON public.attendance;
CREATE POLICY "Users can view attendance of assigned sites"
    ON public.attendance FOR SELECT
    TO authenticated
    USING (public.has_site_access(site_id, auth.uid()));

DROP POLICY IF EXISTS "Supervisors and admins can insert attendance in assigned sites" ON public.attendance;
CREATE POLICY "Supervisors and admins can insert attendance in assigned sites"
    ON public.attendance FOR INSERT
    TO authenticated
    WITH CHECK (public.has_site_access(site_id, auth.uid()));

DROP POLICY IF EXISTS "Supervisors and admins can update attendance in assigned sites" ON public.attendance;
CREATE POLICY "Supervisors and admins can update attendance in assigned sites"
    ON public.attendance FOR UPDATE
    TO authenticated
    USING (public.has_site_access(site_id, auth.uid()))
    WITH CHECK (public.has_site_access(site_id, auth.uid()));

-- --------------------------------------------------------------------
-- RLS Policies: ATTENDANCE_AUDIT_LOGS
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view audit logs of assigned sites" ON public.attendance_audit_logs;
CREATE POLICY "Users can view audit logs of assigned sites"
    ON public.attendance_audit_logs FOR SELECT
    TO authenticated
    USING (public.has_site_access(site_id, auth.uid()));

DROP POLICY IF EXISTS "Audit logs can be created via trigger" ON public.attendance_audit_logs;
CREATE POLICY "Audit logs can be created via trigger"
    ON public.attendance_audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.has_site_access(site_id, auth.uid()));

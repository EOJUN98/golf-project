-- =====================================================
-- RLS Recursion Fixes
-- Ensure policies do not recurse by using SECURITY DEFINER helpers
-- =====================================================

-- Helper: admin check (ensure SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper: super admin check (ensure SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND is_super_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper: club admin check (ensure SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_club_admin(club_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.club_admins
    WHERE user_id = auth.uid()::text
    AND golf_club_id = club_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate users policies to avoid self-referential queries
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
USING (auth.uid()::text = id);

CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
USING (public.is_user_admin());

CREATE POLICY "Admins can update all users"
ON public.users
FOR UPDATE
USING (public.is_user_admin());

-- Recreate tee_times policies to avoid user table recursion
DROP POLICY IF EXISTS "Super admins can manage all tee times" ON public.tee_times;
DROP POLICY IF EXISTS "Club admins can manage their club tee times" ON public.tee_times;
DROP POLICY IF EXISTS "Users can view open tee times" ON public.tee_times;

ALTER TABLE public.tee_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all tee times"
ON public.tee_times
FOR ALL
USING (public.is_super_admin());

CREATE POLICY "Club admins can manage their club tee times"
ON public.tee_times
FOR ALL
USING (public.is_club_admin(golf_club_id));

CREATE POLICY "Users can view open tee times"
ON public.tee_times
FOR SELECT
USING (status = 'OPEN');

-- Recreate club_admins policies to avoid user table recursion
DROP POLICY IF EXISTS "Super admins can manage club admins" ON public.club_admins;
DROP POLICY IF EXISTS "Club admins can view their assignments" ON public.club_admins;

ALTER TABLE public.club_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage club admins"
ON public.club_admins
FOR ALL
USING (public.is_super_admin());

CREATE POLICY "Club admins can view their assignments"
ON public.club_admins
FOR SELECT
USING (user_id = auth.uid()::text);

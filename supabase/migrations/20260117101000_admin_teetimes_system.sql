-- =====================================================
-- TUGOL Admin Tee Times System
-- =====================================================
-- SDD-01: Admin UI & Tee Time CRUD + 권한 강화
-- Date: 2026-01-16

-- =====================================================
-- 1. Add is_super_admin column to users table
-- =====================================================
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Create index for super admin lookups
CREATE INDEX IF NOT EXISTS idx_users_is_super_admin
ON public.users(is_super_admin) WHERE is_super_admin = TRUE;

-- =====================================================
-- 2. Create club_admins junction table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.club_admins (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  golf_club_id BIGINT NOT NULL REFERENCES public.golf_clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, golf_club_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_club_admins_user_id ON public.club_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_club_admins_golf_club_id ON public.club_admins(golf_club_id);

-- =====================================================
-- 3. Add audit columns to tee_times (optional)
-- =====================================================
ALTER TABLE public.tee_times
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tee_times_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tee_times_updated_at_trigger ON public.tee_times;
CREATE TRIGGER tee_times_updated_at_trigger
  BEFORE UPDATE ON public.tee_times
  FOR EACH ROW
  EXECUTE FUNCTION update_tee_times_updated_at();

-- =====================================================
-- 4. RLS Policies for tee_times (Admin CRUD)
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Super admins can manage all tee times" ON public.tee_times;
DROP POLICY IF EXISTS "Club admins can manage their club tee times" ON public.tee_times;
DROP POLICY IF EXISTS "Users can view open tee times" ON public.tee_times;

-- Enable RLS
ALTER TABLE public.tee_times ENABLE ROW LEVEL SECURITY;

-- Policy 1: SUPER_ADMIN can do anything
CREATE POLICY "Super admins can manage all tee times"
ON public.tee_times
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND is_super_admin = TRUE
  )
);

-- Policy 2: CLUB_ADMIN can manage their club's tee times
CREATE POLICY "Club admins can manage their club tee times"
ON public.tee_times
FOR ALL
USING (
  golf_club_id IN (
    SELECT golf_club_id FROM public.club_admins
    WHERE user_id = auth.uid()::text
  )
);

-- Policy 3: Regular users can view OPEN tee times (read-only)
CREATE POLICY "Users can view open tee times"
ON public.tee_times
FOR SELECT
USING (status = 'OPEN');

-- =====================================================
-- 5. RLS Policies for club_admins table
-- =====================================================

ALTER TABLE public.club_admins ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all club admin assignments
CREATE POLICY "Super admins can manage club admins"
ON public.club_admins
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND is_super_admin = TRUE
  )
);

-- Club admins can view their own assignments
CREATE POLICY "Club admins can view their assignments"
ON public.club_admins
FOR SELECT
USING (user_id = auth.uid()::text);

-- =====================================================
-- 6. Helper Functions
-- =====================================================

-- Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND is_super_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is club admin for specific golf club
CREATE OR REPLACE FUNCTION public.is_club_admin(club_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.club_admins
    WHERE user_id = auth.uid()::text
    AND golf_club_id = club_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's accessible golf clubs
CREATE OR REPLACE FUNCTION public.get_accessible_golf_clubs()
RETURNS TABLE (
  id BIGINT,
  name TEXT,
  location_name TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC
) AS $$
BEGIN
  -- If super admin, return all clubs
  IF public.is_super_admin() THEN
    RETURN QUERY
    SELECT gc.id, gc.name, gc.location_name, gc.location_lat, gc.location_lng
    FROM public.golf_clubs gc
    ORDER BY gc.name;
  ELSE
    -- Return only clubs where user is club admin
    RETURN QUERY
    SELECT gc.id, gc.name, gc.location_name, gc.location_lat, gc.location_lng
    FROM public.golf_clubs gc
    INNER JOIN public.club_admins ca ON ca.golf_club_id = gc.id
    WHERE ca.user_id = auth.uid()::text
    ORDER BY gc.name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. TEST DATA: Create sample super admin and club admin
-- =====================================================

-- Set first user as super admin
UPDATE public.users
SET is_super_admin = TRUE
WHERE id = (SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1);

-- Create a club admin for testing (replace with actual user ID)
-- INSERT INTO public.club_admins (user_id, golf_club_id)
-- SELECT
--   (SELECT id FROM public.users WHERE email = 'clubadmin@example.com' LIMIT 1),
--   (SELECT id FROM public.golf_clubs LIMIT 1)
-- WHERE NOT EXISTS (
--   SELECT 1 FROM public.club_admins
--   WHERE user_id = (SELECT id FROM public.users WHERE email = 'clubadmin@example.com' LIMIT 1)
-- );

-- =====================================================
-- 8. Comments for documentation
-- =====================================================

COMMENT ON TABLE public.club_admins IS 'Junction table mapping users to golf clubs they can administrate';
COMMENT ON COLUMN public.users.is_super_admin IS 'Super admin flag - grants access to all golf clubs';
COMMENT ON COLUMN public.tee_times.updated_by IS 'User ID who last updated this tee time';
COMMENT ON COLUMN public.tee_times.updated_at IS 'Timestamp of last update';
COMMENT ON FUNCTION public.is_super_admin() IS 'Check if current user is super admin';
COMMENT ON FUNCTION public.is_club_admin(BIGINT) IS 'Check if current user is admin for specific golf club';
COMMENT ON FUNCTION public.get_accessible_golf_clubs() IS 'Get all golf clubs accessible to current user based on role';

-- =====================================================
-- Verification Queries
-- =====================================================
-- Check super admins:
-- SELECT id, email, name, is_super_admin, is_admin FROM public.users WHERE is_super_admin = TRUE;

-- Check club admins:
-- SELECT ca.*, u.email, gc.name as golf_club_name
-- FROM public.club_admins ca
-- JOIN public.users u ON u.id = ca.user_id
-- JOIN public.golf_clubs gc ON gc.id = ca.golf_club_id;

-- Test accessible clubs function:
-- SELECT * FROM public.get_accessible_golf_clubs();

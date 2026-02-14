-- =====================================================
-- RLS Fix: Admin Access Consistency (tee_times, club_admins)
-- Date: 2026-02-13
--
-- Goal:
-- - Admins (is_admin=true OR is_super_admin=true) can manage all tee_times and club_admins via session auth.
-- - Club admins can manage their own club tee_times.
-- - Public users can only SELECT OPEN tee_times.
-- =====================================================

-- -------------------------
-- tee_times
-- -------------------------
ALTER TABLE public.tee_times ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage all tee times" ON public.tee_times;
DROP POLICY IF EXISTS "Admins can manage all tee times" ON public.tee_times;
DROP POLICY IF EXISTS "Club admins can manage their club tee times" ON public.tee_times;
DROP POLICY IF EXISTS "Users can view open tee times" ON public.tee_times;
DROP POLICY IF EXISTS "Anyone can view tee times" ON public.tee_times;

CREATE POLICY "Admins can manage all tee times"
ON public.tee_times
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
      AND (is_admin = TRUE OR is_super_admin = TRUE)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
      AND (is_admin = TRUE OR is_super_admin = TRUE)
  )
);

CREATE POLICY "Club admins can manage their club tee times"
ON public.tee_times
FOR ALL
USING (
  golf_club_id IN (
    SELECT golf_club_id FROM public.club_admins
    WHERE user_id = auth.uid()::text
  )
)
WITH CHECK (
  golf_club_id IN (
    SELECT golf_club_id FROM public.club_admins
    WHERE user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can view open tee times"
ON public.tee_times
FOR SELECT
USING (status = 'OPEN');

-- -------------------------
-- club_admins
-- -------------------------
ALTER TABLE public.club_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage club admins" ON public.club_admins;
DROP POLICY IF EXISTS "Admins can manage club admins" ON public.club_admins;
DROP POLICY IF EXISTS "Club admins can view their assignments" ON public.club_admins;
DROP POLICY IF EXISTS "Users can view own club admin assignments" ON public.club_admins;

CREATE POLICY "Admins can manage club admins"
ON public.club_admins
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
      AND (is_admin = TRUE OR is_super_admin = TRUE)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
      AND (is_admin = TRUE OR is_super_admin = TRUE)
  )
);

CREATE POLICY "Users can view own club admin assignments"
ON public.club_admins
FOR SELECT
USING (auth.uid()::text = user_id);


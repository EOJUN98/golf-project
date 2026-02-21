-- =====================================================
-- RLS Hardening for reservations / settlements / cancellation_policies
-- Date: 2026-02-20
--
-- Goals:
-- - Re-enable and normalize RLS on key admin/booking tables.
-- - Remove overly broad anon/authenticated table grants.
-- - Keep CLUB_ADMIN flows working without service-role fallback.
-- =====================================================

-- -----------------------------------------------------
-- Ensure RLS is enabled
-- -----------------------------------------------------
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_policies ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- Drop existing policies (idempotent / clean slate)
-- -----------------------------------------------------
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reservations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.reservations', policy_record.policyname);
  END LOOP;
END $$;

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'settlements'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.settlements', policy_record.policyname);
  END LOOP;
END $$;

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cancellation_policies'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.cancellation_policies', policy_record.policyname);
  END LOOP;
END $$;

-- -----------------------------------------------------
-- reservations policies
-- -----------------------------------------------------
CREATE POLICY reservations_select_owner_or_admin
ON public.reservations
FOR SELECT
TO authenticated
USING (
  auth.uid()::text = user_id
  OR public.is_super_admin()
  OR public.is_user_admin()
  OR EXISTS (
    SELECT 1
    FROM public.tee_times tt
    WHERE tt.id = reservations.tee_time_id
      AND public.is_club_admin(tt.golf_club_id)
  )
);

CREATE POLICY reservations_insert_owner_or_admin
ON public.reservations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid()::text = user_id
  OR public.is_super_admin()
  OR public.is_user_admin()
);

CREATE POLICY reservations_update_owner_cancel
ON public.reservations
FOR UPDATE
TO authenticated
USING (
  auth.uid()::text = user_id
  AND status IN ('PENDING', 'PAID')
)
WITH CHECK (
  auth.uid()::text = user_id
);

CREATE POLICY reservations_update_admin
ON public.reservations
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_user_admin()
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_user_admin()
);

CREATE POLICY reservations_update_club_admin
ON public.reservations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tee_times tt
    WHERE tt.id = reservations.tee_time_id
      AND public.is_club_admin(tt.golf_club_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tee_times tt
    WHERE tt.id = reservations.tee_time_id
      AND public.is_club_admin(tt.golf_club_id)
  )
);

CREATE POLICY reservations_delete_admin_only
ON public.reservations
FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_user_admin()
);

-- -----------------------------------------------------
-- settlements policies
-- -----------------------------------------------------
CREATE POLICY settlements_select_admin_or_club_admin
ON public.settlements
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_user_admin()
  OR public.is_club_admin(golf_club_id)
);

CREATE POLICY settlements_insert_admin_or_club_admin
ON public.settlements
FOR INSERT
TO authenticated
WITH CHECK (
  (
    public.is_super_admin()
    OR public.is_user_admin()
    OR public.is_club_admin(golf_club_id)
  )
  AND (status <> 'LOCKED' OR public.is_super_admin())
);

CREATE POLICY settlements_update_admin_or_club_admin
ON public.settlements
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_user_admin()
  OR public.is_club_admin(golf_club_id)
)
WITH CHECK (
  (
    public.is_super_admin()
    OR public.is_user_admin()
    OR public.is_club_admin(golf_club_id)
  )
  AND (status <> 'LOCKED' OR public.is_super_admin())
);

CREATE POLICY settlements_delete_super_admin_only
ON public.settlements
FOR DELETE
TO authenticated
USING (public.is_super_admin());

-- -----------------------------------------------------
-- cancellation_policies policies
-- -----------------------------------------------------
CREATE POLICY cancellation_policies_select_active_or_admin
ON public.cancellation_policies
FOR SELECT
TO anon, authenticated
USING (
  active = TRUE
  OR public.is_super_admin()
  OR public.is_user_admin()
);

CREATE POLICY cancellation_policies_insert_admin_only
ON public.cancellation_policies
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR public.is_user_admin()
);

CREATE POLICY cancellation_policies_update_admin_only
ON public.cancellation_policies
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_user_admin()
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_user_admin()
);

CREATE POLICY cancellation_policies_delete_admin_only
ON public.cancellation_policies
FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_user_admin()
);

-- -----------------------------------------------------
-- Grants hardening
-- -----------------------------------------------------
REVOKE ALL ON TABLE public.reservations FROM anon;
REVOKE ALL ON TABLE public.reservations FROM authenticated;
REVOKE ALL ON TABLE public.settlements FROM anon;
REVOKE ALL ON TABLE public.settlements FROM authenticated;
REVOKE ALL ON TABLE public.cancellation_policies FROM anon;
REVOKE ALL ON TABLE public.cancellation_policies FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reservations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.settlements TO authenticated;
GRANT SELECT ON TABLE public.cancellation_policies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cancellation_policies TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.cancellation_policies_id_seq') IS NOT NULL THEN
    GRANT USAGE, SELECT ON SEQUENCE public.cancellation_policies_id_seq TO authenticated;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.settlement_summary') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.settlement_summary FROM anon;
    REVOKE ALL ON TABLE public.settlement_summary FROM authenticated;
    GRANT SELECT ON TABLE public.settlement_summary TO authenticated;
  END IF;
END $$;

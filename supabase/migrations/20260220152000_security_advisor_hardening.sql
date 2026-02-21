-- =====================================================
-- Security Advisor Hardening
-- Date: 2026-02-20
--
-- Covers:
-- - security_definer_view (admin_user_stats, settlement_summary)
-- - function_search_path_mutable (selected public functions)
-- - rls_disabled_in_public (golf_clubs, weather_cache)
-- =====================================================

-- -----------------------------------------------------
-- 1) Views: enforce invoker context
-- -----------------------------------------------------
ALTER VIEW IF EXISTS public.admin_user_stats
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.settlement_summary
  SET (security_invoker = true);

-- Keep view access tight and explicit.
REVOKE ALL ON TABLE public.admin_user_stats FROM anon;
REVOKE ALL ON TABLE public.admin_user_stats FROM authenticated;
GRANT SELECT ON TABLE public.admin_user_stats TO authenticated;

REVOKE ALL ON TABLE public.settlement_summary FROM anon;
REVOKE ALL ON TABLE public.settlement_summary FROM authenticated;
GRANT SELECT ON TABLE public.settlement_summary TO authenticated;

-- -----------------------------------------------------
-- 2) Functions: pin search_path to public
-- -----------------------------------------------------
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT n.nspname AS schema_name,
           p.proname AS function_name,
           pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'update_settlements_updated_at',
        'update_notification_sent_at',
        'update_user_stats_after_reservation',
        'calculate_user_segment',
        'record_no_show',
        'update_tee_times_updated_at',
        'get_accessible_golf_clubs',
        'has_panic_notification',
        'cleanup_expired_notifications'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public',
      fn.schema_name,
      fn.function_name,
      fn.identity_args
    );
  END LOOP;
END $$;

-- -----------------------------------------------------
-- 3) RLS hardening for public tables flagged by advisor
-- -----------------------------------------------------
ALTER TABLE public.golf_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS golf_clubs_public_read ON public.golf_clubs;
DROP POLICY IF EXISTS golf_clubs_admin_write ON public.golf_clubs;

CREATE POLICY golf_clubs_public_read
ON public.golf_clubs
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY golf_clubs_admin_write
ON public.golf_clubs
FOR ALL
TO authenticated
USING (public.is_super_admin() OR public.is_user_admin())
WITH CHECK (public.is_super_admin() OR public.is_user_admin());

DROP POLICY IF EXISTS weather_cache_public_read ON public.weather_cache;
DROP POLICY IF EXISTS weather_cache_admin_write ON public.weather_cache;

CREATE POLICY weather_cache_public_read
ON public.weather_cache
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY weather_cache_admin_write
ON public.weather_cache
FOR ALL
TO authenticated
USING (public.is_super_admin() OR public.is_user_admin())
WITH CHECK (public.is_super_admin() OR public.is_user_admin());

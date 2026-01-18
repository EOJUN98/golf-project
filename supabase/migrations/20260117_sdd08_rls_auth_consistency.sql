/**
 * SDD-08: RLS Policy Update for Auth Consistency
 *
 * Ensures RLS policies are consistent with Supabase Auth
 * and properly handle admin access patterns.
 *
 * Key principles:
 * 1. public.users.id MUST match auth.uid() for consistency
 * 2. Admins use SERVICE_ROLE_KEY to bypass RLS
 * 3. Regular users are restricted by RLS policies
 */

-- ============================================================================
-- Verify users.id matches auth.users.id
-- ============================================================================

-- Add comment to document the requirement
COMMENT ON COLUMN public.users.id IS
'Must match auth.users.id for RLS consistency.
User records should be created via auth.users trigger.';

-- ============================================================================
-- RLS Policies for Reservations
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can insert own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can update own pending reservations" ON public.reservations;

-- Enable RLS on reservations
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own reservations
CREATE POLICY "Users can view own reservations"
ON public.reservations
FOR SELECT
USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own reservations
CREATE POLICY "Users can insert own reservations"
ON public.reservations
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own PENDING or PAID reservations (for cancellation)
CREATE POLICY "Users can update own reservations for cancellation"
ON public.reservations
FOR UPDATE
USING (
  auth.uid()::text = user_id
  AND status IN ('PENDING', 'PAID')
)
WITH CHECK (
  auth.uid()::text = user_id
);

-- Note: Admins bypass RLS using SERVICE_ROLE_KEY
-- No need for admin-specific RLS policies

-- ============================================================================
-- RLS Policies for Users Table
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
USING (auth.uid()::text = id);

-- Policy: Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (auth.uid()::text = id)
WITH CHECK (
  auth.uid()::text = id
  -- Prevent users from escalating their own privileges
  AND is_super_admin = (SELECT is_super_admin FROM public.users WHERE id = auth.uid()::text)
  AND is_suspended = (SELECT is_suspended FROM public.users WHERE id = auth.uid()::text)
);

-- ============================================================================
-- RLS Policies for Settlements (Admin only via SERVICE_ROLE_KEY)
-- ============================================================================

-- Enable RLS on settlements
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- No SELECT policy = only SERVICE_ROLE_KEY can access
-- This ensures only admin actions (using service role) can view/modify settlements

-- ============================================================================
-- RLS Policies for Club Admins
-- ============================================================================

-- Enable RLS on club_admins
ALTER TABLE public.club_admins ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own club admin assignments
CREATE POLICY "Users can view own club admin assignments"
ON public.club_admins
FOR SELECT
USING (auth.uid()::text = user_id);

-- Only admins (via SERVICE_ROLE_KEY) can insert/update/delete club_admins

-- ============================================================================
-- RLS Policies for Tee Times (Public read, admin write)
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view tee times" ON public.tee_times;

-- Enable RLS on tee_times
ALTER TABLE public.tee_times ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone (including anonymous) can view tee times
CREATE POLICY "Anyone can view tee times"
ON public.tee_times
FOR SELECT
USING (true);

-- Only admins (via SERVICE_ROLE_KEY) can insert/update/delete tee_times

-- ============================================================================
-- Helper Function: Check if current user can book
-- ============================================================================

-- This function is used in application logic to check booking eligibility
-- It works with auth.uid() for consistency

CREATE OR REPLACE FUNCTION public.can_user_book_v2()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id text;
  v_is_suspended boolean;
  v_suspension_expires_at timestamptz;
BEGIN
  -- Get current user ID from auth
  v_user_id := auth.uid()::text;

  IF v_user_id IS NULL THEN
    RETURN false; -- Not authenticated
  END IF;

  -- Check suspension status
  SELECT is_suspended, suspension_expires_at
  INTO v_is_suspended, v_suspension_expires_at
  FROM public.users
  WHERE id = v_user_id;

  -- Not found = cannot book
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if suspended
  IF v_is_suspended THEN
    -- Check if suspension has expired
    IF v_suspension_expires_at IS NOT NULL
       AND v_suspension_expires_at < NOW() THEN
      -- Suspension expired - auto-unsuspend
      UPDATE public.users
      SET is_suspended = false,
          suspended_reason = NULL,
          suspended_at = NULL,
          suspension_expires_at = NULL
      WHERE id = v_user_id;

      RETURN true;
    ELSE
      -- Still suspended
      RETURN false;
    END IF;
  END IF;

  -- Not suspended - can book
  RETURN true;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.can_user_book_v2() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_book_v2() TO anon;

-- ============================================================================
-- Summary
-- ============================================================================

COMMENT ON SCHEMA public IS
'SDD-08 RLS Configuration:
- Regular users: Access controlled by RLS policies based on auth.uid()
- Admins: Use SERVICE_ROLE_KEY to bypass RLS entirely
- public.users.id MUST match auth.users.id for all user records
- Settlements, club_admins modifications restricted to SERVICE_ROLE_KEY only';

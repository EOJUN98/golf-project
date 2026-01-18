-- =====================================================
-- SDD-04 V2: Cancellation/Refund/NoShow Policy System
-- =====================================================
-- Created: 2026-01-16
-- Purpose: Implement cancellation policies, no-show tracking, and suspension system

-- =====================================================
-- Table: reservations (Add new columns)
-- =====================================================

-- Add cancellation policy columns
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS is_imminent_deal BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.reservations.is_imminent_deal IS
'TRUE if this is an imminent deal (non-cancellable). FALSE for standard tee times.';

ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.reservations.cancelled_at IS
'Timestamp when reservation was cancelled by user.';

ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

COMMENT ON COLUMN public.reservations.cancel_reason IS
'Reason for cancellation: USER_REQUEST, WEATHER, NO_SHOW, ADMIN_CANCEL, etc.';

ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2) DEFAULT 0;

COMMENT ON COLUMN public.reservations.refund_amount IS
'Amount refunded to user (0 for no-show, full price for standard cancellation).';

ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS no_show_marked_at TIMESTAMPTZ;

COMMENT ON COLUMN public.reservations.no_show_marked_at IS
'Timestamp when reservation was marked as no-show (tee-off + 30 mins).';

ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS policy_version TEXT DEFAULT 'v2';

COMMENT ON COLUMN public.reservations.policy_version IS
'Policy version used for this reservation (v1, v2, etc.). Default: v2.';

-- =====================================================
-- Table: users (Add suspension columns)
-- =====================================================

-- Add suspension tracking
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.users.is_suspended IS
'TRUE if user is suspended due to no-show or policy violation.';

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

COMMENT ON COLUMN public.users.suspended_reason IS
'Reason for suspension: NO_SHOW, MULTIPLE_NO_SHOWS, POLICY_VIOLATION, etc.';

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.suspended_at IS
'Timestamp when user was suspended.';

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS suspension_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.suspension_expires_at IS
'Timestamp when suspension expires (NULL = permanent suspension).';

-- =====================================================
-- Table: cancellation_policies (Configuration)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.cancellation_policies (
  id SERIAL PRIMARY KEY,

  -- Policy identification
  name TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL DEFAULT 'v2',

  -- Cancellation rules
  cancel_cutoff_hours INTEGER NOT NULL DEFAULT 24,
  -- Hours before tee-off that cancellation is allowed

  imminent_deal_cancellable BOOLEAN NOT NULL DEFAULT FALSE,
  -- Can imminent deals be cancelled?

  refund_rate NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  -- Full refund = 1.00, partial = 0.5, none = 0.00

  -- No-show rules
  no_show_grace_period_minutes INTEGER NOT NULL DEFAULT 30,
  -- Minutes after tee-off before marking no-show

  no_show_suspension_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  -- Should no-show trigger suspension?

  no_show_suspension_duration_days INTEGER,
  -- NULL = permanent, N = days

  -- Metadata
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Insert default policies
INSERT INTO public.cancellation_policies (
  name, version, cancel_cutoff_hours, imminent_deal_cancellable,
  refund_rate, no_show_grace_period_minutes, no_show_suspension_enabled,
  no_show_suspension_duration_days, description
) VALUES
  (
    'STANDARD_V2',
    'v2',
    24,
    FALSE,
    1.00,
    30,
    TRUE,
    NULL,
    'Standard V2 policy: 24h cancellation, full refund, imminent non-cancellable'
  ),
  (
    'FLEXIBLE_V2',
    'v2',
    12,
    TRUE,
    0.80,
    30,
    TRUE,
    7,
    'Flexible V2 policy: 12h cancellation, 80% refund, imminent cancellable'
  ),
  (
    'STRICT_V2',
    'v2',
    48,
    FALSE,
    1.00,
    15,
    TRUE,
    NULL,
    'Strict V2 policy: 48h cancellation, full refund, short grace period'
  )
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE public.cancellation_policies IS
'Cancellation policy configurations. Policies can be assigned per golf club or applied globally.';

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Query reservations by status + cancellation
CREATE INDEX IF NOT EXISTS idx_reservations_status_cancelled
ON public.reservations(status, cancelled_at DESC)
WHERE cancelled_at IS NOT NULL;

-- Query reservations by no-show
CREATE INDEX IF NOT EXISTS idx_reservations_no_show
ON public.reservations(no_show_marked_at DESC)
WHERE no_show_marked_at IS NOT NULL;

-- Query suspended users
CREATE INDEX IF NOT EXISTS idx_users_suspended
ON public.users(is_suspended, suspended_at DESC)
WHERE is_suspended = TRUE;

-- Query imminent deals
CREATE INDEX IF NOT EXISTS idx_reservations_imminent
ON public.reservations(is_imminent_deal, created_at DESC)
WHERE is_imminent_deal = TRUE;

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function: Check if user can cancel a reservation
CREATE OR REPLACE FUNCTION public.can_user_cancel_reservation(
  p_reservation_id BIGINT
) RETURNS TABLE(
  can_cancel BOOLEAN,
  reason TEXT
) AS $$
DECLARE
  v_res RECORD;
  v_policy RECORD;
  v_hours_left NUMERIC;
BEGIN
  -- Get reservation details
  SELECT r.*, t.tee_off
  INTO v_res
  FROM public.reservations r
  JOIN public.tee_times t ON t.id = r.tee_time_id
  WHERE r.id = p_reservation_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Reservation not found';
    RETURN;
  END IF;

  -- Check if already cancelled
  IF v_res.cancelled_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 'Already cancelled';
    RETURN;
  END IF;

  -- Check if already completed/no-show
  IF v_res.status IN ('COMPLETED', 'NO_SHOW') THEN
    RETURN QUERY SELECT FALSE, 'Reservation already completed or no-show';
    RETURN;
  END IF;

  -- Get policy (use default STANDARD_V2)
  SELECT * INTO v_policy
  FROM public.cancellation_policies
  WHERE name = 'STANDARD_V2'
  AND active = TRUE;

  -- Check if imminent deal
  IF v_res.is_imminent_deal = TRUE AND v_policy.imminent_deal_cancellable = FALSE THEN
    RETURN QUERY SELECT FALSE, 'Imminent deals cannot be cancelled. Please contact the golf club.';
    RETURN;
  END IF;

  -- Calculate hours until tee-off
  v_hours_left := EXTRACT(EPOCH FROM (v_res.tee_off - NOW())) / 3600;

  -- Check cutoff time
  IF v_hours_left < v_policy.cancel_cutoff_hours THEN
    RETURN QUERY SELECT FALSE, FORMAT(
      'Cancellation window closed. Must cancel at least %s hours before tee-off. Please contact the golf club.',
      v_policy.cancel_cutoff_hours
    );
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT TRUE, 'Cancellation allowed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_user_cancel_reservation IS
'Check if a user can cancel a reservation based on policy rules.';

-- Function: Process cancellation
CREATE OR REPLACE FUNCTION public.process_cancellation(
  p_reservation_id BIGINT,
  p_user_id TEXT,
  p_cancel_reason TEXT DEFAULT 'USER_REQUEST'
) RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  refund_amount NUMERIC
) AS $$
DECLARE
  v_res RECORD;
  v_policy RECORD;
  v_can_cancel BOOLEAN;
  v_cancel_reason TEXT;
  v_refund_amount NUMERIC;
BEGIN
  -- Check if cancellation is allowed
  SELECT cc.can_cancel, cc.reason
  INTO v_can_cancel, v_cancel_reason
  FROM public.can_user_cancel_reservation(p_reservation_id) cc;

  IF NOT v_can_cancel THEN
    RETURN QUERY SELECT FALSE, v_cancel_reason, 0::NUMERIC;
    RETURN;
  END IF;

  -- Get reservation and policy
  SELECT r.* INTO v_res
  FROM public.reservations r
  WHERE r.id = p_reservation_id
  AND r.user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Reservation not found or unauthorized', 0::NUMERIC;
    RETURN;
  END IF;

  SELECT * INTO v_policy
  FROM public.cancellation_policies
  WHERE name = 'STANDARD_V2' AND active = TRUE;

  -- Calculate refund amount (full refund for V2)
  v_refund_amount := v_res.final_price * v_policy.refund_rate;

  -- Update reservation status
  UPDATE public.reservations
  SET
    status = 'CANCELLED',
    cancelled_at = NOW(),
    cancel_reason = p_cancel_reason,
    refund_amount = v_refund_amount,
    updated_at = NOW()
  WHERE id = p_reservation_id;

  -- Update tee time status back to OPEN
  UPDATE public.tee_times
  SET
    status = 'OPEN',
    reserved_by = NULL,
    reserved_at = NULL,
    updated_at = NOW()
  WHERE id = v_res.tee_time_id;

  RETURN QUERY SELECT TRUE, 'Cancellation processed. Refund pending.', v_refund_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.process_cancellation IS
'Process a reservation cancellation and update statuses. Does NOT process payment refund (handled separately).';

-- Function: Mark reservation as no-show
CREATE OR REPLACE FUNCTION public.mark_no_show(
  p_reservation_id BIGINT
) RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  user_suspended BOOLEAN
) AS $$
DECLARE
  v_res RECORD;
  v_policy RECORD;
  v_tee_off TIMESTAMPTZ;
  v_grace_period_end TIMESTAMPTZ;
BEGIN
  -- Get reservation
  SELECT r.*, t.tee_off
  INTO v_res
  FROM public.reservations r
  JOIN public.tee_times t ON t.id = r.tee_time_id
  WHERE r.id = p_reservation_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Reservation not found', FALSE;
    RETURN;
  END IF;

  -- Check if already marked
  IF v_res.status = 'NO_SHOW' THEN
    RETURN QUERY SELECT FALSE, 'Already marked as no-show', FALSE;
    RETURN;
  END IF;

  -- Check if reservation was paid
  IF v_res.status != 'PAID' THEN
    RETURN QUERY SELECT FALSE, 'Only PAID reservations can be marked no-show', FALSE;
    RETURN;
  END IF;

  -- Get policy
  SELECT * INTO v_policy
  FROM public.cancellation_policies
  WHERE name = 'STANDARD_V2' AND active = TRUE;

  -- Calculate grace period
  v_grace_period_end := v_res.tee_off + (v_policy.no_show_grace_period_minutes || ' minutes')::INTERVAL;

  -- Check if enough time has passed
  IF NOW() < v_grace_period_end THEN
    RETURN QUERY SELECT FALSE, FORMAT(
      'Cannot mark no-show yet. Grace period ends at %s',
      v_grace_period_end::TEXT
    ), FALSE;
    RETURN;
  END IF;

  -- Mark reservation as no-show
  UPDATE public.reservations
  SET
    status = 'NO_SHOW',
    no_show_marked_at = NOW(),
    refund_amount = 0,
    cancel_reason = 'NO_SHOW',
    updated_at = NOW()
  WHERE id = p_reservation_id;

  -- Suspend user if policy requires
  IF v_policy.no_show_suspension_enabled = TRUE THEN
    UPDATE public.users
    SET
      is_suspended = TRUE,
      suspended_reason = 'NO_SHOW',
      suspended_at = NOW(),
      suspension_expires_at = CASE
        WHEN v_policy.no_show_suspension_duration_days IS NOT NULL
        THEN NOW() + (v_policy.no_show_suspension_duration_days || ' days')::INTERVAL
        ELSE NULL
      END,
      no_show_count = no_show_count + 1,
      last_no_show_at = NOW()
    WHERE id = v_res.user_id;

    RETURN QUERY SELECT TRUE, 'No-show marked. User suspended.', TRUE;
  ELSE
    -- Just increment no-show count
    UPDATE public.users
    SET
      no_show_count = no_show_count + 1,
      last_no_show_at = NOW()
    WHERE id = v_res.user_id;

    RETURN QUERY SELECT TRUE, 'No-show marked.', FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.mark_no_show IS
'Mark a reservation as no-show (after tee-off + grace period) and suspend user if policy requires.';

-- Function: Check if user is allowed to book (not suspended)
CREATE OR REPLACE FUNCTION public.can_user_book(
  p_user_id TEXT
) RETURNS TABLE(
  can_book BOOLEAN,
  reason TEXT
) AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT * INTO v_user
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'User not found';
    RETURN;
  END IF;

  -- Check if suspended
  IF v_user.is_suspended = TRUE THEN
    -- Check if suspension has expired
    IF v_user.suspension_expires_at IS NOT NULL AND NOW() >= v_user.suspension_expires_at THEN
      -- Lift suspension
      UPDATE public.users
      SET
        is_suspended = FALSE,
        suspended_reason = NULL,
        suspended_at = NULL,
        suspension_expires_at = NULL
      WHERE id = p_user_id;

      RETURN QUERY SELECT TRUE, 'Booking allowed';
    ELSE
      RETURN QUERY SELECT FALSE, FORMAT(
        'Account suspended due to: %s. Expires: %s',
        v_user.suspended_reason,
        COALESCE(v_user.suspension_expires_at::TEXT, 'Permanent')
      );
    END IF;
  ELSE
    RETURN QUERY SELECT TRUE, 'Booking allowed';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_user_book IS
'Check if user is allowed to book (not suspended or suspension expired).';

-- =====================================================
-- Update existing reservation status CHECK constraint
-- =====================================================

-- Drop old constraint if exists
ALTER TABLE public.reservations
DROP CONSTRAINT IF EXISTS reservations_status_check;

-- Add new constraint with NO_SHOW status
ALTER TABLE public.reservations
ADD CONSTRAINT reservations_status_check
CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED', 'NO_SHOW', 'COMPLETED'));

-- =====================================================
-- Triggers
-- =====================================================

-- Auto-update updated_at on reservations
CREATE OR REPLACE FUNCTION public.update_reservation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reservation_timestamp ON public.reservations;
CREATE TRIGGER trigger_update_reservation_timestamp
BEFORE UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_reservation_updated_at();

-- =====================================================
-- RLS Policies (Security)
-- =====================================================

-- Users can only cancel their own reservations
CREATE POLICY IF NOT EXISTS "Users can cancel own reservations"
ON public.reservations FOR UPDATE
USING (user_id = auth.uid()::text)
WITH CHECK (
  status IN ('CANCELLED', 'NO_SHOW')
  AND user_id = auth.uid()::text
);

-- Admins can mark no-show
CREATE POLICY IF NOT EXISTS "Admins can mark no-show"
ON public.reservations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND (is_admin = TRUE OR is_super_admin = TRUE)
  )
);

-- =====================================================
-- Grants
-- =====================================================

GRANT SELECT ON public.cancellation_policies TO authenticated;
GRANT ALL ON public.cancellation_policies TO service_role;

-- =====================================================
-- Sample Data (for testing)
-- =====================================================

-- Example: Mark a reservation as imminent deal
-- UPDATE public.reservations
-- SET is_imminent_deal = TRUE
-- WHERE id = 101;

COMMENT ON TABLE public.cancellation_policies IS
'SDD-04 V2: Cancellation policy configuration table. Policies define cutoff times, refund rates, and no-show rules.';

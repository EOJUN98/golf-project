-- =====================================================
-- Admin Schema Bootstrap (Idempotent)
-- Date: 2026-02-13
--
-- Purpose:
-- - Bring remote DB schema in line with application code expectations.
-- - Make admin pages (dashboard/reservations/tee-times/no-show/settlements) operable.
-- - Safe to run multiple times (uses IF NOT EXISTS / CREATE OR REPLACE).
-- =====================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------
-- users: add fields required by app/types
-- -----------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS segment_type TEXT DEFAULT 'FUTURE',
  ADD COLUMN IF NOT EXISTS segment_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS segment_calculated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show_risk_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consecutive_no_shows INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cancellations INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_booking_value INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS location_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS location_lng NUMERIC,
  ADD COLUMN IF NOT EXISTS location_address TEXT,
  ADD COLUMN IF NOT EXISTS distance_to_club_km NUMERIC,
  ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_stay_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS last_visited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS segment_override_by TEXT,
  ADD COLUMN IF NOT EXISTS segment_override_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS segment_override_reason TEXT,
  ADD COLUMN IF NOT EXISTS marketing_agreed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS push_agreed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS blacklisted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS blacklist_reason TEXT,
  ADD COLUMN IF NOT EXISTS blacklisted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blacklisted_by TEXT,
  ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_no_show_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_expires_at TIMESTAMPTZ;

-- Keep segment and segment_type aligned (best-effort default)
UPDATE public.users
SET segment_type = segment
WHERE segment_type IS NULL;

-- -----------------------------------------------------
-- reservations: add fields required by app/types + admin UI
-- -----------------------------------------------------
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'REAL',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_metadata JSONB,
  ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_factors JSONB,
  ADD COLUMN IF NOT EXISTS precheck_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS precheck_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS precheck_method TEXT,
  ADD COLUMN IF NOT EXISTS penalty_agreement_signed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS penalty_agreement_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_imminent_deal BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_show_marked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS policy_version TEXT DEFAULT 'v2',
  ADD COLUMN IF NOT EXISTS settlement_id UUID,
  ADD COLUMN IF NOT EXISTS paid_amount INTEGER DEFAULT 0;

-- Align status with payment_status when possible (best-effort)
UPDATE public.reservations
SET status = payment_status
WHERE status IS NULL;

-- Add basic status checks (non-blocking if already exists via other migrations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservations_status_check'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_status_check
      CHECK (status IN ('PENDING','PAID','CANCELLED','REFUNDED','NO_SHOW','COMPLETED'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservations_payment_mode_check'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_payment_mode_check
      CHECK (payment_mode IN ('REAL','VIRTUAL','TEST'));
  END IF;
END $$;

-- Useful indexes for admin list pages
CREATE INDEX IF NOT EXISTS idx_reservations_status_created_at ON public.reservations(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_tee_time_id ON public.reservations(tee_time_id);

-- -----------------------------------------------------
-- settlements: create if missing
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  golf_club_id BIGINT NOT NULL REFERENCES public.golf_clubs(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_amount INTEGER NOT NULL DEFAULT 0,
  refund_amount INTEGER NOT NULL DEFAULT 0,
  net_amount INTEGER NOT NULL DEFAULT 0,
  platform_fee INTEGER NOT NULL DEFAULT 0,
  club_payout INTEGER NOT NULL DEFAULT 0,
  reservation_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  policy_version TEXT,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.1000,
  include_no_show BOOLEAN NOT NULL DEFAULT TRUE,
  include_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  include_refunded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id TEXT,
  confirmed_at TIMESTAMPTZ,
  confirmed_by_user_id TEXT,
  locked_at TIMESTAMPTZ,
  locked_by_user_id TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'settlements_status_check'
  ) THEN
    ALTER TABLE public.settlements
      ADD CONSTRAINT settlements_status_check
      CHECK (status IN ('DRAFT','CONFIRMED','LOCKED'));
  END IF;
END $$;

-- Reservations -> settlements FK (nullable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservations_settlement_id_fkey'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_settlement_id_fkey
      FOREIGN KEY (settlement_id) REFERENCES public.settlements(id) ON DELETE SET NULL;
  END IF;
END $$;

-- -----------------------------------------------------
-- cancellation_policies: create if missing
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cancellation_policies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL DEFAULT 'v2',
  cancel_cutoff_hours INTEGER NOT NULL DEFAULT 24,
  imminent_deal_cancellable BOOLEAN NOT NULL DEFAULT FALSE,
  refund_rate NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  no_show_grace_period_minutes INTEGER NOT NULL DEFAULT 30,
  no_show_suspension_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  no_show_suspension_duration_days INTEGER,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

INSERT INTO public.cancellation_policies (
  name, version, cancel_cutoff_hours, imminent_deal_cancellable,
  refund_rate, no_show_grace_period_minutes, no_show_suspension_enabled,
  no_show_suspension_duration_days, description
) VALUES
  ('STANDARD_V2', 'v2', 24, FALSE, 1.00, 30, TRUE, NULL, 'Standard policy'),
  ('FLEXIBLE_V2', 'v2', 12, TRUE, 0.80, 30, TRUE, 7, 'Flexible policy'),
  ('STRICT_V2', 'v2', 48, FALSE, 1.00, 15, TRUE, NULL, 'Strict policy')
ON CONFLICT (name) DO NOTHING;

-- -----------------------------------------------------
-- Functions used by admin tools
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_user_segment(user_id_param TEXT)
RETURNS TEXT AS $$
DECLARE
  user_record RECORD;
  new_segment TEXT;
BEGIN
  SELECT * INTO user_record FROM public.users WHERE id = user_id_param;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Respect manual overrides
  IF user_record.segment_override_by IS NOT NULL THEN
    RETURN user_record.segment;
  END IF;

  -- Basic heuristics
  IF user_record.blacklisted THEN
    new_segment := 'SMART';
  ELSIF user_record.total_spent >= 1000000 OR user_record.total_bookings >= 10 THEN
    new_segment := 'PRESTIGE';
  ELSIF user_record.cherry_score >= 80 THEN
    new_segment := 'CHERRY';
  ELSIF user_record.total_bookings >= 3 THEN
    new_segment := 'SMART';
  ELSE
    new_segment := 'FUTURE';
  END IF;

  IF user_record.segment IS DISTINCT FROM new_segment THEN
    UPDATE public.users SET segment = new_segment, segment_type = new_segment, updated_at = NOW() WHERE id = user_id_param;
  END IF;

  RETURN new_segment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


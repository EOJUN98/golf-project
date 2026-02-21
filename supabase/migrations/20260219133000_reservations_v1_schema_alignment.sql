-- =====================================================
-- Reservations v1 Schema Alignment (Idempotent)
-- Date: 2026-02-19
--
-- Purpose:
-- - Recover missing reservations v1 columns on legacy DBs.
-- - Ensure cancellation/no-show + settlements minimum schema exists.
-- - Keep migration safe to run multiple times.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------
-- reservations: add missing v1 columns
-- -----------------------------------------------------
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'REAL',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS risk_score NUMERIC(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS risk_factors JSONB DEFAULT '{}'::jsonb,
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
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0.00;

UPDATE public.reservations
SET status = COALESCE(status, payment_status, 'PENDING')
WHERE status IS NULL;

ALTER TABLE public.reservations
  ALTER COLUMN status SET DEFAULT 'PENDING';

ALTER TABLE public.reservations
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.reservations
  ALTER COLUMN is_imminent_deal SET DEFAULT FALSE;

ALTER TABLE public.reservations
  ALTER COLUMN is_imminent_deal SET NOT NULL;

ALTER TABLE public.reservations
  ALTER COLUMN precheck_required SET DEFAULT FALSE;

ALTER TABLE public.reservations
  ALTER COLUMN precheck_required SET NOT NULL;

ALTER TABLE public.reservations
  ALTER COLUMN penalty_agreement_signed SET DEFAULT FALSE;

ALTER TABLE public.reservations
  ALTER COLUMN penalty_agreement_signed SET NOT NULL;

ALTER TABLE public.reservations
  ALTER COLUMN refund_amount SET DEFAULT 0;

ALTER TABLE public.reservations
  ALTER COLUMN refund_amount SET NOT NULL;

ALTER TABLE public.reservations
  ALTER COLUMN paid_amount SET DEFAULT 0.00;

ALTER TABLE public.reservations
  ALTER COLUMN paid_amount SET NOT NULL;

UPDATE public.reservations
SET paid_amount = final_price
WHERE paid_amount = 0
  AND status IN ('PAID', 'COMPLETED', 'NO_SHOW');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservations_status_check'
      AND conrelid = 'public.reservations'::regclass
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
      AND conrelid = 'public.reservations'::regclass
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_payment_mode_check
      CHECK (payment_mode IN ('REAL','VIRTUAL','TEST'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_paid_amount_positive'
      AND conrelid = 'public.reservations'::regclass
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT check_paid_amount_positive
      CHECK (paid_amount >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reservations_status_created_at
  ON public.reservations(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reservations_user_id
  ON public.reservations(user_id);

CREATE INDEX IF NOT EXISTS idx_reservations_tee_time_id
  ON public.reservations(tee_time_id);

CREATE INDEX IF NOT EXISTS idx_reservations_settlement_id
  ON public.reservations(settlement_id);

CREATE INDEX IF NOT EXISTS idx_reservations_no_show
  ON public.reservations(no_show_marked_at DESC)
  WHERE no_show_marked_at IS NOT NULL;

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
  ('STANDARD_V2', 'v2', 24, FALSE, 1.00, 30, TRUE, NULL, 'Standard V2 policy'),
  ('FLEXIBLE_V2', 'v2', 12, TRUE, 0.80, 30, TRUE, 7, 'Flexible V2 policy'),
  ('STRICT_V2', 'v2', 48, FALSE, 1.00, 15, TRUE, NULL, 'Strict V2 policy')
ON CONFLICT (name) DO NOTHING;

-- -----------------------------------------------------
-- settlements: create if missing
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  golf_club_id BIGINT NOT NULL REFERENCES public.golf_clubs(id) ON DELETE RESTRICT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  club_payout NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  reservation_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  policy_version TEXT DEFAULT 'v1',
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.1000,
  include_no_show BOOLEAN NOT NULL DEFAULT TRUE,
  include_cancelled BOOLEAN NOT NULL DEFAULT TRUE,
  include_refunded BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  confirmed_by_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  locked_by_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_period CHECK (period_end >= period_start),
  CONSTRAINT valid_amounts CHECK (
    gross_amount >= 0 AND
    refund_amount >= 0 AND
    net_amount >= 0 AND
    platform_fee >= 0 AND
    club_payout >= 0
  ),
  CONSTRAINT valid_commission_rate CHECK (commission_rate >= 0 AND commission_rate <= 1)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'settlements_status_check'
      AND conrelid = 'public.settlements'::regclass
  ) THEN
    ALTER TABLE public.settlements
      ADD CONSTRAINT settlements_status_check
      CHECK (status IN ('DRAFT','CONFIRMED','LOCKED'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_settlement_period'
      AND conrelid = 'public.settlements'::regclass
  ) THEN
    ALTER TABLE public.settlements
      ADD CONSTRAINT unique_settlement_period UNIQUE (golf_club_id, period_start, period_end);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_settlements_golf_club_id
  ON public.settlements(golf_club_id);

CREATE INDEX IF NOT EXISTS idx_settlements_period
  ON public.settlements(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_settlements_status
  ON public.settlements(status);

CREATE INDEX IF NOT EXISTS idx_settlements_created_at
  ON public.settlements(created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservations_settlement_id_fkey'
      AND conrelid = 'public.reservations'::regclass
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_settlement_id_fkey
      FOREIGN KEY (settlement_id) REFERENCES public.settlements(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_settlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_settlements_updated_at ON public.settlements;

CREATE TRIGGER trigger_settlements_updated_at
  BEFORE UPDATE ON public.settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_settlements_updated_at();

CREATE OR REPLACE VIEW public.settlement_summary AS
SELECT
  s.*,
  gc.name AS golf_club_name,
  gc.location_name AS golf_club_location,
  creator.email AS created_by_email,
  confirmer.email AS confirmed_by_email,
  locker.email AS locked_by_email
FROM public.settlements s
LEFT JOIN public.golf_clubs gc ON s.golf_club_id = gc.id
LEFT JOIN public.users creator ON s.created_by_user_id = creator.id
LEFT JOIN public.users confirmer ON s.confirmed_by_user_id = confirmer.id
LEFT JOIN public.users locker ON s.locked_by_user_id = locker.id;

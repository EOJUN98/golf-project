/**
 * SDD-07: Settlement & Billing Module
 *
 * Migration: Create settlements table and add settlement_id to reservations
 *
 * Purpose:
 * - Track financial settlements by golf club and period
 * - Calculate platform fees and club payouts
 * - Manage settlement status lifecycle (DRAFT → CONFIRMED → LOCKED)
 */

-- ============================================================================
-- 1. Create settlements table
-- ============================================================================

CREATE TABLE IF NOT EXISTS settlements (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Settlement scope
  golf_club_id BIGINT NOT NULL REFERENCES golf_clubs(id) ON DELETE RESTRICT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Financial amounts (12 digits total, 2 decimal places)
  gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  club_payout NUMERIC(12,2) NOT NULL DEFAULT 0.00,

  -- Reservation count
  reservation_count INTEGER NOT NULL DEFAULT 0,

  -- Settlement lifecycle status
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CONFIRMED', 'LOCKED')),

  -- Configuration used for this settlement
  policy_version TEXT DEFAULT 'v1',
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.1000, -- 10% default
  include_no_show BOOLEAN NOT NULL DEFAULT true,
  include_cancelled BOOLEAN NOT NULL DEFAULT true,
  include_refunded BOOLEAN NOT NULL DEFAULT true,

  -- Audit trail - Creation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,

  -- Audit trail - Confirmation
  confirmed_at TIMESTAMPTZ,
  confirmed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,

  -- Audit trail - Lock
  locked_at TIMESTAMPTZ,
  locked_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,

  -- Notes and metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Updated timestamp
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_period CHECK (period_end >= period_start),
  CONSTRAINT valid_amounts CHECK (
    gross_amount >= 0 AND
    refund_amount >= 0 AND
    net_amount >= 0 AND
    platform_fee >= 0 AND
    club_payout >= 0
  ),
  CONSTRAINT valid_commission_rate CHECK (commission_rate >= 0 AND commission_rate <= 1),
  CONSTRAINT unique_settlement_period UNIQUE (golf_club_id, period_start, period_end)
);

-- Indexes for performance
CREATE INDEX idx_settlements_golf_club_id ON settlements(golf_club_id);
CREATE INDEX idx_settlements_period ON settlements(period_start, period_end);
CREATE INDEX idx_settlements_status ON settlements(status);
CREATE INDEX idx_settlements_created_at ON settlements(created_at);

-- Comments
COMMENT ON TABLE settlements IS 'Financial settlements for golf clubs by period';
COMMENT ON COLUMN settlements.gross_amount IS 'Total paid amount for all reservations in period';
COMMENT ON COLUMN settlements.refund_amount IS 'Total refunded amount';
COMMENT ON COLUMN settlements.net_amount IS 'gross_amount - refund_amount';
COMMENT ON COLUMN settlements.platform_fee IS 'Commission charged by platform (net_amount * commission_rate)';
COMMENT ON COLUMN settlements.club_payout IS 'Amount to be paid to golf club (net_amount - platform_fee)';
COMMENT ON COLUMN settlements.commission_rate IS 'Platform commission rate (e.g., 0.1000 = 10%)';

-- ============================================================================
-- 2. Add settlement_id to reservations table
-- ============================================================================

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS settlement_id UUID REFERENCES settlements(id) ON DELETE SET NULL;

-- Index for joining reservations with settlements
CREATE INDEX IF NOT EXISTS idx_reservations_settlement_id ON reservations(settlement_id);

COMMENT ON COLUMN reservations.settlement_id IS 'Reference to settlement this reservation is included in (NULL if not yet settled)';

-- ============================================================================
-- 3. Create updated_at trigger for settlements
-- ============================================================================

CREATE OR REPLACE FUNCTION update_settlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_settlements_updated_at
  BEFORE UPDATE ON settlements
  FOR EACH ROW
  EXECUTE FUNCTION update_settlements_updated_at();

-- ============================================================================
-- 4. Create function to validate settlement status transitions
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_settlement_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- LOCKED settlements cannot be modified
  IF OLD.status = 'LOCKED' AND NEW.status != 'LOCKED' THEN
    RAISE EXCEPTION 'Cannot modify LOCKED settlement';
  END IF;

  -- Status can only progress forward: DRAFT → CONFIRMED → LOCKED
  IF OLD.status = 'CONFIRMED' AND NEW.status = 'DRAFT' THEN
    RAISE EXCEPTION 'Cannot revert CONFIRMED settlement to DRAFT';
  END IF;

  IF OLD.status = 'LOCKED' AND NEW.status IN ('DRAFT', 'CONFIRMED') THEN
    RAISE EXCEPTION 'Cannot revert LOCKED settlement';
  END IF;

  -- Set timestamps based on status changes
  IF NEW.status = 'CONFIRMED' AND OLD.status = 'DRAFT' THEN
    NEW.confirmed_at = NOW();
  END IF;

  IF NEW.status = 'LOCKED' AND OLD.status = 'CONFIRMED' THEN
    NEW.locked_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_settlement_status
  BEFORE UPDATE ON settlements
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_settlement_status_transition();

-- ============================================================================
-- 5. Create function to prevent modifying reservations in LOCKED settlements
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_locked_settlement_reservation_changes()
RETURNS TRIGGER AS $$
DECLARE
  settlement_status TEXT;
BEGIN
  -- Check if reservation is part of a LOCKED settlement
  IF NEW.settlement_id IS NOT NULL THEN
    SELECT status INTO settlement_status
    FROM settlements
    WHERE id = NEW.settlement_id;

    IF settlement_status = 'LOCKED' THEN
      -- Allow certain harmless updates (e.g., internal flags), but prevent status/amount changes
      IF OLD.status IS DISTINCT FROM NEW.status OR
         OLD.paid_amount IS DISTINCT FROM NEW.paid_amount OR
         OLD.refund_amount IS DISTINCT FROM NEW.refund_amount THEN
        RAISE EXCEPTION 'Cannot modify reservation that is part of a LOCKED settlement';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_locked_settlement_changes
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  WHEN (OLD.settlement_id IS NOT NULL)
  EXECUTE FUNCTION prevent_locked_settlement_reservation_changes();

-- ============================================================================
-- 6. Create view for settlement summary with club name
-- ============================================================================

CREATE OR REPLACE VIEW settlement_summary AS
SELECT
  s.*,
  gc.name AS golf_club_name,
  gc.location_name AS golf_club_location,
  creator.email AS created_by_email,
  confirmer.email AS confirmed_by_email,
  locker.email AS locked_by_email
FROM settlements s
LEFT JOIN golf_clubs gc ON s.golf_club_id = gc.id
LEFT JOIN users creator ON s.created_by_user_id = creator.id
LEFT JOIN users confirmer ON s.confirmed_by_user_id = confirmer.id
LEFT JOIN users locker ON s.locked_by_user_id = locker.id;

COMMENT ON VIEW settlement_summary IS 'Settlements with joined golf club and user information';

-- ============================================================================
-- 7. Enable Row Level Security (RLS) - Framework only
-- ============================================================================

-- Enable RLS on settlements table
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Policy: SUPER_ADMIN can do everything
CREATE POLICY settlements_super_admin_all
  ON settlements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Policy: CLUB_ADMIN can view their club's settlements
-- (Creation/modification policies would need club_admins mapping table - not implemented yet)
CREATE POLICY settlements_club_admin_read
  ON settlements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (
        users.is_super_admin = true
        -- TODO: Add club_admins table join when CLUB_ADMIN mapping is implemented
        -- OR EXISTS (SELECT 1 FROM club_admins WHERE club_admins.user_id = auth.uid() AND club_admins.golf_club_id = settlements.golf_club_id)
      )
    )
  );

-- Note: Service role key bypasses RLS for admin operations

COMMENT ON POLICY settlements_super_admin_all ON settlements IS 'SUPER_ADMIN has full access to all settlements';
COMMENT ON POLICY settlements_club_admin_read ON settlements IS 'CLUB_ADMIN can read their clubs settlements (full implementation pending club_admins table)';

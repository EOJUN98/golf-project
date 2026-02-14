/**
 * SDD-07: Add paid_amount to reservations table
 *
 * Migration: Add paid_amount column to track actual amount paid
 *
 * Purpose:
 * - Track actual paid amount separately from final_price for settlement calculations
 * - Supports scenarios where paid amount may differ from final_price
 */

-- Add paid_amount column
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00;

-- For existing records, set paid_amount = final_price for PAID/COMPLETED/NO_SHOW statuses
UPDATE reservations
SET paid_amount = final_price
WHERE status IN ('PAID', 'COMPLETED', 'NO_SHOW')
  AND paid_amount = 0.00;

-- Add constraint to ensure paid_amount is non-negative
ALTER TABLE reservations
  ADD CONSTRAINT check_paid_amount_positive CHECK (paid_amount >= 0);

COMMENT ON COLUMN reservations.paid_amount IS 'Actual amount paid by user (used for settlement calculations)';

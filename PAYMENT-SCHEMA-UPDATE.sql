-- ==================================================================
-- Phase 8: Payment System Schema Update
-- ==================================================================
-- Add payment-related columns to reservations table
-- Run this in Supabase SQL Editor

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS payment_key TEXT,
ADD COLUMN IF NOT EXISTS order_id TEXT;

-- Create index for payment lookups
CREATE INDEX IF NOT EXISTS idx_reservations_payment_key ON reservations (payment_key);
CREATE INDEX IF NOT EXISTS idx_reservations_order_id ON reservations (order_id);

-- Verify the update
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'reservations'
ORDER BY ordinal_position;

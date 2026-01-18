/**
 * Add User Spending and Booking Fields
 *
 * Adds fields needed for segment calculation and user statistics:
 * - total_bookings: Total number of bookings made by user
 * - total_spent: Total amount spent (KRW)
 * - avg_booking_value: Average booking value (KRW)
 * - is_suspended: Suspension status for high-risk users
 */

-- Add spending and booking fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_spent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_booking_value DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.users.total_bookings IS 'Total number of bookings made by user';
COMMENT ON COLUMN public.users.total_spent IS 'Total amount spent in KRW';
COMMENT ON COLUMN public.users.avg_booking_value IS 'Average booking value in KRW';
COMMENT ON COLUMN public.users.is_suspended IS 'User account suspension status';

-- Initialize demo users with realistic values
UPDATE public.users
SET
  total_bookings = CASE segment_type
    WHEN 'PRESTIGE' THEN 50
    WHEN 'SMART' THEN 25
    WHEN 'CHERRY' THEN 15
    WHEN 'FUTURE' THEN 5
    ELSE 0
  END,
  total_spent = CASE segment_type
    WHEN 'PRESTIGE' THEN 10000000  -- 10M KRW
    WHEN 'SMART' THEN 3000000      -- 3M KRW
    WHEN 'CHERRY' THEN 1500000     -- 1.5M KRW
    WHEN 'FUTURE' THEN 500000      -- 500K KRW
    ELSE 0
  END
WHERE email LIKE '%@tugol.dev' AND total_bookings = 0;

-- Calculate average booking value for demo users
UPDATE public.users
SET avg_booking_value = CASE
  WHEN total_bookings > 0 THEN total_spent::DECIMAL / total_bookings
  ELSE 0
END
WHERE email LIKE '%@tugol.dev';

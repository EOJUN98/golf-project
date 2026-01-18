/**
 * SDD-10: No-Show Prevention + Segment System + Data-Driven Discounts + Virtual Payment
 *
 * This migration adds:
 * 1. No-Show Prevention fields and logic
 * 2. Full Segment System with history and overrides
 * 3. Tee Time Statistics for data-driven pricing
 * 4. Virtual Payment support
 * 5. Enhanced MY page data structures (rounds, stats, memberships, etc.)
 */

-- ============================================================================
-- 1. NO-SHOW PREVENTION: User Risk Tracking
-- ============================================================================

-- Add no-show tracking fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS no_show_risk_score DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS consecutive_no_shows INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_no_show_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_cancellations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancellation_rate DECIMAL(5,2) DEFAULT 0.00;

COMMENT ON COLUMN public.users.no_show_count IS 'Total number of no-shows in user history';
COMMENT ON COLUMN public.users.no_show_risk_score IS 'Calculated risk score (0-100) based on behavior';
COMMENT ON COLUMN public.users.consecutive_no_shows IS 'Consecutive no-shows without completion';
COMMENT ON COLUMN public.users.cancellation_rate IS 'Percentage of bookings cancelled';

-- Add risk assessment fields to reservations table
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS risk_score DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS risk_factors JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS precheck_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS precheck_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS precheck_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS penalty_agreement_signed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS penalty_agreement_signed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.reservations.risk_score IS 'Risk score at time of booking (0-100)';
COMMENT ON COLUMN public.reservations.risk_factors IS 'JSON object with risk calculation breakdown';
COMMENT ON COLUMN public.reservations.precheck_required IS 'Whether pre-check-in is required for this booking';
COMMENT ON COLUMN public.reservations.penalty_agreement_signed IS 'User agreed to no-show penalty terms';

-- ============================================================================
-- 2. SEGMENT SYSTEM: Core Fields
-- ============================================================================

-- Add segment fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS segment_type VARCHAR(20) DEFAULT 'FUTURE',
ADD COLUMN IF NOT EXISTS segment_score DECIMAL(7,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS segment_calculated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS segment_override_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS segment_override_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS segment_override_reason TEXT;

-- Add constraint for valid segment types
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_segment_type_check;

ALTER TABLE public.users
ADD CONSTRAINT users_segment_type_check
CHECK (segment_type IN ('PRESTIGE', 'SMART', 'CHERRY', 'FUTURE'));

COMMENT ON COLUMN public.users.segment_type IS 'Current user segment: PRESTIGE, SMART, CHERRY, or FUTURE';
COMMENT ON COLUMN public.users.segment_score IS 'Calculated score for segment assignment (0-100)';
COMMENT ON COLUMN public.users.segment_override_by IS 'Admin user who manually overrode segment';

-- ============================================================================
-- 3. SEGMENT SYSTEM: History Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_segment_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_segment VARCHAR(20),
  new_segment VARCHAR(20) NOT NULL,
  segment_score DECIMAL(7,2),
  change_reason VARCHAR(100),
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  calculation_details JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_segment_history_user ON public.user_segment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_segment_history_changed_at ON public.user_segment_history(changed_at);

COMMENT ON TABLE public.user_segment_history IS 'Audit trail of all user segment changes';
COMMENT ON COLUMN public.user_segment_history.calculation_details IS 'JSON with scoring breakdown';

-- ============================================================================
-- 4. SEGMENT SYSTEM: CRM Overrides
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_segment_overrides (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  override_segment VARCHAR(20) NOT NULL,
  reason TEXT NOT NULL,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_crm_overrides_user ON public.crm_segment_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_overrides_active ON public.crm_segment_overrides(is_active) WHERE is_active = true;

COMMENT ON TABLE public.crm_segment_overrides IS 'Manual segment overrides from CRM/Admin';

-- ============================================================================
-- 5. DATA-DRIVEN DISCOUNTS: Tee Time Statistics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tee_time_stats (
  id BIGSERIAL PRIMARY KEY,
  tee_time_id BIGINT NOT NULL REFERENCES public.tee_times(id) ON DELETE CASCADE,
  golf_club_id BIGINT NOT NULL REFERENCES public.golf_clubs(id) ON DELETE CASCADE,

  -- Time slot characteristics
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 6=Saturday
  hour_of_day INTEGER NOT NULL,
  is_weekend BOOLEAN DEFAULT false,
  is_holiday BOOLEAN DEFAULT false,

  -- Booking statistics
  total_views INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  total_cancellations INTEGER DEFAULT 0,
  total_no_shows INTEGER DEFAULT 0,

  -- Pricing statistics
  avg_final_price DECIMAL(10,2),
  avg_discount_rate DECIMAL(5,2),
  base_price DECIMAL(10,2),

  -- Performance metrics
  booking_rate DECIMAL(5,2) DEFAULT 0.00, -- bookings / views
  vacancy_rate DECIMAL(5,2) DEFAULT 0.00, -- empty slots / total slots
  no_show_rate DECIMAL(5,2) DEFAULT 0.00,

  -- Time windows
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  stats_period_start TIMESTAMPTZ,
  stats_period_end TIMESTAMPTZ,

  UNIQUE(tee_time_id, calculated_at)
);

CREATE INDEX IF NOT EXISTS idx_tee_stats_tee_time ON public.tee_time_stats(tee_time_id);
CREATE INDEX IF NOT EXISTS idx_tee_stats_club ON public.tee_time_stats(golf_club_id);
CREATE INDEX IF NOT EXISTS idx_tee_stats_dow_hour ON public.tee_time_stats(day_of_week, hour_of_day);

COMMENT ON TABLE public.tee_time_stats IS 'Historical statistics for data-driven pricing adjustments';
COMMENT ON COLUMN public.tee_time_stats.booking_rate IS 'Percentage of views that convert to bookings';
COMMENT ON COLUMN public.tee_time_stats.vacancy_rate IS 'Percentage of time slots remaining empty';

-- ============================================================================
-- 6. VIRTUAL PAYMENT: Reservation Payment Mode
-- ============================================================================

-- Add virtual payment fields to reservations table
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(20) DEFAULT 'REAL',
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_metadata JSONB DEFAULT '{}';

-- Add constraint for valid payment modes
ALTER TABLE public.reservations
DROP CONSTRAINT IF EXISTS reservations_payment_mode_check;

ALTER TABLE public.reservations
ADD CONSTRAINT reservations_payment_mode_check
CHECK (payment_mode IN ('REAL', 'VIRTUAL', 'TEST'));

COMMENT ON COLUMN public.reservations.payment_mode IS 'REAL (Toss PG), VIRTUAL (no PG), TEST (demo)';
COMMENT ON COLUMN public.reservations.payment_reference IS 'Payment transaction ID or virtual reference';

-- ============================================================================
-- 7. MY PAGE: User Statistics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_stats (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Playing statistics
  total_rounds INTEGER DEFAULT 0,
  completed_rounds INTEGER DEFAULT 0,
  avg_score DECIMAL(5,2),
  best_score INTEGER,
  worst_score INTEGER,

  -- Skill metrics
  handicap DECIMAL(4,1),
  handicap_trend VARCHAR(20), -- 'IMPROVING', 'STABLE', 'DECLINING'
  driving_distance INTEGER, -- meters
  fairway_accuracy DECIMAL(5,2), -- percentage
  gir_rate DECIMAL(5,2), -- greens in regulation
  putting_avg DECIMAL(4,2), -- putts per hole

  -- Preferences
  preferred_tee_box VARCHAR(20), -- 'BLACK', 'BLUE', 'WHITE', 'RED'
  preferred_time_slot VARCHAR(20), -- 'MORNING', 'AFTERNOON', 'TWILIGHT'
  preferred_day_of_week INTEGER[], -- [0,6] for Sun,Sat

  -- Behavioral
  avg_booking_lead_time INTEGER, -- days in advance
  favorite_club_ids BIGINT[], -- golf club IDs
  booking_frequency DECIMAL(5,2), -- bookings per month

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.user_stats IS 'User playing statistics and preferences';

-- ============================================================================
-- 8. MY PAGE: Round Records
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rounds (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  golf_club_id BIGINT NOT NULL REFERENCES public.golf_clubs(id),
  course_id BIGINT REFERENCES public.golf_courses(id),

  -- Round details
  played_at TIMESTAMPTZ NOT NULL,
  tee_box VARCHAR(20), -- 'BLACK', 'BLUE', 'WHITE', 'RED'
  total_score INTEGER NOT NULL,
  front_nine INTEGER,
  back_nine INTEGER,

  -- Performance
  fairways_hit INTEGER,
  greens_in_regulation INTEGER,
  total_putts INTEGER,
  penalties INTEGER,

  -- Conditions
  weather_condition VARCHAR(50),
  wind_speed INTEGER, -- km/h
  temperature DECIMAL(4,1), -- celsius

  -- Metadata
  playing_partners TEXT[], -- names or user IDs
  notes TEXT,
  scorecard_image_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rounds_user ON public.rounds(user_id);
CREATE INDEX IF NOT EXISTS idx_rounds_played_at ON public.rounds(played_at);
CREATE INDEX IF NOT EXISTS idx_rounds_club ON public.rounds(golf_club_id);

COMMENT ON TABLE public.rounds IS 'Individual round records with scores and stats';

-- ============================================================================
-- 9. MY PAGE: Membership & Loyalty (Skeleton)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_memberships (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_type VARCHAR(50) NOT NULL, -- 'GOLD', 'SILVER', 'BRONZE', 'FREE'
  tier_level INTEGER DEFAULT 1,
  points_balance INTEGER DEFAULT 0,
  points_lifetime INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.user_memberships(user_id);

COMMENT ON TABLE public.user_memberships IS 'User membership tiers and points (skeleton)';

-- ============================================================================
-- 10. MY PAGE: Payment Methods (Skeleton)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_payment_methods (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_type VARCHAR(50) NOT NULL, -- 'CARD', 'BANK_TRANSFER', 'TOSS_PAY'
  payment_provider VARCHAR(50),
  masked_number VARCHAR(50), -- e.g., "**** **** **** 1234"
  nickname VARCHAR(100),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON public.user_payment_methods(user_id);

COMMENT ON TABLE public.user_payment_methods IS 'Stored payment methods (skeleton)';

-- ============================================================================
-- 11. MY PAGE: Gifts & Vouchers (Skeleton)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_gifts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gift_type VARCHAR(50) NOT NULL, -- 'VOUCHER', 'DISCOUNT_COUPON', 'FREE_ROUND'
  gift_name VARCHAR(200),
  gift_value DECIMAL(10,2),
  discount_rate DECIMAL(5,2),
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  used_for_reservation_id UUID REFERENCES public.reservations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gifts_user ON public.user_gifts(user_id);
CREATE INDEX IF NOT EXISTS idx_gifts_valid ON public.user_gifts(is_used, valid_until);

COMMENT ON TABLE public.user_gifts IS 'User vouchers and promotional gifts (skeleton)';

-- ============================================================================
-- 12. GOLF COURSES: Enhanced Course Information
-- ============================================================================

-- Add course detail fields
ALTER TABLE public.golf_courses
ADD COLUMN IF NOT EXISTS total_length_meters INTEGER,
ADD COLUMN IF NOT EXISTS total_length_yards INTEGER,
ADD COLUMN IF NOT EXISTS slope_rating DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS course_rating DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS green_speed DECIMAL(4,1), -- stimpmeter reading
ADD COLUMN IF NOT EXISTS green_type VARCHAR(50), -- 'BENT', 'BERMUDA', 'MIXED'
ADD COLUMN IF NOT EXISTS course_map_url TEXT,
ADD COLUMN IF NOT EXISTS course_overview TEXT,
ADD COLUMN IF NOT EXISTS hole_details JSONB DEFAULT '[]';

COMMENT ON COLUMN public.golf_courses.green_speed IS 'Current green speed (stimpmeter, e.g., 9.5)';
COMMENT ON COLUMN public.golf_courses.hole_details IS 'Array of hole info: par, handicap, yardage';

-- ============================================================================
-- 13. COURSE NOTICES: Maintenance & Events
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.course_notices (
  id BIGSERIAL PRIMARY KEY,
  golf_club_id BIGINT NOT NULL REFERENCES public.golf_clubs(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES public.golf_courses(id) ON DELETE CASCADE,
  notice_type VARCHAR(50) NOT NULL, -- 'MAINTENANCE', 'TOURNAMENT', 'CLOSURE', 'WEATHER', 'OTHER'
  severity VARCHAR(20) DEFAULT 'INFO', -- 'INFO', 'WARNING', 'CRITICAL'
  title VARCHAR(200) NOT NULL,
  description TEXT,
  affected_holes INTEGER[], -- hole numbers affected
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notices_club ON public.course_notices(golf_club_id);
CREATE INDEX IF NOT EXISTS idx_notices_course ON public.course_notices(course_id);
CREATE INDEX IF NOT EXISTS idx_notices_active ON public.course_notices(is_active, valid_from, valid_until);

COMMENT ON TABLE public.course_notices IS 'Course maintenance, tournaments, closures';

-- ============================================================================
-- 14. FUNCTIONS: Calculate User Risk Score
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_user_risk_score(p_user_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_score DECIMAL(5,2) := 0;
  v_user RECORD;
  v_segment VARCHAR(20);
  v_no_shows INTEGER;
  v_consecutive INTEGER;
  v_cancel_rate DECIMAL(5,2);
BEGIN
  -- Get user data
  SELECT
    segment_type,
    no_show_count,
    consecutive_no_shows,
    cancellation_rate,
    total_bookings
  INTO v_user
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Base score from no-show count
  v_score := LEAST(v_user.no_show_count * 15, 50);

  -- Consecutive no-shows penalty
  IF v_user.consecutive_no_shows >= 2 THEN
    v_score := v_score + 20;
  END IF;

  -- Cancellation rate impact
  IF v_user.cancellation_rate > 30 THEN
    v_score := v_score + 15;
  ELSIF v_user.cancellation_rate > 15 THEN
    v_score := v_score + 10;
  END IF;

  -- Segment modifier
  CASE v_user.segment_type
    WHEN 'PRESTIGE' THEN v_score := v_score * 0.5; -- Trusted users
    WHEN 'SMART' THEN v_score := v_score * 0.8;
    WHEN 'CHERRY' THEN v_score := v_score * 1.3; -- Higher risk
    WHEN 'FUTURE' THEN v_score := v_score * 1.1; -- New users slightly higher
  END CASE;

  -- Cap at 100
  RETURN LEAST(v_score, 100);
END;
$$;

COMMENT ON FUNCTION calculate_user_risk_score IS 'Calculate no-show risk score (0-100) based on user behavior';

-- ============================================================================
-- 15. FUNCTIONS: Calculate Segment Score
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_segment_score(p_user_id UUID)
RETURNS TABLE(
  segment_type VARCHAR(20),
  segment_score DECIMAL(7,2),
  calculation_details JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user RECORD;
  v_score DECIMAL(7,2) := 0;
  v_segment VARCHAR(20);
  v_details JSONB := '{}';

  -- Score components
  v_value_score DECIMAL(7,2) := 0;
  v_frequency_score DECIMAL(7,2) := 0;
  v_recency_score DECIMAL(7,2) := 0;
  v_loyalty_score DECIMAL(7,2) := 0;
  v_cherry_penalty DECIMAL(7,2) := 0;
BEGIN
  -- Get user data
  SELECT
    total_bookings,
    total_spent,
    avg_booking_value,
    no_show_count,
    cancellation_rate,
    cherry_score,
    created_at
  INTO v_user
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 1. VALUE SCORE (40% weight): Based on total spend and avg booking value
  IF v_user.total_spent >= 5000000 THEN -- 5M KRW+
    v_value_score := 40;
  ELSIF v_user.total_spent >= 2000000 THEN
    v_value_score := 30;
  ELSIF v_user.total_spent >= 1000000 THEN
    v_value_score := 20;
  ELSIF v_user.total_spent >= 500000 THEN
    v_value_score := 15;
  ELSE
    v_value_score := 10;
  END IF;

  -- 2. FREQUENCY SCORE (25% weight): Based on total bookings
  IF v_user.total_bookings >= 50 THEN
    v_frequency_score := 25;
  ELSIF v_user.total_bookings >= 30 THEN
    v_frequency_score := 20;
  ELSIF v_user.total_bookings >= 15 THEN
    v_frequency_score := 15;
  ELSIF v_user.total_bookings >= 5 THEN
    v_frequency_score := 10;
  ELSE
    v_frequency_score := 5;
  END IF;

  -- 3. RECENCY SCORE (15% weight): Account age and recent activity
  -- Simplified: longer tenure = higher score
  IF EXTRACT(DAYS FROM NOW() - v_user.created_at) >= 365 THEN
    v_recency_score := 15;
  ELSIF EXTRACT(DAYS FROM NOW() - v_user.created_at) >= 180 THEN
    v_recency_score := 10;
  ELSIF EXTRACT(DAYS FROM NOW() - v_user.created_at) >= 90 THEN
    v_recency_score := 5;
  ELSE
    v_recency_score := 2;
  END IF;

  -- 4. LOYALTY SCORE (20% weight): Low no-shows and cancellations
  v_loyalty_score := 20;
  IF v_user.no_show_count > 0 THEN
    v_loyalty_score := v_loyalty_score - (v_user.no_show_count * 5);
  END IF;
  IF v_user.cancellation_rate > 20 THEN
    v_loyalty_score := v_loyalty_score - 5;
  END IF;
  v_loyalty_score := GREATEST(v_loyalty_score, 0);

  -- 5. CHERRY PENALTY: High cherry score reduces total
  IF v_user.cherry_score >= 70 THEN
    v_cherry_penalty := 15;
  ELSIF v_user.cherry_score >= 50 THEN
    v_cherry_penalty := 10;
  ELSIF v_user.cherry_score >= 30 THEN
    v_cherry_penalty := 5;
  END IF;

  -- Calculate total score
  v_score := v_value_score + v_frequency_score + v_recency_score + v_loyalty_score - v_cherry_penalty;
  v_score := GREATEST(v_score, 0); -- Floor at 0

  -- Determine segment
  IF v_score >= 70 THEN
    v_segment := 'PRESTIGE';
  ELSIF v_score >= 45 THEN
    v_segment := 'SMART';
  ELSIF v_user.cherry_score >= 60 THEN
    v_segment := 'CHERRY'; -- Override if cherry behavior dominant
  ELSE
    v_segment := 'FUTURE';
  END IF;

  -- Build calculation details
  v_details := jsonb_build_object(
    'value_score', v_value_score,
    'frequency_score', v_frequency_score,
    'recency_score', v_recency_score,
    'loyalty_score', v_loyalty_score,
    'cherry_penalty', v_cherry_penalty,
    'total_score', v_score,
    'cherry_score', v_user.cherry_score,
    'calculated_at', NOW()
  );

  RETURN QUERY SELECT v_segment, v_score, v_details;
END;
$$;

COMMENT ON FUNCTION calculate_segment_score IS 'Calculate user segment based on RFM + loyalty + cherry behavior';

-- ============================================================================
-- 16. TRIGGERS: Auto-update segment when user stats change
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_recalculate_segment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Recalculate segment score
  SELECT * INTO v_result
  FROM calculate_segment_score(NEW.id);

  -- Update user record
  NEW.segment_type := v_result.segment_type;
  NEW.segment_score := v_result.segment_score;
  NEW.segment_calculated_at := NOW();

  -- Log to history
  INSERT INTO public.user_segment_history (
    user_id, old_segment, new_segment, segment_score,
    change_reason, calculation_details
  ) VALUES (
    NEW.id, OLD.segment_type, v_result.segment_type, v_result.segment_score,
    'AUTO_RECALCULATION', v_result.calculation_details
  );

  RETURN NEW;
END;
$$;

-- Create trigger (only if significant stats change)
DROP TRIGGER IF EXISTS trigger_recalc_segment ON public.users;
CREATE TRIGGER trigger_recalc_segment
  BEFORE UPDATE OF total_bookings, total_spent, no_show_count, cherry_score
  ON public.users
  FOR EACH ROW
  WHEN (
    OLD.total_bookings IS DISTINCT FROM NEW.total_bookings OR
    OLD.total_spent IS DISTINCT FROM NEW.total_spent OR
    OLD.no_show_count IS DISTINCT FROM NEW.no_show_count OR
    OLD.cherry_score IS DISTINCT FROM NEW.cherry_score
  )
  EXECUTE FUNCTION auto_recalculate_segment();

-- ============================================================================
-- 17. VIEWS: Active Segment Overrides
-- ============================================================================

CREATE OR REPLACE VIEW active_segment_overrides AS
SELECT
  o.user_id,
  u.email,
  u.name,
  u.segment_type AS calculated_segment,
  o.override_segment AS active_segment,
  o.reason,
  o.valid_from,
  o.valid_until,
  o.created_by,
  o.created_at
FROM public.crm_segment_overrides o
JOIN public.users u ON u.id = o.user_id
WHERE o.is_active = true
  AND o.valid_from <= NOW()
  AND (o.valid_until IS NULL OR o.valid_until > NOW());

COMMENT ON VIEW active_segment_overrides IS 'Currently active admin segment overrides';

-- ============================================================================
-- 18. DEMO DATA: Initialize stats for existing users
-- ============================================================================

-- Create user_stats records for existing users
INSERT INTO public.user_stats (user_id, total_rounds, completed_rounds)
SELECT id, 0, 0
FROM public.users
WHERE NOT EXISTS (SELECT 1 FROM public.user_stats WHERE user_id = users.id);

-- Initialize segment scores for demo accounts
UPDATE public.users
SET
  segment_score = CASE segment_type
    WHEN 'PRESTIGE' THEN 85.00
    WHEN 'SMART' THEN 55.00
    WHEN 'CHERRY' THEN 35.00
    WHEN 'FUTURE' THEN 15.00
    ELSE 0.00
  END,
  no_show_risk_score = CASE segment_type
    WHEN 'PRESTIGE' THEN 5.00
    WHEN 'SMART' THEN 15.00
    WHEN 'CHERRY' THEN 45.00
    WHEN 'FUTURE' THEN 25.00
    ELSE 0.00
  END,
  segment_calculated_at = NOW()
WHERE email LIKE '%@tugol.dev';

-- ============================================================================
-- 19. INDEXES: Performance Optimization
-- ============================================================================

-- User segment queries
CREATE INDEX IF NOT EXISTS idx_users_segment_type ON public.users(segment_type);
CREATE INDEX IF NOT EXISTS idx_users_risk_score ON public.users(no_show_risk_score) WHERE no_show_risk_score > 50;

-- Reservation risk queries
CREATE INDEX IF NOT EXISTS idx_reservations_risk ON public.reservations(risk_score) WHERE risk_score > 50;
CREATE INDEX IF NOT EXISTS idx_reservations_precheck ON public.reservations(precheck_required) WHERE precheck_required = true;

-- ============================================================================
-- 20. RLS POLICIES (Placeholder - to be implemented with auth)
-- ============================================================================

-- Enable RLS on new tables (currently permissive)
ALTER TABLE public.user_segment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_segment_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tee_time_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_notices ENABLE ROW LEVEL SECURITY;

-- Temporary permissive policies for development
CREATE POLICY "Allow all for dev" ON public.user_segment_history FOR ALL USING (true);
CREATE POLICY "Allow all for dev" ON public.crm_segment_overrides FOR ALL USING (true);
CREATE POLICY "Allow all for dev" ON public.tee_time_stats FOR ALL USING (true);
CREATE POLICY "Allow all for dev" ON public.user_stats FOR ALL USING (true);
CREATE POLICY "Allow all for dev" ON public.rounds FOR ALL USING (true);
CREATE POLICY "Allow all for dev" ON public.user_memberships FOR ALL USING (true);
CREATE POLICY "Allow all for dev" ON public.user_payment_methods FOR ALL USING (true);
CREATE POLICY "Allow all for dev" ON public.user_gifts FOR ALL USING (true);
CREATE POLICY "Allow all for dev" ON public.course_notices FOR ALL USING (true);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of changes:
-- ✓ No-Show Prevention: users + reservations risk fields
-- ✓ Segment System: segment fields, history, overrides
-- ✓ Data-Driven Discounts: tee_time_stats table
-- ✓ Virtual Payment: payment_mode fields
-- ✓ MY Page Data: user_stats, rounds, memberships, payment_methods, gifts
-- ✓ Course Enhancement: course details, notices
-- ✓ Functions: risk calculation, segment calculation
-- ✓ Triggers: auto-segment recalculation
-- ✓ Indexes: performance optimization
-- ✓ RLS: enabled (permissive policies for dev)

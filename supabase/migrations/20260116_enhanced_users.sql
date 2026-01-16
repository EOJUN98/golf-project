-- ==================================================================
-- Enhanced Users Table Migration
-- Adds behavior tracking, blacklist, and segment automation
-- ==================================================================

-- 1. Add new columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blacklisted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blacklist_reason TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blacklisted_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blacklisted_by TEXT; -- admin user_id

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_no_show_at TIMESTAMPTZ;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_spent INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avg_booking_value INTEGER DEFAULT 0;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location_address TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS distance_to_club_km INTEGER;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avg_stay_minutes INTEGER;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_visited_at TIMESTAMPTZ;

-- Segment will be auto-calculated, but keep manual override option
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS segment_override_by TEXT; -- admin user_id
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS segment_override_at TIMESTAMPTZ;

-- Marketing preferences
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS marketing_agreed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_agreed BOOLEAN DEFAULT FALSE;

-- 2. Create index for blacklist filtering
CREATE INDEX IF NOT EXISTS idx_users_blacklisted ON public.users(blacklisted);
CREATE INDEX IF NOT EXISTS idx_users_segment ON public.users(segment);
CREATE INDEX IF NOT EXISTS idx_users_cherry_score ON public.users(cherry_score DESC);

-- 3. Add comments for documentation
COMMENT ON COLUMN public.users.blacklisted IS '악성 사용자 차단 여부 (노쇼 반복 등)';
COMMENT ON COLUMN public.users.no_show_count IS '노쇼 횟수 (자동 집계)';
COMMENT ON COLUMN public.users.total_bookings IS '총 예약 횟수 (세그먼트 계산에 사용)';
COMMENT ON COLUMN public.users.total_spent IS '총 결제 금액 (원 단위)';
COMMENT ON COLUMN public.users.cherry_score IS '체리 점수 (0-100, 높을수록 우대)';
COMMENT ON COLUMN public.users.segment IS '사용자 세그먼트 (FUTURE/PRESTIGE/SMART/CHERRY)';

-- 4. Create function to auto-update user stats after reservation
CREATE OR REPLACE FUNCTION update_user_stats_after_reservation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'PAID' THEN
    UPDATE public.users
    SET
      total_bookings = total_bookings + 1,
      total_spent = total_spent + NEW.final_price,
      avg_booking_value = (total_spent + NEW.final_price) / (total_bookings + 1),
      updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger to auto-update stats
--DROP TRIGGER IF EXISTS trigger_update_user_stats ON public.reservations;
--CREATE TRIGGER trigger_update_user_stats
  --AFTER INSERT ON public.reservations
  --FOR EACH ROW
  --EXECUTE FUNCTION update_user_stats_after_reservation();

-- 6. Create function to auto-assign segment based on behavior
CREATE OR REPLACE FUNCTION calculate_user_segment(user_id_param TEXT)
RETURNS TEXT AS $$
DECLARE
  user_record RECORD;
  new_segment TEXT;
BEGIN
  SELECT * INTO user_record FROM public.users WHERE id = user_id_param;

  -- If admin manually set segment, don't override
  IF user_record.segment_override_by IS NOT NULL THEN
    RETURN user_record.segment;
  END IF;

  -- Blacklisted = No special treatment
  IF user_record.blacklisted THEN
    RETURN 'SMART';
  END IF;

  -- PRESTIGE: High spender or many bookings
  IF user_record.total_spent >= 1000000 OR user_record.total_bookings >= 10 THEN
    new_segment := 'PRESTIGE';

  -- CHERRY: High cherry score (earned through good behavior)
  ELSIF user_record.cherry_score >= 80 THEN
    new_segment := 'CHERRY';

  -- SMART: Regular user with no special status
  ELSIF user_record.total_bookings >= 3 THEN
    new_segment := 'SMART';

  -- FUTURE: New user (less than 3 bookings)
  ELSE
    new_segment := 'FUTURE';
  END IF;

  -- Update segment if changed
  IF user_record.segment != new_segment THEN
    UPDATE public.users SET segment = new_segment, updated_at = NOW() WHERE id = user_id_param;
  END IF;

  RETURN new_segment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to handle no-show
CREATE OR REPLACE FUNCTION record_no_show(reservation_id_param TEXT)
RETURNS VOID AS $$
DECLARE
  user_id_val TEXT;
  current_no_shows INTEGER;
BEGIN
  -- Get user_id from reservation
  --SELECT user_id INTO user_id_val FROM public.reservations WHERE id = reservation_id_param;

  -- Update no-show count
  UPDATE public.users
  SET
    no_show_count = no_show_count + 1,
    last_no_show_at = NOW(),
    cherry_score = GREATEST(0, cherry_score - 20), -- Penalty: -20 points
    updated_at = NOW()
  WHERE id = user_id_val
  RETURNING no_show_count INTO current_no_shows;

  -- Auto-blacklist if 3+ no-shows
  IF current_no_shows >= 3 THEN
    UPDATE public.users
    SET
      blacklisted = TRUE,
      blacklist_reason = '노쇼 3회 이상 (자동 차단)',
      blacklisted_at = NOW(),
      blacklisted_by = 'SYSTEM'
    WHERE id = user_id_val;
  END IF;

  -- Recalculate segment
  PERFORM calculate_user_segment(user_id_val);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create view for admin dashboard
CREATE OR REPLACE VIEW admin_user_stats AS
SELECT
  u.id,
  u.email,
  COALESCE(u.name, u.email) AS name,
  u.segment,
  u.cherry_score,
  u.total_bookings,
  u.total_spent,
  u.avg_booking_value,
  u.no_show_count,
  u.blacklisted,
  u.blacklist_reason,
  u.created_at,
  u.last_visited_at,
  COUNT(r.id) AS pending_reservations_count
FROM public.users u
LEFT JOIN public.reservations r ON r.user_id = u.id AND r.payment_status IN ('PENDING', 'PAID')
GROUP BY u.id;

COMMENT ON VIEW admin_user_stats IS '관리자 대시보드용 사용자 통계 뷰';

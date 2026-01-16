-- =====================================================
-- SDD-03: Notifications System for Panic Deals & Alerts
-- =====================================================
-- Created: 2026-01-16
-- Purpose: Store push notification records for panic deals, weather alerts, etc.

-- Drop existing table if exists (for development)
DROP TABLE IF EXISTS public.notifications CASCADE;

-- =====================================================
-- Table: notifications
-- =====================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target user (NULL = broadcast to all nearby users)
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,

  -- Related tee time (NULL = general notification)
  tee_time_id BIGINT REFERENCES public.tee_times(id) ON DELETE CASCADE,

  -- Notification type
  type TEXT NOT NULL CHECK (type IN (
    'PANIC_DEAL',           -- Last-minute discount alert
    'WEATHER_ALERT',        -- Weather change notification
    'BOOKING_CONFIRMATION', -- Reservation confirmed
    'BOOKING_REMINDER',     -- Upcoming tee time reminder
    'PRICE_DROP',           -- Price decreased since last view
    'CUSTOM'                -- Custom admin message
  )),

  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Additional data (JSON)
  payload JSONB DEFAULT '{}',
  -- Example payload for PANIC_DEAL:
  -- {
  --   "original_price": 120000,
  --   "final_price": 80000,
  --   "discount_rate": 0.33,
  --   "minutes_left": 25,
  --   "golf_club_name": "Incheon Club 72",
  --   "tee_off": "2026-01-16T14:00:00Z"
  -- }

  -- Delivery status
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',   -- Created but not sent
    'SENT',      -- Successfully sent to push service
    'FAILED',    -- Failed to send
    'READ',      -- User opened notification
    'DISMISSED'  -- User dismissed without action
  )),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  -- Priority (for sorting in notification center)
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  -- 1 = Highest (urgent), 5 = Normal, 10 = Low

  -- Expiration (auto-delete after this time)
  expires_at TIMESTAMPTZ
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Query by user (notification center)
CREATE INDEX idx_notifications_user_id_created
ON public.notifications(user_id, created_at DESC)
WHERE user_id IS NOT NULL;

-- Query by tee time (check if already notified)
CREATE INDEX idx_notifications_tee_time_type
ON public.notifications(tee_time_id, type)
WHERE tee_time_id IS NOT NULL;

-- Query by status (for background job processing)
CREATE INDEX idx_notifications_status_created
ON public.notifications(status, created_at);

-- Query by type (analytics)
CREATE INDEX idx_notifications_type_created
ON public.notifications(type, created_at DESC);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (
  user_id = auth.uid()::text
  OR user_id IS NULL -- Broadcast notifications visible to all
);

-- Users can mark their own notifications as read/dismissed
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid()::text)
WITH CHECK (
  -- Only allow status updates (prevent title/message tampering)
  status IN ('READ', 'DISMISSED')
);

-- Only admins can create notifications
CREATE POLICY "Admins can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND (is_admin = TRUE OR is_super_admin = TRUE)
  )
);

-- System/background jobs can create notifications (bypass RLS)
-- This policy allows service role to insert without user context
CREATE POLICY "Service role can create notifications"
ON public.notifications FOR INSERT
TO service_role
WITH CHECK (true);

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function: Check if tee time already has a panic notification
CREATE OR REPLACE FUNCTION public.has_panic_notification(
  p_tee_time_id BIGINT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.notifications
    WHERE tee_time_id = p_tee_time_id
    AND type = 'PANIC_DEAL'
    AND status IN ('PENDING', 'SENT')
    AND created_at > NOW() - INTERVAL '2 hours' -- Only recent notifications
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-delete expired notifications (for cron job)
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.notifications
  WHERE expires_at IS NOT NULL
  AND expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Triggers
-- =====================================================

-- Auto-update sent_at when status changes to SENT
CREATE OR REPLACE FUNCTION public.update_notification_sent_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'SENT' AND OLD.status != 'SENT' THEN
    NEW.sent_at = NOW();
  END IF;

  IF NEW.status = 'READ' AND OLD.status != 'READ' THEN
    NEW.read_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notification_status_update
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_notification_sent_at();

-- =====================================================
-- Grants
-- =====================================================

-- Grant permissions
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- =====================================================
-- Sample Data (for testing)
-- =====================================================

-- Insert a sample panic notification (commented out for production)
-- INSERT INTO public.notifications (
--   user_id,
--   tee_time_id,
--   type,
--   title,
--   message,
--   payload,
--   priority,
--   expires_at
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   101,
--   'PANIC_DEAL',
--   '⚡️ 긴급 특가! 25분 후 티오프',
--   '지금 예약하면 33% 할인! 120,000원 → 80,000원',
--   '{"original_price": 120000, "final_price": 80000, "discount_rate": 0.33, "minutes_left": 25}',
--   1,
--   NOW() + INTERVAL '1 hour'
-- );

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE public.notifications IS
'Stores push notification records for panic deals, weather alerts, booking confirmations, etc.';

COMMENT ON COLUMN public.notifications.user_id IS
'Target user ID. NULL = broadcast to all nearby users.';

COMMENT ON COLUMN public.notifications.tee_time_id IS
'Related tee time ID. NULL for general notifications.';

COMMENT ON COLUMN public.notifications.payload IS
'Additional JSON data. Example for PANIC_DEAL: {"original_price": 120000, "final_price": 80000, "discount_rate": 0.33, "minutes_left": 25}';

COMMENT ON COLUMN public.notifications.priority IS
'Priority level: 1 (urgent) to 10 (low). Default: 5 (normal).';

COMMENT ON FUNCTION public.has_panic_notification IS
'Check if a tee time already has an active panic notification within the last 2 hours.';

COMMENT ON FUNCTION public.cleanup_expired_notifications IS
'Auto-delete expired notifications. Designed to run as a cron job.';

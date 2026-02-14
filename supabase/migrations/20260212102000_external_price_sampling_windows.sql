-- =====================================================
-- External Price Sampling Windows & Slot Metadata
-- Created: 2026-02-12
-- Purpose: Support 9-slot sampling and collection windows
-- =====================================================

ALTER TABLE public.external_price_targets
  ADD COLUMN IF NOT EXISTS adapter_code TEXT NOT NULL DEFAULT 'generic_single',
  ADD COLUMN IF NOT EXISTS source_platform TEXT NOT NULL DEFAULT 'WEB'
    CHECK (source_platform IN ('WEB', 'APP')),
  ADD COLUMN IF NOT EXISTS parser_config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.external_price_snapshots
  ALTER COLUMN final_price DROP NOT NULL;

ALTER TABLE public.external_price_snapshots
  ADD COLUMN IF NOT EXISTS collection_window TEXT
    CHECK (collection_window IN ('WEEK_BEFORE', 'TWO_DAYS_BEFORE', 'SAME_DAY_MORNING', 'IMMINENT_3H')),
  ADD COLUMN IF NOT EXISTS day_part TEXT
    CHECK (day_part IN ('PART_1', 'PART_2', 'PART_3')),
  ADD COLUMN IF NOT EXISTS slot_position TEXT
    CHECK (slot_position IN ('EARLY', 'MIDDLE', 'LATE')),
  ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'AVAILABLE'
    CHECK (availability_status IN ('AVAILABLE', 'NO_DATA', 'AUTH_REQUIRED', 'REMOVED', 'FAILED')),
  ADD COLUMN IF NOT EXISTS source_platform TEXT NOT NULL DEFAULT 'WEB'
    CHECK (source_platform IN ('WEB', 'APP'));

CREATE INDEX IF NOT EXISTS idx_external_price_snapshots_window_course_date
ON public.external_price_snapshots(collection_window, site_code, course_name, play_date, crawled_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_price_targets_adapter_active
ON public.external_price_targets(adapter_code, active)
WHERE active = true;

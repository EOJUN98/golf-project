-- =====================================================
-- External Price Crawler Bootstrap (idempotent)
-- Created: 2026-02-12
-- Purpose: Ensure crawler tables/columns/policies exist even when
--          previous same-day migrations were partially applied.
-- =====================================================

-- 1) Core target table
CREATE TABLE IF NOT EXISTS public.external_price_targets (
  id BIGSERIAL PRIMARY KEY,
  site_code TEXT NOT NULL,
  course_name TEXT NOT NULL,
  url TEXT NOT NULL,
  final_price_selector TEXT NOT NULL,
  original_price_selector TEXT,
  play_date_selector TEXT,
  tee_time_selector TEXT,
  wait_for_selector TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_code, url)
);

-- 2) Core snapshot table
CREATE TABLE IF NOT EXISTS public.external_price_snapshots (
  id BIGSERIAL PRIMARY KEY,
  target_id BIGINT REFERENCES public.external_price_targets(id) ON DELETE SET NULL,
  site_code TEXT NOT NULL,
  course_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  play_date DATE,
  tee_time TEXT,
  currency TEXT NOT NULL DEFAULT 'KRW',
  original_price NUMERIC(12,2),
  final_price NUMERIC(12,2),
  discount_amount NUMERIC(12,2),
  discount_rate NUMERIC(7,4),
  crawled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  crawl_status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (crawl_status IN ('SUCCESS', 'FAILED')),
  error_message TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) Region mapping table
CREATE TABLE IF NOT EXISTS public.external_course_regions (
  id BIGSERIAL PRIMARY KEY,
  course_name TEXT NOT NULL,
  course_name_normalized TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('충청', '수도권', '강원', '경상', '전라', '제주')),
  note TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_name),
  UNIQUE(course_name_normalized)
);

-- 4) Sampling window extensions
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

-- 5) Indexes
CREATE INDEX IF NOT EXISTS idx_external_price_targets_active
ON public.external_price_targets(active)
WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_external_price_snapshots_site_date
ON public.external_price_snapshots(site_code, play_date, crawled_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_price_snapshots_target_crawled
ON public.external_price_snapshots(target_id, crawled_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_price_snapshots_window_course_date
ON public.external_price_snapshots(collection_window, site_code, course_name, play_date, crawled_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_price_targets_adapter_active
ON public.external_price_targets(adapter_code, active)
WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_external_course_regions_region_active
ON public.external_course_regions(region, active)
WHERE active = true;

-- 6) RLS + policies
ALTER TABLE public.external_price_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_course_regions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'external_price_targets'
      AND policyname = 'Service role full access targets'
  ) THEN
    CREATE POLICY "Service role full access targets"
    ON public.external_price_targets
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'external_price_snapshots'
      AND policyname = 'Service role full access snapshots'
  ) THEN
    CREATE POLICY "Service role full access snapshots"
    ON public.external_price_snapshots
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'external_course_regions'
      AND policyname = 'Service role full access course regions'
  ) THEN
    CREATE POLICY "Service role full access course regions"
    ON public.external_course_regions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END;
$$;

-- 7) Grants
GRANT ALL ON public.external_price_targets TO service_role;
GRANT ALL ON public.external_price_snapshots TO service_role;
GRANT ALL ON public.external_course_regions TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.external_price_targets_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.external_price_snapshots_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.external_course_regions_id_seq TO service_role;

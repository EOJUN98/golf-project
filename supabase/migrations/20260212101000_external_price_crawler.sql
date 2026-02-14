-- =====================================================
-- External Golf Booking Price Crawler
-- Created: 2026-02-12
-- Purpose: Store final booking prices crawled from external golf booking sites
-- =====================================================

-- Targets to crawl (site, URL, CSS selectors)
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

-- Crawled snapshots
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
  final_price NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2),
  discount_rate NUMERIC(7,4),
  crawled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  crawl_status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (crawl_status IN ('SUCCESS', 'FAILED')),
  error_message TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_external_price_targets_active
ON public.external_price_targets(active)
WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_external_price_snapshots_site_date
ON public.external_price_snapshots(site_code, play_date, crawled_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_price_snapshots_target_crawled
ON public.external_price_snapshots(target_id, crawled_at DESC);

ALTER TABLE public.external_price_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_price_snapshots ENABLE ROW LEVEL SECURITY;

-- Service role full access (crawler runner)
CREATE POLICY "Service role full access targets"
ON public.external_price_targets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access snapshots"
ON public.external_price_snapshots
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

GRANT ALL ON public.external_price_targets TO service_role;
GRANT ALL ON public.external_price_snapshots TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.external_price_targets_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.external_price_snapshots_id_seq TO service_role;

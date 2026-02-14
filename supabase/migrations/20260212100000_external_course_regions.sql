-- =====================================================
-- External Course Region Mapping
-- Created: 2026-02-12
-- Purpose: Manual region mapping for crawler monitor UI
-- =====================================================

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

CREATE INDEX IF NOT EXISTS idx_external_course_regions_region_active
ON public.external_course_regions(region, active)
WHERE active = true;

ALTER TABLE public.external_course_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access course regions"
ON public.external_course_regions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

GRANT ALL ON public.external_course_regions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.external_course_regions_id_seq TO service_role;

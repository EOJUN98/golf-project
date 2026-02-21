-- Add missing covering indexes for frequently joined foreign keys.
-- This addresses Supabase performance advisor "unindexed_foreign_keys" findings.

create index if not exists idx_external_course_regions_created_by
  on public.external_course_regions (created_by);

create index if not exists idx_external_price_targets_created_by
  on public.external_price_targets (created_by);

create index if not exists idx_settlements_created_by_user_id
  on public.settlements (created_by_user_id);

create index if not exists idx_settlements_confirmed_by_user_id
  on public.settlements (confirmed_by_user_id);

create index if not exists idx_settlements_locked_by_user_id
  on public.settlements (locked_by_user_id);

create index if not exists idx_tee_times_golf_club_id
  on public.tee_times (golf_club_id);

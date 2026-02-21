-- Consolidate multiple permissive RLS policies into one policy per action
-- to reduce policy-evaluation overhead reported by Supabase performance advisor.

-- ============================================================================
-- users: merge admin/self policies into one per action
-- ============================================================================

drop policy if exists "Admins can view all users" on public.users;
drop policy if exists "Users can view their own profile" on public.users;
create policy users_select_self_or_admin
  on public.users
  for select
  to public
  using (
    (((select auth.uid())::text) = id)
    or is_user_admin()
  );

drop policy if exists "Admins can update all users" on public.users;
drop policy if exists "Users can update their own profile" on public.users;
create policy users_update_self_or_admin
  on public.users
  for update
  to public
  using (
    (((select auth.uid())::text) = id)
    or is_user_admin()
  )
  with check (
    (((select auth.uid())::text) = id)
    or is_user_admin()
  );

-- ============================================================================
-- tee_times: split ALL policies into action-specific policies
-- ============================================================================

drop policy if exists "Users can view open tee times" on public.tee_times;
drop policy if exists "Super admins can manage all tee times" on public.tee_times;
drop policy if exists "Club admins can manage their club tee times" on public.tee_times;

create policy tee_times_select_open_or_admin
  on public.tee_times
  for select
  to public
  using (
    (status = 'OPEN'::text)
    or is_super_admin()
    or is_club_admin(golf_club_id)
  );

create policy tee_times_insert_admin
  on public.tee_times
  for insert
  to public
  with check (
    is_super_admin()
    or is_club_admin(golf_club_id)
  );

create policy tee_times_update_admin
  on public.tee_times
  for update
  to public
  using (
    is_super_admin()
    or is_club_admin(golf_club_id)
  )
  with check (
    is_super_admin()
    or is_club_admin(golf_club_id)
  );

create policy tee_times_delete_admin
  on public.tee_times
  for delete
  to public
  using (
    is_super_admin()
    or is_club_admin(golf_club_id)
  );

-- ============================================================================
-- weather_cache: keep public read, split admin ALL into write-only actions
-- ============================================================================

drop policy if exists weather_cache_admin_write on public.weather_cache;

create policy weather_cache_admin_insert
  on public.weather_cache
  for insert
  to authenticated
  with check (
    is_super_admin()
    or is_user_admin()
  );

create policy weather_cache_admin_update
  on public.weather_cache
  for update
  to authenticated
  using (
    is_super_admin()
    or is_user_admin()
  )
  with check (
    is_super_admin()
    or is_user_admin()
  );

create policy weather_cache_admin_delete
  on public.weather_cache
  for delete
  to authenticated
  using (
    is_super_admin()
    or is_user_admin()
  );

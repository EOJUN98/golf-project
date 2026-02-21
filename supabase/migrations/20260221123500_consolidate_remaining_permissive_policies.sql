-- Consolidate remaining multiple-permissive policy groups:
-- - club_admins SELECT
-- - golf_clubs SELECT
-- - reservations UPDATE

-- ============================================================================
-- club_admins
-- ============================================================================

drop policy if exists "Super admins can manage club admins" on public.club_admins;
drop policy if exists "Club admins can view their assignments" on public.club_admins;

create policy club_admins_select_self_or_super
  on public.club_admins
  for select
  to public
  using (
    is_super_admin()
    or user_id = ((select auth.uid())::text)
  );

create policy club_admins_insert_super
  on public.club_admins
  for insert
  to public
  with check (is_super_admin());

create policy club_admins_update_super
  on public.club_admins
  for update
  to public
  using (is_super_admin())
  with check (is_super_admin());

create policy club_admins_delete_super
  on public.club_admins
  for delete
  to public
  using (is_super_admin());

-- ============================================================================
-- golf_clubs
-- ============================================================================

drop policy if exists golf_clubs_admin_write on public.golf_clubs;

create policy golf_clubs_admin_insert
  on public.golf_clubs
  for insert
  to authenticated
  with check (is_super_admin() or is_user_admin());

create policy golf_clubs_admin_update
  on public.golf_clubs
  for update
  to authenticated
  using (is_super_admin() or is_user_admin())
  with check (is_super_admin() or is_user_admin());

create policy golf_clubs_admin_delete
  on public.golf_clubs
  for delete
  to authenticated
  using (is_super_admin() or is_user_admin());

-- ============================================================================
-- reservations (UPDATE)
-- ============================================================================

drop policy if exists reservations_update_admin on public.reservations;
drop policy if exists reservations_update_club_admin on public.reservations;
drop policy if exists reservations_update_owner_cancel on public.reservations;

create policy reservations_update_owner_or_admin_or_club_admin
  on public.reservations
  for update
  to authenticated
  using (
    is_super_admin()
    or is_user_admin()
    or exists (
      select 1
      from public.tee_times tt
      where tt.id = reservations.tee_time_id
        and is_club_admin(tt.golf_club_id)
    )
    or (
      ((select auth.uid())::text = user_id)
      and status = any (array['PENDING'::text, 'PAID'::text])
    )
  )
  with check (
    is_super_admin()
    or is_user_admin()
    or exists (
      select 1
      from public.tee_times tt
      where tt.id = reservations.tee_time_id
        and is_club_admin(tt.golf_club_id)
    )
    or ((select auth.uid())::text = user_id)
  );

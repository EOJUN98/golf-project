-- Optimize RLS policy predicates by wrapping auth.uid() in SELECT
-- so Postgres can evaluate once per statement instead of per-row.

drop policy if exists "Club admins can view their assignments" on public.club_admins;
create policy "Club admins can view their assignments"
  on public.club_admins
  for select
  to public
  using (user_id = ((select auth.uid())::text));

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications
  for select
  to public
  using (
    (user_id = ((select auth.uid())::text))
    or user_id is null
  );

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
  on public.notifications
  for update
  to public
  using (user_id = ((select auth.uid())::text))
  with check (status = any (array['READ'::text, 'DISMISSED'::text]));

drop policy if exists "Admins can create notifications" on public.notifications;
create policy "Admins can create notifications"
  on public.notifications
  for insert
  to public
  with check (
    exists (
      select 1
      from public.users
      where users.id = ((select auth.uid())::text)
        and (users.is_admin = true or users.is_super_admin = true)
    )
  );

drop policy if exists reservations_select_owner_or_admin on public.reservations;
create policy reservations_select_owner_or_admin
  on public.reservations
  for select
  to authenticated
  using (
    (((select auth.uid())::text) = user_id)
    or is_super_admin()
    or is_user_admin()
    or exists (
      select 1
      from public.tee_times tt
      where tt.id = reservations.tee_time_id
        and is_club_admin(tt.golf_club_id)
    )
  );

drop policy if exists reservations_insert_owner_or_admin on public.reservations;
create policy reservations_insert_owner_or_admin
  on public.reservations
  for insert
  to authenticated
  with check (
    (((select auth.uid())::text) = user_id)
    or is_super_admin()
    or is_user_admin()
  );

drop policy if exists reservations_update_owner_cancel on public.reservations;
create policy reservations_update_owner_cancel
  on public.reservations
  for update
  to authenticated
  using (
    (((select auth.uid())::text) = user_id)
    and status = any (array['PENDING'::text, 'PAID'::text])
  )
  with check (((select auth.uid())::text) = user_id);

drop policy if exists "Users can view their own profile" on public.users;
create policy "Users can view their own profile"
  on public.users
  for select
  to public
  using (((select auth.uid())::text) = id);

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
  on public.users
  for update
  to public
  using (((select auth.uid())::text) = id);

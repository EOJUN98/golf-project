-- Consolidate notifications INSERT permissive policies into a single policy
-- to avoid duplicate permissive policies for the same table/action.

drop policy if exists "Admins can create notifications" on public.notifications;
drop policy if exists "Service role can create notifications" on public.notifications;

create policy notifications_insert_admin_or_service_role
  on public.notifications
  for insert
  to public
  with check (
    ((select auth.role()) = 'service_role'::text)
    or exists (
      select 1
      from public.users
      where users.id = ((select auth.uid())::text)
        and (users.is_admin = true or users.is_super_admin = true)
    )
  );

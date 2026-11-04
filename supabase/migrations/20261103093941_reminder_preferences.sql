-- Opt-in weekly routines for fictional prototype accounts. No push subscriptions.
create table public.reminder_preferences (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_key text not null check (task_key in ('meal-planning','shopping','pantry','leftovers')),
  enabled boolean not null default false,
  weekday smallint not null check (weekday between 0 and 6),
  time_of_day text not null check (time_of_day ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  time_zone text not null default 'Pacific/Auckland' check (time_zone = 'Pacific/Auckland'),
  starts_at timestamptz not null default now(),
  last_acknowledged_at timestamptz,
  is_fictional boolean not null default true check (is_fictional),
  primary key (owner_id, task_key)
);
alter table public.reminder_preferences enable row level security;
revoke all on public.reminder_preferences from anon, authenticated;
grant select, insert, update, delete on public.reminder_preferences to authenticated;
create policy reminders_select on public.reminder_preferences for select to authenticated using ((select auth.uid()) = owner_id);
create policy reminders_insert on public.reminder_preferences for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy reminders_update on public.reminder_preferences for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy reminders_delete on public.reminder_preferences for delete to authenticated using ((select auth.uid()) = owner_id);

-- Fictional evaluator meal plans; ingredient notes are snapshots, not stock deductions.
create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  meal_date date not null check (meal_date between '2000-01-01'::date and '2100-12-31'::date),
  meal_slot text not null check (meal_slot in ('Breakfast','Lunch','Dinner','Snack')),
  portions smallint not null check (portions between 1 and 50),
  ingredients text not null default '' check (length(ingredients) <= 2000),
  notes text not null default '' check (length(notes) <= 500),
  includes_leftovers boolean not null default false,
  is_fictional boolean not null default true check (is_fictional),
  created_at timestamptz not null default now()
);
create index meal_plans_owner_date_idx on public.meal_plans(owner_id, meal_date);
alter table public.meal_plans enable row level security;
revoke all on public.meal_plans from anon, authenticated;
grant select, insert, update, delete on public.meal_plans to authenticated;
create policy meals_select on public.meal_plans for select to authenticated using ((select auth.uid()) = owner_id);
create policy meals_insert on public.meal_plans for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy meals_update on public.meal_plans for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy meals_delete on public.meal_plans for delete to authenticated using ((select auth.uid()) = owner_id);

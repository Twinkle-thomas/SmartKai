-- Academic prototype: use fictional inventory entries only.
create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  quantity numeric(9,3) not null check (quantity > 0 and quantity <= 100000),
  unit text not null check (length(btrim(unit)) between 1 and 30),
  location text not null check (location in ('Pantry','Fridge','Freezer','Fruit bowl','Other')),
  date_type text not null default 'Not recorded' check (date_type in ('Not recorded','Use by','Best before','Prepared on')),
  food_date date,
  use_first boolean not null default false,
  is_leftover boolean not null default false,
  notes text not null default '' check (length(notes) <= 500),
  is_fictional boolean not null default true check (is_fictional),
  created_at timestamptz not null default now(),
  check ((date_type = 'Not recorded' and food_date is null) or (date_type <> 'Not recorded' and food_date is not null))
);
create index pantry_items_owner_created_idx on public.pantry_items(owner_id, created_at desc);
alter table public.pantry_items enable row level security;
revoke all on public.pantry_items from anon, authenticated;
grant select, insert, update, delete on public.pantry_items to authenticated;
create policy pantry_select on public.pantry_items for select to authenticated using ((select auth.uid()) = owner_id);
create policy pantry_insert on public.pantry_items for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy pantry_update on public.pantry_items for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy pantry_delete on public.pantry_items for delete to authenticated using ((select auth.uid()) = owner_id);

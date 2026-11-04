-- One active fictional shopping list per evaluator account.
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  quantity numeric(9,3) not null check (quantity > 0 and quantity <= 100000),
  unit text not null check (length(btrim(unit)) between 1 and 30),
  notes text not null default '' check (length(notes) <= 500),
  purchased boolean not null default false,
  is_fictional boolean not null default true check (is_fictional),
  created_at timestamptz not null default now()
);
create index shopping_items_owner_created_idx on public.shopping_items(owner_id, created_at desc);
alter table public.shopping_items enable row level security;
revoke all on public.shopping_items from anon, authenticated;
grant select, insert, update, delete on public.shopping_items to authenticated;
create policy shopping_select on public.shopping_items for select to authenticated using ((select auth.uid()) = owner_id);
create policy shopping_insert on public.shopping_items for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy shopping_update on public.shopping_items for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy shopping_delete on public.shopping_items for delete to authenticated using ((select auth.uid()) = owner_id);

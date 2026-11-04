alter table public.pantry_items
  add column category text not null default 'Other' check (category in ('Vegetables','Fruit','Grains','Dairy','Protein','Prepared meals','Other')),
  add column planned_use_date date,
  add column leftover_status text not null default 'Available' check (leftover_status in ('Available','Frozen','Used','Discarded'));
alter table public.pantry_items add constraint leftover_details_check check (
  (is_leftover or (planned_use_date is null and leftover_status='Available'))
  and (leftover_status <> 'Frozen' or location='Freezer')
);
create table public.sharing_offers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  quantity numeric(9,3) not null check (quantity > 0 and quantity <= 100000),
  unit text not null check (length(btrim(unit)) between 1 and 30),
  area text not null check (area in ('Auckland','Wellington','Christchurch','Hamilton','Dunedin','Other demo area')),
  donor text not null check (donor in ('Demo household A','Demo household B','Demo household C')),
  best_before date not null,
  condition text not null default 'Unopened shelf-stable' check (condition='Unopened shelf-stable'),
  recipient text check (recipient in ('Demo household A','Demo household B','Demo household C')),
  status text not null default 'Available' check (status in ('Available','Reserved','Collected','Withdrawn')),
  notes text not null default '' check (length(notes) <= 500),
  is_simulation boolean not null default true check (is_simulation),
  created_at timestamptz not null default now(),
  check ((status in ('Reserved','Collected') and recipient is not null and recipient<>donor) or (status in ('Available','Withdrawn') and recipient is null))
);
create index sharing_offers_owner_created_idx on public.sharing_offers(owner_id,created_at desc);
alter table public.sharing_offers enable row level security;
revoke all on public.sharing_offers from anon, authenticated;
grant select,insert,update,delete on public.sharing_offers to authenticated;
create policy sharing_select on public.sharing_offers for select to authenticated using ((select auth.uid())=owner_id);
create policy sharing_insert on public.sharing_offers for insert to authenticated with check ((select auth.uid())=owner_id);
create policy sharing_update on public.sharing_offers for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
create policy sharing_delete on public.sharing_offers for delete to authenticated using ((select auth.uid())=owner_id);

-- One append-only ledger: never duplicate legacy discards into another table.
alter table public.inventory_events
 add column event_date date,
 add column category text not null default 'Other' check(category in ('Vegetables','Fruit','Grains','Dairy','Protein','Prepared meals','Other')),
 add column notes text not null default '' check(length(notes)<=500),
 add column operation_id uuid,
 add column request_data jsonb,
 add column legacy_metadata boolean not null default true;
update public.inventory_events set event_date=(created_at at time zone 'Pacific/Auckland')::date;
alter table public.inventory_events alter column event_date set not null;
alter table public.inventory_events alter column event_date set default ((now() at time zone 'Pacific/Auckland')::date);
alter table public.inventory_events alter column legacy_metadata set default false;
alter table public.inventory_events add constraint waste_date_range check(event_date between '2000-01-01' and '2099-12-31');
create unique index inventory_event_operation on public.inventory_events(owner_id,operation_id) where operation_id is not null;
create index inventory_discard_dates on public.inventory_events(owner_id,event_date,id) where outcome='Discarded';

-- Old RPC callers still capture the current food category; historical rows remain Other.
create function public.snapshot_event_category() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.pantry_item_id is not null then
  select category into new.category from public.pantry_items where id=new.pantry_item_id and owner_id=auth.uid();
  if not found then raise exception 'Inventory unavailable'; end if;
 end if;
 return new;
end $$;
create trigger inventory_category_snapshot before insert on public.inventory_events for each row execute function public.snapshot_event_category();
revoke all on function public.snapshot_event_category() from public,anon;
grant execute on function public.snapshot_event_category() to authenticated;

drop policy events_insert on public.inventory_events;
create policy events_insert on public.inventory_events for insert to authenticated with check
 ((select auth.uid())=owner_id
 and (pantry_item_id is null and outcome='Discarded' and operation_id is not null
      or exists(select 1 from public.pantry_items p where p.id=pantry_item_id and p.owner_id=(select auth.uid())))
 and (meal_id is null or exists(select 1 from public.meal_plans m where m.id=meal_id and m.owner_id=(select auth.uid()))));

create table public.waste_baselines (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 start_date date not null check(start_date between '2000-01-01' and '2099-12-31' and extract(isodow from start_date)=1)
);
alter table public.waste_baselines enable row level security;
revoke all on public.waste_baselines from anon;
grant select,insert,update on public.waste_baselines to authenticated;
create policy baseline_read on public.waste_baselines for select to authenticated using((select auth.uid())=owner_id);
create policy baseline_insert on public.waste_baselines for insert to authenticated with check((select auth.uid())=owner_id);
create policy baseline_update on public.waste_baselines for update to authenticated using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);

create function public.record_waste_discard(p_request uuid,p_food uuid,p_date date,p_name text,p_category text,p_quantity numeric,p_unit text,p_reason text,p_notes text default '')
returns uuid language plpgsql security invoker set search_path='' as $$
declare food public.pantry_items; previous public.inventory_events; result uuid; payload jsonb;
begin
 if auth.uid() is null or p_request is null then raise exception 'Sign in and provide a request identifier'; end if;
 if p_date is null or p_date not between '2000-01-01' and '2099-12-31' or p_date>(now() at time zone 'Pacific/Auckland')::date
 or p_name is null or length(btrim(p_name)) not between 1 and 100
 or p_unit is null or length(btrim(p_unit)) not between 1 and 30
 or p_reason is null or length(btrim(p_reason)) not between 1 and 300
 or p_notes is null or length(p_notes)>500
 or p_quantity is null or p_quantity<=0 or p_quantity>100000 or p_quantity<>round(p_quantity,3)
 or p_category is null or p_category not in ('Vegetables','Fruit','Grains','Dairy','Protein','Prepared meals','Other') then raise exception 'Invalid discard details'; end if;
 payload=jsonb_build_array(p_food,p_date,btrim(p_name),p_category,p_quantity,btrim(p_unit),btrim(p_reason),p_notes);
 -- Serialise retries before reading or mutating stock, including standalone requests.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text||p_request::text,0));
 select * into previous from public.inventory_events where owner_id=auth.uid() and operation_id=p_request;
 if found then
  if previous.request_data is distinct from payload then raise exception 'Request identifier already used for different details'; end if;
  return previous.id;
 end if;
 if p_food is not null then
  select * into food from public.pantry_items where id=p_food and owner_id=auth.uid() for update;
  if not found or food.leftover_status not in ('Available','Frozen') then raise exception 'Inventory unavailable'; end if;
  if p_quantity>food.quantity or btrim(p_unit)<>food.unit or btrim(p_name)<>food.name or p_category<>food.category then raise exception 'Refresh inventory and review quantity and units'; end if;
 end if;
 insert into public.inventory_events(owner_id,pantry_item_id,food_name,quantity,unit,outcome,reason,event_date,category,notes,operation_id,request_data)
 values(auth.uid(),p_food,btrim(p_name),p_quantity,btrim(p_unit),'Discarded',btrim(p_reason),p_date,p_category,p_notes,p_request,payload) returning id into result;
 if p_food is not null then
  update public.pantry_items set quantity=case when p_quantity=food.quantity then quantity else quantity-p_quantity end,
   leftover_status=case when p_quantity=food.quantity then 'Discarded' else leftover_status end,disposal_reason=btrim(p_reason) where id=p_food;
 end if;
 return result;
end $$;
revoke all on function public.record_waste_discard(uuid,uuid,date,text,text,numeric,text,text,text) from public,anon;
grant execute on function public.record_waste_discard(uuid,uuid,date,text,text,numeric,text,text,text) to authenticated;

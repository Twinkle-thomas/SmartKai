-- Additive integrations; existing profile rules and records are preserved.
alter table public.pantry_items
  add column purchase_date date,
  add column prepared_date date,
  add column stored_date date,
  add column disposal_reason text not null default '' check(length(disposal_reason)<=300);
alter table public.pantry_items drop constraint leftover_details_check;
alter table public.pantry_items add constraint leftover_details_check check
  ((is_leftover or planned_use_date is null) and (leftover_status <> 'Frozen' or location='Freezer'));
alter table public.shopping_items
  add column category text not null default 'Other' check(category in ('Vegetables','Fruit','Grains','Dairy','Protein','Prepared meals','Other')),
  add column cost_nzd numeric(10,2) check(cost_nzd>=0 and cost_nzd<=100000),
  add column pantry_added_at timestamptz,
  add column pantry_item_id uuid references public.pantry_items(id) on delete set null;
alter table public.meal_plans add column consumed_at timestamptz;
alter table public.sharing_offers add column pantry_item_id uuid references public.pantry_items(id) on delete set null;
create index shopping_pantry_link on public.shopping_items(pantry_item_id);
create index sharing_pantry_link on public.sharing_offers(pantry_item_id);

create table public.inventory_events (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 pantry_item_id uuid references public.pantry_items(id) on delete set null,
 meal_id uuid references public.meal_plans(id) on delete set null,
 food_name text not null, quantity numeric(12,3) not null check(quantity>0), unit text not null,
 outcome text not null check(outcome in ('Used','Discarded')), reason text not null default '' check(length(reason)<=300),
 created_at timestamptz not null default now()
);
create index inventory_events_owner on public.inventory_events(owner_id,created_at desc);
create index inventory_events_pantry on public.inventory_events(pantry_item_id);
create index inventory_events_meal on public.inventory_events(meal_id);
alter table public.inventory_events enable row level security;
revoke all on public.inventory_events from anon;
grant select,insert on public.inventory_events to authenticated;
create policy events_read on public.inventory_events for select to authenticated using ((select auth.uid())=owner_id);
create policy events_insert on public.inventory_events for insert to authenticated with check
 ((select auth.uid())=owner_id and exists(select 1 from public.pantry_items p where p.id=pantry_item_id and p.owner_id=(select auth.uid()))
 and (meal_id is null or exists(select 1 from public.meal_plans m where m.id=meal_id and m.owner_id=(select auth.uid()))));

create function public.record_food_outcome(p_id uuid,p_quantity numeric,p_outcome text,p_reason text default '',p_meal uuid default null)
returns void language plpgsql security invoker set search_path='' as $$
declare food public.pantry_items; today date := (now() at time zone 'Pacific/Auckland')::date;
begin
 select * into food from public.pantry_items where id=p_id and owner_id=auth.uid() for update;
 if not found or food.leftover_status not in ('Available','Frozen') then raise exception 'Food is unavailable'; end if;
 if p_quantity is null or p_quantity<=0 or p_quantity<>round(p_quantity,3) or p_quantity>food.quantity or p_outcome not in ('Used','Discarded') or p_outcome is null then raise exception 'Invalid quantity or outcome'; end if;
 if p_outcome='Used' and food.date_type='Use by' and food.food_date<today then raise exception 'Do not consume food past its use-by date'; end if;
 if p_outcome='Discarded' and length(btrim(coalesce(p_reason,'')))=0 then raise exception 'Record a disposal reason'; end if;
 if length(coalesce(p_reason,''))>300 then raise exception 'Reason too long'; end if;
 if p_meal is not null and not exists(select 1 from public.meal_plans where id=p_meal and owner_id=auth.uid()) then raise exception 'Meal unavailable'; end if;
 insert into public.inventory_events(owner_id,pantry_item_id,meal_id,food_name,quantity,unit,outcome,reason)
 values(auth.uid(),food.id,p_meal,food.name,p_quantity,food.unit,p_outcome,coalesce(p_reason,''));
 update public.pantry_items set quantity=case when p_quantity=food.quantity then quantity else quantity-p_quantity end,
 leftover_status=case when p_quantity=food.quantity then p_outcome else leftover_status end,
 disposal_reason=case when p_outcome='Discarded' then p_reason else disposal_reason end where id=food.id;
end $$;

create function public.confirm_meal_consumption(p_meal uuid,p_items jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare meal public.meal_plans; entry jsonb;
begin
 select * into meal from public.meal_plans where id=p_meal and owner_id=auth.uid() for update;
 if not found or meal.consumed_at is not null then raise exception 'Meal unavailable or already consumed'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)>50 then raise exception 'Invalid ingredients'; end if;
 if (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(p_items)) then raise exception 'Repeated ingredient'; end if;
 -- Stable lock ordering prevents overlapping confirmations from deadlocking.
 for entry in select value from jsonb_array_elements(p_items) order by value->>'id' loop
   perform public.record_food_outcome((entry->>'id')::uuid,(entry->>'quantity')::numeric,'Used','',p_meal);
 end loop;
 update public.meal_plans set consumed_at=now() where id=p_meal;
end $$;

create function public.transfer_shopping_to_pantry(p_id uuid,p_food jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare item public.shopping_items; result uuid;
begin
 select * into item from public.shopping_items where id=p_id and owner_id=auth.uid() for update;
 if not found or not item.purchased then raise exception 'Confirm the purchase first'; end if;
 if item.pantry_added_at is not null then return item.pantry_item_id; end if;
 insert into public.pantry_items(owner_id,name,quantity,unit,location,date_type,food_date,category,purchase_date)
 values(auth.uid(),p_food->>'name',(p_food->>'quantity')::numeric,p_food->>'unit',p_food->>'location',
 p_food->>'date_type',nullif(p_food->>'food_date','')::date,coalesce(p_food->>'category','Other'),nullif(p_food->>'purchase_date','')::date) returning id into result;
 update public.shopping_items set pantry_item_id=result,pantry_added_at=now() where id=item.id;
 return result;
end $$;

create function public.check_linked_offer() returns trigger language plpgsql security invoker set search_path='' as $$
declare food public.pantry_items;
begin
 if new.pantry_item_id is not null then
  select * into food from public.pantry_items where id=new.pantry_item_id and owner_id=auth.uid();
  if not found or food.location<>'Pantry' or food.is_leftover or food.leftover_status<>'Available'
   or food.date_type<>'Best before' or food.food_date<(now() at time zone 'Pacific/Auckland')::date
   or new.unit<>food.unit or new.quantity>food.quantity then raise exception 'Linked inventory is not eligible for this simulation'; end if;
 end if;
 return new;
end $$;
create trigger linked_offer_check before insert or update of pantry_item_id,quantity,unit on public.sharing_offers for each row execute function public.check_linked_offer();
create function public.check_shopping_link() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.pantry_item_id is not null and not exists(select 1 from public.pantry_items where id=new.pantry_item_id and owner_id=auth.uid()) then raise exception 'Inventory link unavailable'; end if;
 return new;
end $$;
create trigger shopping_link_check before insert or update of pantry_item_id on public.shopping_items for each row execute function public.check_shopping_link();
revoke all on function public.check_shopping_link() from public,anon;
grant execute on function public.check_shopping_link() to authenticated;
revoke all on function public.record_food_outcome(uuid,numeric,text,text,uuid),public.confirm_meal_consumption(uuid,jsonb),public.transfer_shopping_to_pantry(uuid,jsonb),public.check_linked_offer() from public,anon;
grant execute on function public.record_food_outcome(uuid,numeric,text,text,uuid),public.confirm_meal_consumption(uuid,jsonb),public.transfer_shopping_to_pantry(uuid,jsonb),public.check_linked_offer() to authenticated;

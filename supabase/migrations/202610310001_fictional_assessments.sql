-- Apply once to a new SmartKai Supabase project. No real household data.
begin;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  fictional_label text not null check (fictional_label ~ '^Fictional Household [0-9a-f-]{36}$'),
  is_fictional boolean not null default true check (is_fictional = true),
  created_at timestamptz not null default now()
);
create index households_owner_idx on public.households(owner_id);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  overbuying smallint not null check (overbuying between 0 and 2),
  forgetting_food smallint not null check (forgetting_food between 0 and 2),
  poor_meal_planning smallint not null check (poor_meal_planning between 0 and 2),
  discarding_leftovers smallint not null check (discarding_leftovers between 0 and 2),
  storage_uncertainty smallint not null check (storage_uncertainty between 0 and 2),
  rule_version text not null check (rule_version = 'provisional-v1'),
  scenario_key text check (scenario_key in ('no-frequent-indicators','overbuyer-only','forgetter-only','planner-only','leftovers-only','storage-only','multiple-profiles','all-profiles')),
  created_at timestamptz not null default now()
);
create index assessments_household_idx on public.assessments(household_id);

create table public.assessment_results (
  assessment_id uuid primary key references public.assessments(id) on delete cascade,
  profiles text[] not null check (profiles <@ array['Overbuyer','Food Forgetter','Poor Meal Planner','Leftover Discarder','Storage Learner']::text[]),
  explanations jsonb not null check (jsonb_typeof(explanations) = 'array'),
  recommendations jsonb not null check (jsonb_typeof(recommendations) = 'array')
);

alter table public.households enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_results enable row level security;

create policy read_own_households on public.households for select to authenticated
  using (owner_id = (select auth.uid()));
create policy read_own_assessments on public.assessments for select to authenticated
  using (exists (select 1 from public.households h where h.id = household_id and h.owner_id = (select auth.uid())));
create policy read_own_results on public.assessment_results for select to authenticated
  using (exists (select 1 from public.assessments a join public.households h on h.id = a.household_id
    where a.id = assessment_id and h.owner_id = (select auth.uid())));

-- Browser users can read their records, but all writes go through the validated RPC.
revoke all on public.households, public.assessments, public.assessment_results from anon, authenticated;
grant select on public.households, public.assessments, public.assessment_results to authenticated;

create function public.save_fictional_assessment(p_scores jsonb, p_scenario_key text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  evaluator_id uuid := auth.uid();
  household_uuid uuid := gen_random_uuid();
  assessment_uuid uuid := gen_random_uuid();
  matched_profiles text[];
  matched_explanations jsonb;
  matched_recommendations jsonb;
  expected_scores jsonb;
begin
  if evaluator_id is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'A signed-in evaluator is required' using errcode = '42501';
  end if;
  if p_scores is null or jsonb_typeof(p_scores) <> 'object' then
    raise exception 'Provide all five integer scores';
  end if;
  if (select count(*) from jsonb_object_keys(p_scores)) <> 5
    or not (p_scores ?& array['overbuying','forgetting_food','poor_meal_planning','discarding_leftovers','storage_uncertainty'])
    or exists (select 1 from jsonb_each(p_scores) e where jsonb_typeof(e.value) <> 'number' or e.value::text !~ '^[012]$') then
    raise exception 'Each indicator must be an integer of 0, 1, or 2';
  end if;

  -- Prevent a modified custom input being recorded as a predefined scenario.
  if p_scenario_key is not null then
    select jsonb_build_object('overbuying', s.o, 'forgetting_food', s.f, 'poor_meal_planning', s.p,
      'discarding_leftovers', s.l, 'storage_uncertainty', s.t) into expected_scores
    from (values
      ('no-frequent-indicators',0,1,0,1,0), ('overbuyer-only',2,0,1,0,1),
      ('forgetter-only',0,2,0,1,0), ('planner-only',1,0,2,0,0),
      ('leftovers-only',0,1,0,2,0), ('storage-only',0,0,1,0,2),
      ('multiple-profiles',2,2,0,1,2), ('all-profiles',2,2,2,2,2)
    ) s(key,o,f,p,l,t) where s.key = p_scenario_key;
    if expected_scores is null or expected_scores <> p_scores then
      raise exception 'Scenario does not match the answers';
    end if;
  end if;

  -- Derive snapshots on the server: do not trust client-supplied classifications.
  select coalesce(array_agg(r.profile order by r.position), '{}'::text[]),
    coalesce(jsonb_agg(jsonb_build_object('indicator',r.indicator,'profile',r.profile,'score',2,'threshold',2) order by r.position), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object('id',r.recommendation_id,'profile',r.profile,'text',r.recommendation) order by r.position),
      '[{"id":"general-prevention","profile":null,"text":"Check food already available, shop with a list, and plan how to use food and suitable leftovers."}]'::jsonb)
  into matched_profiles, matched_explanations, matched_recommendations
  from (values
    (1,'overbuying','overbuying','Overbuyer','check-before-shopping','Check the fridge and pantry before shopping and use a list with quantities.'),
    (2,'forgetting_food','forgettingFood','Food Forgetter','use-first-area','Create a visible use-first area and check it regularly.'),
    (3,'poor_meal_planning','poorMealPlanning','Poor Meal Planner','plan-before-shopping','Outline a few upcoming meals using food already available before writing a shopping list.'),
    (4,'discarding_leftovers','discardingLeftovers','Leftover Discarder','plan-leftover-use','Plan an upcoming meal around suitable leftovers and prepare portions that match household needs.'),
    (5,'storage_uncertainty','storageUncertainty','Storage Learner','check-storage-instructions','Check food packaging for storage instructions and organise food so it is easy to find.')
  ) r(position,score_key,indicator,profile,recommendation_id,recommendation)
  where (p_scores ->> r.score_key)::integer = 2;

  insert into public.households(id,owner_id,fictional_label)
    values (household_uuid,evaluator_id,'Fictional Household ' || household_uuid::text);
  insert into public.assessments(id,household_id,overbuying,forgetting_food,poor_meal_planning,discarding_leftovers,storage_uncertainty,rule_version,scenario_key)
    values (assessment_uuid,household_uuid,(p_scores->>'overbuying')::smallint,(p_scores->>'forgetting_food')::smallint,
      (p_scores->>'poor_meal_planning')::smallint,(p_scores->>'discarding_leftovers')::smallint,
      (p_scores->>'storage_uncertainty')::smallint,'provisional-v1',p_scenario_key);
  insert into public.assessment_results values (assessment_uuid,matched_profiles,matched_explanations,matched_recommendations);
  return assessment_uuid;
end;
$$;
revoke all on function public.save_fictional_assessment(jsonb,text) from public, anon, authenticated;
grant execute on function public.save_fictional_assessment(jsonb,text) to authenticated;
commit;

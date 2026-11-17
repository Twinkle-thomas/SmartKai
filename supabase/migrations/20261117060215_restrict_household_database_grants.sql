revoke truncate, references, trigger on public.inventory_events, public.waste_baselines
  from public, anon, authenticated;

-- This optional Supabase event trigger runs during DDL, not through the Data API.
do $$
begin
  if exists (
    select 1 from pg_event_trigger
    where evtfoid = to_regprocedure('public.rls_auto_enable()')
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;

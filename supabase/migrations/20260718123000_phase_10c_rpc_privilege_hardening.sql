-- Phase 10C follow-up: platform-created RLS event-trigger helpers are not API RPCs.
-- Some hosted projects contain this helper while a clean local stack does not,
-- so keep the forward migration portable across both environments.
do $migration$
begin
  if pg_catalog.to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end
$migration$;

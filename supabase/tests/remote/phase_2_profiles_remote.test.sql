\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

begin;

select '1..21';

select case when to_regclass('public.profiles') is not null
  then 'ok 1 - profiles table exists'
  else 'not ok 1 - profiles table exists'
end;

select case when exists (
  select 1
  from pg_catalog.pg_constraint
  where conrelid = 'public.profiles'::regclass
    and contype = 'p'
    and conkey = array[
      (
        select attnum::smallint
        from pg_catalog.pg_attribute
        where attrelid = 'public.profiles'::regclass
          and attname = 'id'
      )
    ]
) then 'ok 2 - profiles.id is the primary key'
else 'not ok 2 - profiles.id is the primary key'
end;

select case when exists (
  select 1
  from pg_catalog.pg_constraint
  where conrelid = 'public.profiles'::regclass
    and confrelid = 'auth.users'::regclass
    and contype = 'f'
    and confdeltype = 'c'
) then 'ok 3 - profiles.id references auth.users with cascade delete'
else 'not ok 3 - profiles.id references auth.users with cascade delete'
end;

select case when (
  select relrowsecurity
  from pg_catalog.pg_class
  where oid = 'public.profiles'::regclass
) then 'ok 4 - RLS is enabled on profiles'
else 'not ok 4 - RLS is enabled on profiles'
end;

select case when (
  select array_agg(policyname::text order by policyname)
  from pg_catalog.pg_policies
  where schemaname = 'public' and tablename = 'profiles'
) = array[
  'Authenticated users can read their own profile',
  'Authenticated users can update their own profile'
] then 'ok 5 - profiles has exactly the two ownership policies'
else 'not ok 5 - profiles has exactly the two ownership policies'
end;

select case when exists (
  select 1
  from pg_catalog.pg_trigger
  where tgrelid = 'auth.users'::regclass
    and tgname = 'on_auth_user_created'
    and not tgisinternal
) then 'ok 6 - auth user creation trigger exists'
else 'not ok 6 - auth user creation trigger exists'
end;

select case when exists (
  select 1
  from pg_catalog.pg_trigger
  where tgrelid = 'public.profiles'::regclass
    and tgname = 'set_profiles_updated_at'
    and not tgisinternal
) then 'ok 7 - profile updated_at trigger exists'
else 'not ok 7 - profile updated_at trigger exists'
end;

select case when exists (
  select 1
  from pg_catalog.pg_proc
  where oid = 'public.handle_new_auth_user()'::regprocedure
    and prosecdef
    and coalesce(proconfig, array[]::text[]) @> array['search_path=""']
) then 'ok 8 - profile creation function is hardened security definer'
else 'not ok 8 - profile creation function is hardened security definer'
end;

select case when has_table_privilege(
  'authenticated',
  'public.profiles',
  'select'
) then 'ok 9 - authenticated has SELECT on profiles'
else 'not ok 9 - authenticated has SELECT on profiles'
end;

select case when has_column_privilege(
  'authenticated',
  'public.profiles',
  'display_name',
  'update'
) and not has_column_privilege(
  'authenticated',
  'public.profiles',
  'timezone',
  'update'
) then 'ok 10 - authenticated can update only display_name'
else 'not ok 10 - authenticated can update only display_name'
end;

select case when not has_table_privilege(
  'authenticated',
  'public.profiles',
  'insert'
) and not has_table_privilege(
  'authenticated',
  'public.profiles',
  'delete'
) then 'ok 11 - authenticated cannot directly insert or delete profiles'
else 'not ok 11 - authenticated cannot directly insert or delete profiles'
end;

select case when not has_table_privilege('anon', 'public.profiles', 'select')
  and not has_table_privilege('anon', 'public.profiles', 'update')
  then 'ok 12 - anonymous has no profile read or update grants'
  else 'not ok 12 - anonymous has no profile read or update grants'
end;

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '31111111-1111-4111-8111-111111111111',
    'phase2-remote-user-a@example.test',
    '{"display_name":"Remote User A"}'::jsonb
  ),
  (
    '32222222-2222-4222-8222-222222222222',
    'phase2-remote-user-b@example.test',
    '{"display_name":"Remote User B"}'::jsonb
  );

select case when (
  select display_name = 'Remote User A'
  from public.profiles
  where id = '31111111-1111-4111-8111-111111111111'::uuid
) then 'ok 13 - auth.users trigger creates profile from display metadata'
else 'not ok 13 - auth.users trigger creates profile from display metadata'
end;

update public.profiles
set updated_at = '2020-01-01 00:00:00+00'
where id = '31111111-1111-4111-8111-111111111111'::uuid;

set local role authenticated;
set local request.jwt.claim.sub = '31111111-1111-4111-8111-111111111111';

select case when (select count(*) from public.profiles) = 1
  then 'ok 14 - User A reads only profile A'
  else 'not ok 14 - User A reads only profile A'
end;

select case when (
  select count(*)
  from public.profiles
  where id = '32222222-2222-4222-8222-222222222222'::uuid
) = 0 then 'ok 15 - User A cannot read profile B'
else 'not ok 15 - User A cannot read profile B'
end;

with changed as (
  update public.profiles
  set display_name = 'Remote User A Updated'
  where id = '31111111-1111-4111-8111-111111111111'::uuid
  returning 1
)
select case when count(*) = 1
  then 'ok 16 - User A can update profile A'
  else 'not ok 16 - User A can update profile A'
end
from changed;

select case when (
  select updated_at > '2020-01-01 00:00:00+00'::timestamptz
  from public.profiles
  where id = '31111111-1111-4111-8111-111111111111'::uuid
) then 'ok 17 - profile update advances updated_at'
else 'not ok 17 - profile update advances updated_at'
end;

with changed as (
  update public.profiles
  set display_name = 'Unauthorized change'
  where id = '32222222-2222-4222-8222-222222222222'::uuid
  returning 1
)
select case when count(*) = 0
  then 'ok 18 - User A cannot update profile B'
  else 'not ok 18 - User A cannot update profile B'
end
from changed;

savepoint authenticated_column_denial;
\set ON_ERROR_STOP off
update public.profiles
set timezone = 'UTC'
where id = '31111111-1111-4111-8111-111111111111'::uuid;
\if :ERROR
\set denied_sqlstate :SQLSTATE
rollback to savepoint authenticated_column_denial;
select case when :'denied_sqlstate' = '42501'
  then 'ok 19 - authenticated cannot update non-editable columns'
  else 'not ok 19 - authenticated cannot update non-editable columns'
end;
\else
release savepoint authenticated_column_denial;
select 'not ok 19 - authenticated cannot update non-editable columns';
\endif
\set ON_ERROR_STOP on

reset role;
set local role anon;

savepoint anonymous_select_denial;
\set ON_ERROR_STOP off
select count(*) from public.profiles;
\if :ERROR
\set denied_sqlstate :SQLSTATE
rollback to savepoint anonymous_select_denial;
select case when :'denied_sqlstate' = '42501'
  then 'ok 20 - anonymous cannot select profiles'
  else 'not ok 20 - anonymous cannot select profiles'
end;
\else
release savepoint anonymous_select_denial;
select 'not ok 20 - anonymous cannot select profiles';
\endif

savepoint anonymous_update_denial;
update public.profiles
set display_name = 'Anonymous change'
where id = '31111111-1111-4111-8111-111111111111'::uuid;
\if :ERROR
\set denied_sqlstate :SQLSTATE
rollback to savepoint anonymous_update_denial;
select case when :'denied_sqlstate' = '42501'
  then 'ok 21 - anonymous cannot update profiles'
  else 'not ok 21 - anonymous cannot update profiles'
end;
\else
release savepoint anonymous_update_denial;
select 'not ok 21 - anonymous cannot update profiles';
\endif
\set ON_ERROR_STOP on

reset role;
rollback;

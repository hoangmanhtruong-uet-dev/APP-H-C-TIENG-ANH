begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(21);

select extensions.has_table('public', 'profiles', 'profiles table exists');

select extensions.col_is_pk(
  'public',
  'profiles',
  'id',
  'profiles.id is the primary key'
);

select extensions.col_is_fk(
  'public',
  'profiles',
  'id',
  'profiles.id references auth.users'
);

select extensions.ok(
  (
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.profiles'::regclass
  ),
  'RLS is enabled on profiles'
);

select extensions.policies_are(
  'public',
  'profiles',
  array[
    'Authenticated users can read their own profile',
    'Authenticated users can update their own profile'
  ],
  'profiles exposes only the two ownership policies'
);

select extensions.has_trigger(
  'auth',
  'users',
  'on_auth_user_created',
  'auth user creation trigger exists'
);

select extensions.has_trigger(
  'public',
  'profiles',
  'set_profiles_updated_at',
  'profile updated_at trigger exists'
);

select extensions.is_definer(
  'public',
  'handle_new_auth_user',
  array[]::text[],
  'profile creation function is security definer'
);

select extensions.ok(
  has_table_privilege('authenticated', 'public.profiles', 'select'),
  'authenticated has SELECT on profiles'
);

select extensions.ok(
  has_column_privilege(
    'authenticated',
    'public.profiles',
    'display_name',
    'update'
  ),
  'authenticated can update only the editable display_name column'
);

select extensions.ok(
  not has_table_privilege('authenticated', 'public.profiles', 'insert')
  and not has_table_privilege('authenticated', 'public.profiles', 'delete'),
  'authenticated cannot directly insert or delete profiles'
);

select extensions.ok(
  not has_table_privilege('anon', 'public.profiles', 'select')
  and not has_table_privilege('anon', 'public.profiles', 'update'),
  'anonymous has no profile read or update grants'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'phase2-user-a@example.test',
    '{"display_name":"User A"}'::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'phase2-user-b@example.test',
    '{"display_name":"User B"}'::jsonb
  );

select extensions.results_eq(
  $$
    select display_name
    from public.profiles
    where id = '11111111-1111-4111-8111-111111111111'::uuid
  $$,
  array['User A'::text],
  'auth.users trigger creates a profile from trusted display metadata'
);

update public.profiles
set updated_at = '2020-01-01 00:00:00+00'
where id = '11111111-1111-4111-8111-111111111111'::uuid;

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select extensions.results_eq(
  'select count(*) from public.profiles',
  array[1::bigint],
  'User A reads only profile A'
);

select extensions.results_eq(
  $$
    select count(*)
    from public.profiles
    where id = '22222222-2222-4222-8222-222222222222'::uuid
  $$,
  array[0::bigint],
  'User A cannot read profile B'
);

select extensions.results_eq(
  $$
    with changed as (
      update public.profiles
      set display_name = 'User A Updated'
      where id = '11111111-1111-4111-8111-111111111111'::uuid
      returning 1
    )
    select count(*) from changed
  $$,
  array[1::bigint],
  'User A can update profile A'
);

select extensions.ok(
  (
    select updated_at > '2020-01-01 00:00:00+00'::timestamptz
    from public.profiles
    where id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  'profile update advances updated_at on the database'
);

select extensions.results_eq(
  $$
    with changed as (
      update public.profiles
      set display_name = 'Unauthorized change'
      where id = '22222222-2222-4222-8222-222222222222'::uuid
      returning 1
    )
    select count(*) from changed
  $$,
  array[0::bigint],
  'User A cannot update profile B'
);

select extensions.throws_ok(
  $$
    update public.profiles
    set timezone = 'UTC'
    where id = '11111111-1111-4111-8111-111111111111'::uuid
  $$,
  '42501',
  'permission denied for table profiles',
  'authenticated cannot update a non-editable profile column'
);

reset role;
set local role anon;

select extensions.throws_ok(
  'select count(*) from public.profiles',
  '42501',
  'permission denied for table profiles',
  'anonymous cannot select profiles'
);

select extensions.throws_ok(
  $$
    update public.profiles
    set display_name = 'Anonymous change'
    where id = '11111111-1111-4111-8111-111111111111'::uuid
  $$,
  '42501',
  'permission denied for table profiles',
  'anonymous cannot update profiles'
);

reset role;

select * from extensions.finish();
rollback;

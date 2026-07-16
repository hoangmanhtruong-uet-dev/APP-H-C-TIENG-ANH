begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(44);

select extensions.has_table(
  'public',
  'learner_profiles',
  'learner_profiles table exists'
);

select extensions.col_is_pk(
  'public',
  'learner_profiles',
  'user_id',
  'learner_profiles.user_id is the primary key'
);

select extensions.col_is_fk(
  'public',
  'learner_profiles',
  'user_id',
  'learner_profiles.user_id references profiles'
);

select extensions.ok(
  (
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.learner_profiles'::regclass
  ),
  'RLS is enabled on learner_profiles'
);

select extensions.policies_are(
  'public',
  'learner_profiles',
  array[
    'Authenticated users can create their own learner profile',
    'Authenticated users can read their own learner profile',
    'Authenticated users can update their own learner profile'
  ],
  'learner_profiles exposes only the three ownership policies'
);

select extensions.has_trigger(
  'public',
  'learner_profiles',
  'set_learner_profiles_updated_at',
  'learner profile updated_at trigger exists'
);

select extensions.has_trigger(
  'public',
  'learner_profiles',
  'validate_learner_profiles_exam_date',
  'learner exam date validation trigger exists'
);

select extensions.is_definer(
  'public',
  'validate_learner_exam_date',
  array[]::text[],
  'exam date validator is security definer'
);

select extensions.is_definer(
  'public',
  'complete_learner_onboarding',
  array[]::text[],
  'completion RPC is security definer'
);

select extensions.ok(
  has_table_privilege('authenticated', 'public.learner_profiles', 'select'),
  'authenticated can select learner profiles through RLS'
);

select extensions.ok(
  has_column_privilege(
    'authenticated',
    'public.learner_profiles',
    'user_id',
    'insert'
  ),
  'authenticated can insert an owned learner profile'
);

select extensions.ok(
  has_column_privilege(
    'authenticated',
    'public.learner_profiles',
    'test_type',
    'update'
  ),
  'authenticated can update an editable preference'
);

select extensions.ok(
  not has_column_privilege(
    'authenticated',
    'public.learner_profiles',
    'onboarding_completed_at',
    'update'
  ),
  'authenticated cannot directly update completion time'
);

select extensions.ok(
  not has_table_privilege('authenticated', 'public.learner_profiles', 'delete'),
  'authenticated cannot delete learner profiles'
);

select extensions.ok(
  not has_table_privilege('anon', 'public.learner_profiles', 'select')
  and not has_table_privilege('anon', 'public.learner_profiles', 'insert')
  and not has_table_privilege('anon', 'public.learner_profiles', 'update')
  and not has_table_privilege('anon', 'public.learner_profiles', 'delete'),
  'anonymous has no learner profile table grants'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.complete_learner_onboarding()',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.complete_learner_onboarding()',
    'execute'
  ),
  'only authenticated can execute the completion RPC'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '41111111-1111-4111-8111-111111111111',
    'phase3-user-a@example.test',
    '{"display_name":"Learner A"}'::jsonb
  ),
  (
    '42222222-2222-4222-8222-222222222222',
    'phase3-user-b@example.test',
    '{"display_name":"Learner B"}'::jsonb
  );

set local role authenticated;
set local request.jwt.claim.sub = '41111111-1111-4111-8111-111111111111';

select extensions.lives_ok(
  $$
    insert into public.learner_profiles (
      user_id,
      test_type,
      onboarding_step
    )
    values (
      '41111111-1111-4111-8111-111111111111'::uuid,
      'academic',
      3
    )
  $$,
  'User A can create their own partial learner profile'
);

select extensions.throws_ok(
  $$
    insert into public.learner_profiles (user_id, test_type)
    values (
      '41111111-1111-4111-8111-111111111111'::uuid,
      'academic'
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "learner_profiles_pkey"',
  'one-to-one primary key prevents a duplicate learner profile'
);

select extensions.throws_ok(
  $$
    insert into public.learner_profiles (user_id, test_type)
    values (
      '42222222-2222-4222-8222-222222222222'::uuid,
      'academic'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "learner_profiles"',
  'User A cannot create a learner profile for User B'
);

reset role;

insert into public.learner_profiles (user_id, test_type, onboarding_step)
values (
  '42222222-2222-4222-8222-222222222222'::uuid,
  'general_training',
  2
);

update public.learner_profiles
set updated_at = '2020-01-01 00:00:00+00'
where user_id = '41111111-1111-4111-8111-111111111111'::uuid;

set local role authenticated;
set local request.jwt.claim.sub = '41111111-1111-4111-8111-111111111111';

select extensions.results_eq(
  'select count(*) from public.learner_profiles',
  array[1::bigint],
  'User A reads only their own learner profile'
);

select extensions.results_eq(
  $$
    with changed as (
      update public.learner_profiles
      set current_band = 5.5
      where user_id = '41111111-1111-4111-8111-111111111111'::uuid
      returning 1
    )
    select count(*) from changed
  $$,
  array[1::bigint],
  'User A can update their own learner profile'
);

select extensions.ok(
  (
    select updated_at > '2020-01-01 00:00:00+00'::timestamptz
    from public.learner_profiles
    where user_id = '41111111-1111-4111-8111-111111111111'::uuid
  ),
  'learner profile update advances updated_at'
);

select extensions.results_eq(
  $$
    with changed as (
      update public.learner_profiles
      set current_band = 6.0
      where user_id = '42222222-2222-4222-8222-222222222222'::uuid
      returning 1
    )
    select count(*) from changed
  $$,
  array[0::bigint],
  'User A cannot update User B learner profile'
);

select extensions.throws_ok(
  $$
    update public.learner_profiles
    set test_type = 'unsupported'
    where user_id = '41111111-1111-4111-8111-111111111111'::uuid
  $$,
  '23514',
  'new row for relation "learner_profiles" violates check constraint "learner_profiles_test_type_check"',
  'unsupported test type is rejected'
);

select extensions.throws_ok(
  $$
    update public.learner_profiles
    set current_band = 5.3
    where user_id = '41111111-1111-4111-8111-111111111111'::uuid
  $$,
  '23514',
  'new row for relation "learner_profiles" violates check constraint "learner_profiles_current_band_check"',
  'non-half current band is rejected'
);

select extensions.throws_ok(
  $$
    update public.learner_profiles
    set target_band = 9.5
    where user_id = '41111111-1111-4111-8111-111111111111'::uuid
  $$,
  '23514',
  'new row for relation "learner_profiles" violates check constraint "learner_profiles_target_band_check"',
  'out-of-range target band is rejected'
);

select extensions.throws_ok(
  $$
    update public.learner_profiles
    set daily_study_minutes = 20
    where user_id = '41111111-1111-4111-8111-111111111111'::uuid
  $$,
  '23514',
  'new row for relation "learner_profiles" violates check constraint "learner_profiles_daily_study_minutes_check"',
  'unsupported daily study duration is rejected'
);

select extensions.throws_ok(
  $$
    update public.learner_profiles
    set study_days_per_week = 0
    where user_id = '41111111-1111-4111-8111-111111111111'::uuid
  $$,
  '23514',
  'new row for relation "learner_profiles" violates check constraint "learner_profiles_study_days_per_week_check"',
  'out-of-range study days are rejected'
);

select extensions.throws_ok(
  $$
    update public.learner_profiles
    set study_days_per_week = 8
    where user_id = '41111111-1111-4111-8111-111111111111'::uuid
  $$,
  '23514',
  'new row for relation "learner_profiles" violates check constraint "learner_profiles_study_days_per_week_check"',
  'study days above seven are rejected'
);

select extensions.throws_ok(
  $$
    update public.learner_profiles
    set priority_skills = array['grammar']::text[]
    where user_id = '41111111-1111-4111-8111-111111111111'::uuid
  $$,
  '23514',
  'new row for relation "learner_profiles" violates check constraint "learner_profiles_priority_skills_allowed_values_check"',
  'unsupported priority skill is rejected'
);

select extensions.throws_ok(
  $$
    update public.learner_profiles
    set priority_skills = array['reading', 'reading']::text[]
    where user_id = '41111111-1111-4111-8111-111111111111'::uuid
  $$,
  '23514',
  'new row for relation "learner_profiles" violates check constraint "learner_profiles_priority_skills_unique_check"',
  'duplicate priority skills are rejected'
);

select extensions.throws_ok(
  $$
    update public.learner_profiles
    set target_exam_date = current_date - 1
    where user_id = '41111111-1111-4111-8111-111111111111'::uuid
  $$,
  '23514',
  'target_exam_date must not be in the past',
  'past exam date is rejected in the learner timezone'
);

select extensions.throws_ok(
  'select public.complete_learner_onboarding()',
  '23514',
  'learner profile is incomplete',
  'incomplete onboarding cannot be completed'
);

select extensions.lives_ok(
  $$
    update public.learner_profiles
    set
      target_band = 7.0,
      target_exam_date = current_date + 30,
      daily_study_minutes = 45,
      study_days_per_week = 5,
      priority_skills = array['writing', 'speaking']::text[],
      primary_goal = 'study_abroad',
      onboarding_step = 8
    where user_id = '41111111-1111-4111-8111-111111111111'::uuid
  $$,
  'User A can save all required onboarding preferences'
);

select extensions.results_eq(
  $$
    select (public.complete_learner_onboarding()).onboarding_step
  $$,
  array[8::smallint],
  'completion RPC completes the authenticated learner profile'
);

select extensions.ok(
  (
    select onboarding_completed_at is not null
    from public.learner_profiles
    where user_id = '41111111-1111-4111-8111-111111111111'::uuid
  ),
  'completion RPC sets the completion timestamp'
);

select extensions.results_eq(
  $$
    with first_completion as (
      select onboarding_completed_at
      from public.learner_profiles
      where user_id = '41111111-1111-4111-8111-111111111111'::uuid
    ), second_completion as (
      select (public.complete_learner_onboarding()).onboarding_completed_at
    )
    select second_completion.onboarding_completed_at =
      first_completion.onboarding_completed_at
    from first_completion, second_completion
  $$,
  array[true],
  'completion RPC is idempotent and preserves its first timestamp'
);

select extensions.throws_ok(
  $$
    update public.learner_profiles
    set onboarding_completed_at = null
    where user_id = '41111111-1111-4111-8111-111111111111'::uuid
  $$,
  '42501',
  'permission denied for table learner_profiles',
  'authenticated cannot clear completion directly'
);

select extensions.throws_ok(
  $$
    delete from public.learner_profiles
    where user_id = '41111111-1111-4111-8111-111111111111'::uuid
  $$,
  '42501',
  'permission denied for table learner_profiles',
  'authenticated cannot delete their learner profile'
);

reset role;
set local role anon;

select extensions.throws_ok(
  'select count(*) from public.learner_profiles',
  '42501',
  'permission denied for table learner_profiles',
  'anonymous cannot select learner profiles'
);

select extensions.throws_ok(
  $$
    insert into public.learner_profiles (user_id)
    values ('41111111-1111-4111-8111-111111111111'::uuid)
  $$,
  '42501',
  'permission denied for table learner_profiles',
  'anonymous cannot insert learner profiles'
);

select extensions.throws_ok(
  $$
    update public.learner_profiles
    set current_band = 6.0
    where user_id = '41111111-1111-4111-8111-111111111111'::uuid
  $$,
  '42501',
  'permission denied for table learner_profiles',
  'anonymous cannot update learner profiles'
);

select extensions.throws_ok(
  $$
    delete from public.learner_profiles
    where user_id = '41111111-1111-4111-8111-111111111111'::uuid
  $$,
  '42501',
  'permission denied for table learner_profiles',
  'anonymous cannot delete learner profiles'
);

select extensions.throws_ok(
  'select public.complete_learner_onboarding()',
  '42501',
  'permission denied for function complete_learner_onboarding',
  'anonymous cannot execute the completion RPC'
);

reset role;

select * from extensions.finish();
rollback;

begin;

create function pg_temp.throws_state(command text, expected_state text)
returns boolean
language plpgsql
as $$
begin
  execute command;
  return false;
exception when others then
  return sqlstate = expected_state;
end;
$$;

select '1..34';
select case when to_regclass('public.reading_passages') is not null then 'ok 1 - reading passage schema exists' else 'not ok 1 - reading passage schema missing' end;
select case when to_regclass('public.reading_question_groups') is not null then 'ok 2 - reading group schema exists' else 'not ok 2 - reading group schema missing' end;
select case when exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'learner_attempts' and column_name = 'expires_at'
) then 'ok 3 - server timer column exists' else 'not ok 3 - server timer column missing' end;
select case when (
  select bool_and(relrowsecurity)
  from pg_catalog.pg_class
  where oid in (
    'public.reading_passages'::regclass,
    'public.reading_passage_versions'::regclass,
    'public.reading_passage_sections'::regclass,
    'public.reading_practice_versions'::regclass,
    'public.reading_question_groups'::regclass
  )
) then 'ok 4 - Reading RLS enabled' else 'not ok 4 - Reading RLS disabled' end;
select case when (select count(*) from public.reading_passage_versions where status = 'published') = 1 then 'ok 5 - published passage seed exists' else 'not ok 5 - published passage seed mismatch' end;
select case when (select count(*) from public.reading_passage_versions where status = 'draft') = 1 then 'ok 6 - draft passage fixture exists' else 'not ok 6 - draft passage fixture mismatch' end;
select case when (select count(*) from public.reading_passage_sections where reading_passage_version_id = '66000000-0000-4000-8000-000000000002') = 4 then 'ok 7 - passage sections exist' else 'not ok 7 - passage section mismatch' end;
select case when (select count(*) from public.reading_question_groups where exercise_set_version_id = '66000000-0000-4000-8000-000000000101') = 4 then 'ok 8 - question groups exist' else 'not ok 8 - question group mismatch' end;
select case when (select count(*) from public.exercise_questions where exercise_set_version_id = '66000000-0000-4000-8000-000000000101') = 10 then 'ok 9 - Reading questions exist' else 'not ok 9 - Reading question mismatch' end;
select case when not has_table_privilege('authenticated', 'private.exercise_answer_keys', 'select') then 'ok 10 - answer keys hidden' else 'not ok 10 - answer keys exposed' end;
select case when has_table_privilege('authenticated', 'public.reading_passages', 'select') and not has_table_privilege('authenticated', 'public.reading_passages', 'update') then 'ok 11 - Reading content is read-only' else 'not ok 11 - Reading content grant mismatch' end;
select case when (select prosecdef from pg_catalog.pg_proc where oid = 'public.get_reading_attempt_clock(uuid)'::regprocedure) then 'ok 12 - clock RPC hardened' else 'not ok 12 - clock RPC not hardened' end;
select case when (select prosecdef from pg_catalog.pg_proc where oid = 'public.submit_exercise_attempt(uuid)'::regprocedure) then 'ok 13 - submit RPC hardened' else 'not ok 13 - submit RPC not hardened' end;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('76111111-1111-4111-8111-111111111111', 'phase6-remote-a@example.test', '{"display_name":"Remote Phase 6 A"}'::jsonb),
  ('76222222-2222-4222-8222-222222222222', 'phase6-remote-b@example.test', '{"display_name":"Remote Phase 6 B"}'::jsonb),
  ('76333333-3333-4333-8333-333333333333', 'phase6-remote-gt@example.test', '{"display_name":"Remote Phase 6 GT"}'::jsonb);

insert into public.learner_profiles (
  user_id, test_type, current_band, target_band, daily_study_minutes,
  study_days_per_week, priority_skills, primary_goal, onboarding_step,
  onboarding_completed_at
) values
  ('76111111-1111-4111-8111-111111111111', 'academic', 5.0, 7.0, 45, 5, array['reading']::text[], 'study_abroad', 8, now()),
  ('76222222-2222-4222-8222-222222222222', 'academic', 5.0, 6.5, 30, 4, array['reading']::text[], 'work', 8, now()),
  ('76333333-3333-4333-8333-333333333333', 'general_training', 5.0, 6.5, 30, 4, array['reading']::text[], 'work', 8, now());

set local role authenticated;
set local request.jwt.claim.sub = '76111111-1111-4111-8111-111111111111';
select case when (select count(*) from public.reading_passages) = 1 then 'ok 14 - published passage visible' else 'not ok 14 - published passage visibility mismatch' end;
select case when (select count(*) from public.reading_passage_versions where status = 'draft') = 0 then 'ok 15 - draft passage hidden' else 'not ok 15 - draft passage leaked' end;
select case when (select count(*) from public.exercise_sets where domain = 'reading') = 1 then 'ok 16 - published Reading set visible' else 'not ok 16 - Reading set visibility mismatch' end;
select case when pg_temp.throws_state('select count(*) from private.exercise_answer_keys', '42501') then 'ok 17 - direct answer read denied' else 'not ok 17 - direct answer read allowed' end;

select public.start_exercise_attempt('academic-reading-cool-roofs', 'phase6-remote-a-1');
select case when (select count(*) from public.learner_attempts where start_idempotency_key = 'phase6-remote-a-1') = 1 then 'ok 18 - Reading start persists one attempt' else 'not ok 18 - Reading start failed' end;
select public.start_exercise_attempt('academic-reading-cool-roofs', 'phase6-remote-a-1');
select case when (select count(*) from public.learner_attempts where start_idempotency_key = 'phase6-remote-a-1') = 1 then 'ok 19 - Reading start is idempotent' else 'not ok 19 - Reading start duplicated' end;
select case when (
  select reading_time_limit_seconds = 1200 and expires_at = started_at + interval '1200 seconds'
  from public.learner_attempts where start_idempotency_key = 'phase6-remote-a-1'
) then 'ok 20 - timer is database-derived' else 'not ok 20 - timer derivation mismatch' end;
select case when pg_temp.throws_state(
  format('select public.get_exercise_attempt_result(%L::uuid)', (select id from public.learner_attempts where start_idempotency_key = 'phase6-remote-a-1')),
  '55000'
) then 'ok 21 - result hidden before submit' else 'not ok 21 - result leaked before submit' end;

select public.save_exercise_answer(
  (select id from public.learner_attempts where start_idempotency_key = 'phase6-remote-a-1'),
  '66000000-0000-4000-8000-000000000201',
  array['66000000-0000-4000-8000-000000000302'::uuid], null, 1
);
select case when (select count(*) from public.learner_answers) = 1 then 'ok 22 - option answer persists' else 'not ok 22 - option answer missing' end;
select public.save_exercise_answer(
  (select id from public.learner_attempts where start_idempotency_key = 'phase6-remote-a-1'),
  '66000000-0000-4000-8000-000000000209',
  '{}'::uuid[], ' SURFACE   TEMPERATURE ', 1
);
select case when (select count(*) from public.learner_answers) = 2 then 'ok 23 - normalized text answer persists' else 'not ok 23 - text answer missing' end;
select case when pg_temp.throws_state(
  format(
    'select public.save_exercise_answer(%L::uuid, %L::uuid, %L::uuid[], %L, 1)',
    (select id from public.learner_attempts where start_idempotency_key = 'phase6-remote-a-1'),
    '66000000-0000-4000-8000-000000000209',
    '{}',
    'maintenance'
  ),
  '40001'
) then 'ok 24 - stale answer rejected' else 'not ok 24 - stale answer accepted' end;
select case when pg_temp.throws_state(
  format(
    'select public.save_exercise_answer(%L::uuid, %L::uuid, %L::uuid[], %L, 1)',
    (select id from public.learner_attempts where start_idempotency_key = 'phase6-remote-a-1'),
    '66000000-0000-4000-8000-000000000210',
    '{}',
    'regular roof maintenance'
  ),
  '22023'
) then 'ok 25 - authored word limit enforced' else 'not ok 25 - word limit bypassed' end;

select public.submit_exercise_attempt(
  (select id from public.learner_attempts where start_idempotency_key = 'phase6-remote-a-1')
);
select case when (
  select score = 2 and max_score = 10 and status = 'scored'
  from public.learner_attempts where start_idempotency_key = 'phase6-remote-a-1'
) then 'ok 26 - database Reading scoring persists' else 'not ok 26 - database Reading score mismatch' end;
select public.submit_exercise_attempt(
  (select id from public.learner_attempts where start_idempotency_key = 'phase6-remote-a-1')
);
select case when (select count(*) from public.learner_attempts where start_idempotency_key = 'phase6-remote-a-1') = 1 then 'ok 27 - submit is idempotent' else 'not ok 27 - submit duplicated state' end;
select case when jsonb_array_length(public.get_exercise_attempt_result(
  (select id from public.learner_attempts where start_idempotency_key = 'phase6-remote-a-1')
) -> 'questions') = 10 then 'ok 28 - post-submit Reading review available' else 'not ok 28 - Reading review missing' end;
select case when pg_temp.throws_state(
  format(
    'select public.save_exercise_answer(%L::uuid, %L::uuid, array[%L::uuid], null, 2)',
    (select id from public.learner_attempts where start_idempotency_key = 'phase6-remote-a-1'),
    '66000000-0000-4000-8000-000000000201',
    '66000000-0000-4000-8000-000000000301'
  ),
  '55000'
) then 'ok 29 - submitted answer immutable' else 'not ok 29 - submitted answer changed' end;

set local request.jwt.claim.sub = '76222222-2222-4222-8222-222222222222';
select case when (select count(*) from public.learner_attempts) = 0 then 'ok 30 - user B cannot read user A attempt' else 'not ok 30 - cross-user attempt leaked' end;
select case when pg_temp.throws_state(
  format('select public.get_exercise_attempt_result(%L::uuid)', (select id from public.learner_attempts where start_idempotency_key = 'phase6-remote-a-1')),
  'P0002'
) then 'ok 31 - user B cannot read user A result' else 'not ok 31 - cross-user result leaked' end;

set local request.jwt.claim.sub = '76333333-3333-4333-8333-333333333333';
select case when (select count(*) from public.reading_passages) = 0 then 'ok 32 - GT learner cannot read Academic passage' else 'not ok 32 - test-type passage leaked' end;
select case when pg_temp.throws_state(
  $$select public.start_exercise_attempt('academic-reading-cool-roofs', 'phase6-remote-gt-1')$$,
  'P0002'
) then 'ok 33 - GT learner cannot start Academic set' else 'not ok 33 - GT learner started Academic set' end;

reset role;
set local role anon;
select case when pg_temp.throws_state('select count(*) from public.reading_passages', '42501') then 'ok 34 - anonymous Reading read denied' else 'not ok 34 - anonymous Reading read allowed' end;

reset role;
rollback;

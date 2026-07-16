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

select '1..24';
select case when to_regclass('public.exercise_sets') is not null then 'ok 1 - exercise schema exists' else 'not ok 1 - exercise schema missing' end;
select case when to_regclass('public.learner_attempts') is not null then 'ok 2 - attempt schema exists' else 'not ok 2 - attempt schema missing' end;
select case when to_regclass('public.vocabulary_entry_versions') is not null then 'ok 3 - vocabulary schema exists' else 'not ok 3 - vocabulary schema missing' end;
select case when to_regclass('public.grammar_topic_versions') is not null then 'ok 4 - grammar schema exists' else 'not ok 4 - grammar schema missing' end;
select case when (
  select bool_and(relrowsecurity) from pg_catalog.pg_class where oid in (
    'public.exercise_sets'::regclass,
    'public.exercise_set_versions'::regclass,
    'public.exercise_questions'::regclass,
    'public.learner_attempts'::regclass,
    'public.learner_answers'::regclass
  )
) then 'ok 5 - RLS enabled' else 'not ok 5 - RLS disabled' end;
select case when (select count(*) from public.exercise_set_versions where status = 'published') = 2 then 'ok 6 - published seed exists' else 'not ok 6 - published seed mismatch' end;
select case when (select count(*) from public.exercise_set_versions where status = 'draft') = 1 then 'ok 7 - draft fixture exists' else 'not ok 7 - draft fixture mismatch' end;
select case when (select count(*) from public.vocabulary_entry_versions where status = 'published') = 8 then 'ok 8 - vocabulary seed exists' else 'not ok 8 - vocabulary seed mismatch' end;
select case when (select count(*) from public.grammar_topic_versions where status = 'published') = 3 then 'ok 9 - grammar seed exists' else 'not ok 9 - grammar seed mismatch' end;
select case when not has_table_privilege('authenticated', 'private.exercise_answer_keys', 'select') then 'ok 10 - answer keys hidden' else 'not ok 10 - answer keys exposed' end;
select case when not has_table_privilege('authenticated', 'public.learner_attempts', 'update') then 'ok 11 - attempt writes are RPC-only' else 'not ok 11 - direct attempt update exposed' end;
select case when (
  select prosecdef from pg_catalog.pg_proc
  where oid = 'public.submit_exercise_attempt(uuid)'::regprocedure
) then 'ok 12 - submit RPC is security definer' else 'not ok 12 - submit RPC is not hardened' end;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('71111111-1111-4111-8111-111111111111', 'phase5-remote-a@example.test', '{"display_name":"Remote Phase 5 A"}'::jsonb),
  ('72222222-2222-4222-8222-222222222222', 'phase5-remote-b@example.test', '{"display_name":"Remote Phase 5 B"}'::jsonb);
insert into public.learner_profiles (
  user_id, test_type, current_band, target_band, daily_study_minutes,
  study_days_per_week, priority_skills, primary_goal, onboarding_step,
  onboarding_completed_at
) values
  ('71111111-1111-4111-8111-111111111111', 'academic', 5.0, 7.0, 45, 5, array['reading']::text[], 'study_abroad', 8, now()),
  ('72222222-2222-4222-8222-222222222222', 'academic', 5.0, 6.5, 30, 4, array['writing']::text[], 'work', 8, now());

set local role authenticated;
set local request.jwt.claim.sub = '71111111-1111-4111-8111-111111111111';
select case when (select count(*) from public.exercise_sets) = 2 then 'ok 13 - published sets visible' else 'not ok 13 - published set visibility mismatch' end;
select case when (select count(*) from public.exercise_set_versions where status = 'draft') = 0 then 'ok 14 - draft hidden' else 'not ok 14 - draft leaked' end;
select case when pg_temp.throws_state('select count(*) from private.exercise_answer_keys', '42501') then 'ok 15 - direct answer-key read denied' else 'not ok 15 - direct answer-key read allowed' end;
select public.start_exercise_attempt('academic-vocabulary-foundations', 'phase5-remote-a-1');
select case when (select count(*) from public.learner_attempts where start_idempotency_key = 'phase5-remote-a-1') = 1 then 'ok 16 - start persists one attempt' else 'not ok 16 - start persistence failed' end;
select public.start_exercise_attempt('academic-vocabulary-foundations', 'phase5-remote-a-1');
select case when (select count(*) from public.learner_attempts where start_idempotency_key = 'phase5-remote-a-1') = 1 then 'ok 17 - start is idempotent' else 'not ok 17 - duplicate start created' end;
select public.save_exercise_answer(
  (select id from public.learner_attempts where start_idempotency_key = 'phase5-remote-a-1'),
  '32000000-0000-4000-8000-000000000001'::uuid,
  array['33000000-0000-4000-8000-000000000001'::uuid], '', 1
);
select public.save_exercise_answer(
  (select id from public.learner_attempts where start_idempotency_key = 'phase5-remote-a-1'),
  '32000000-0000-4000-8000-000000000004'::uuid,
  '{}'::uuid[], ' MITIGATE ', 1
);
select case when (select count(*) from public.learner_answers) = 2 then 'ok 18 - choice and text drafts persist' else 'not ok 18 - draft answers missing' end;
select case when pg_temp.throws_state(
  format(
    'select public.save_exercise_answer(%L::uuid, %L::uuid, array[%L::uuid], %L, 1)',
    (select id from public.learner_attempts where start_idempotency_key = 'phase5-remote-a-1'),
    '32000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000018',
    ''
  ),
  '22023'
) then 'ok 19 - invalid option rejected' else 'not ok 19 - invalid option accepted' end;
select public.submit_exercise_attempt(
  (select id from public.learner_attempts where start_idempotency_key = 'phase5-remote-a-1')
);
select case when (select score = 2 and max_score = 5 and status = 'scored' from public.learner_attempts where start_idempotency_key = 'phase5-remote-a-1') then 'ok 20 - database scoring persists' else 'not ok 20 - database score mismatch' end;
select public.submit_exercise_attempt(
  (select id from public.learner_attempts where start_idempotency_key = 'phase5-remote-a-1')
);
select case when (select count(*) from public.learner_attempts where start_idempotency_key = 'phase5-remote-a-1') = 1 then 'ok 21 - submit is idempotent' else 'not ok 21 - submit duplicated state' end;
select case when jsonb_array_length(public.get_exercise_attempt_result(
  (select id from public.learner_attempts where start_idempotency_key = 'phase5-remote-a-1')
) -> 'questions') = 4 then 'ok 22 - post-submit review available' else 'not ok 22 - result review missing' end;

set local request.jwt.claim.sub = '72222222-2222-4222-8222-222222222222';
select case when (select count(*) from public.learner_attempts) = 0 then 'ok 23 - user B cannot read user A attempt' else 'not ok 23 - cross-user attempt leaked' end;
select case when pg_temp.throws_state(
  format(
    'select public.get_exercise_attempt_result(%L::uuid)',
    (select id from public.learner_attempts where start_idempotency_key = 'phase5-remote-a-1')
  ),
  'P0002'
) then 'ok 24 - user B cannot read user A result' else 'not ok 24 - cross-user result leaked' end;

reset role;
rollback;

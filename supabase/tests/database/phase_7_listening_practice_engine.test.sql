begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

select extensions.has_table('public', 'listening_audio_assets', 'Listening audio assets exist');
select extensions.has_table('public', 'listening_practice_versions', 'Listening practice mappings exist');
select extensions.has_table('public', 'listening_parts', 'Listening parts exist');
select extensions.has_table('private', 'listening_transcripts', 'private Listening transcripts exist');
select extensions.ok(
  (select bool_and(relrowsecurity) from pg_catalog.pg_class where oid in (
    'public.listening_audio_assets'::regclass,
    'public.listening_practice_versions'::regclass,
    'public.listening_parts'::regclass
  )),
  'RLS is enabled on every public Listening content table'
);
select extensions.policies_are('public', 'listening_audio_assets', array['Learners can read accessible listening audio metadata'], 'audio metadata has one access policy');
select extensions.policies_are('public', 'listening_practice_versions', array['Learners can read accessible listening practice versions'], 'Listening mapping has one access policy');
select extensions.policies_are('public', 'listening_parts', array['Learners can read accessible listening parts'], 'Listening parts have one access policy');
select extensions.is_definer('public', 'get_listening_attempt_clock', array['uuid'], 'Listening clock RPC is security definer');
select extensions.is_definer('public', 'get_listening_attempt_result', array['uuid'], 'Listening result RPC is security definer');
select extensions.ok(
  has_table_privilege('authenticated', 'public.listening_audio_assets', 'select')
  and not has_table_privilege('authenticated', 'public.listening_audio_assets', 'insert')
  and not has_table_privilege('authenticated', 'public.listening_audio_assets', 'update')
  and not has_table_privilege('authenticated', 'public.listening_audio_assets', 'delete'),
  'authenticated receives read-only Listening metadata grants'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'private.listening_transcripts', 'select')
  and not has_table_privilege('authenticated', 'private.exercise_answer_keys', 'select'),
  'transcripts and answer keys have no learner table grants'
);
select extensions.results_eq(
  $$select count(*)::integer from public.exercise_sets where domain = 'listening'$$,
  array[2],
  'seed has one published and one draft Listening identity'
);
select extensions.results_eq(
  $$select count(*)::integer from public.exercise_questions where exercise_set_version_id = '77000000-0000-4000-8000-000000000101'::uuid$$,
  array[8],
  'published Listening set has eight original questions'
);
select extensions.results_eq(
  $$select count(distinct question_type)::integer from public.exercise_questions where exercise_set_version_id = '77000000-0000-4000-8000-000000000101'::uuid$$,
  array[3],
  'published Listening set uses three supported question types'
);
select extensions.ok(
  (select duration_seconds = 108
      and sha256 = 'c1ddac5f8cf92cb9e869f6ae4a93fcf04a08cce5d3df0a61b9caf0269097d0a5'
      and licence like 'Original project-authored%'
   from public.listening_audio_assets where id = '77000000-0000-4000-8000-000000000001'),
  'published audio has duration, checksum and original provenance'
);
select extensions.throws_ok(
  $$update public.listening_audio_assets set duration_seconds = 109 where id = '77000000-0000-4000-8000-000000000001'$$,
  '55000', 'published listening content is immutable',
  'published audio snapshot cannot be edited'
);
select extensions.throws_ok(
  $$update private.listening_transcripts set transcript_markdown = 'Changed' where audio_asset_id = '77000000-0000-4000-8000-000000000001'$$,
  '55000', 'published listening content is immutable',
  'published transcript snapshot cannot be edited'
);

insert into auth.users (id, email, raw_user_meta_data) values
  ('77111111-1111-4111-8111-111111111111', 'phase7-user-a@example.test', '{"display_name":"Phase 7 Learner A"}'::jsonb),
  ('77222222-2222-4222-8222-222222222222', 'phase7-user-b@example.test', '{"display_name":"Phase 7 Learner B"}'::jsonb),
  ('77333333-3333-4333-8333-333333333333', 'phase7-user-gt@example.test', '{"display_name":"Phase 7 GT Learner"}'::jsonb);

insert into public.learner_profiles (
  user_id, test_type, current_band, target_band, daily_study_minutes,
  study_days_per_week, priority_skills, primary_goal, onboarding_step, onboarding_completed_at
) values
  ('77111111-1111-4111-8111-111111111111', 'academic', 5.0, 7.0, 45, 5, array['listening']::text[], 'study_abroad', 8, now()),
  ('77222222-2222-4222-8222-222222222222', 'academic', 5.5, 7.0, 30, 4, array['listening']::text[], 'work', 8, now()),
  ('77333333-3333-4333-8333-333333333333', 'general_training', 5.0, 6.5, 30, 4, array['listening']::text[], 'work', 8, now());

set local role authenticated;
set local request.jwt.claim.sub = '77111111-1111-4111-8111-111111111111';

select extensions.results_eq($$select count(*)::integer from public.exercise_sets where domain = 'listening'$$, array[1], 'Academic learner sees only published Listening set');
select extensions.results_eq($$select count(*)::integer from public.listening_audio_assets$$, array[1], 'Academic learner sees only published audio metadata');
select extensions.results_eq($$select count(*)::integer from public.listening_parts$$, array[2], 'Academic learner sees two published Listening parts');
select extensions.throws_ok('select count(*) from private.listening_transcripts', '42501', 'permission denied for table listening_transcripts', 'learner cannot select transcripts directly');
select extensions.throws_ok('select count(*) from private.exercise_answer_keys', '42501', 'permission denied for table exercise_answer_keys', 'learner cannot select answer keys directly');

select extensions.lives_ok($$select public.start_exercise_attempt('academic-listening-community-library', 'phase7-a-listening-1')$$, 'learner starts published Listening set');
select extensions.lives_ok($$select public.start_exercise_attempt('academic-listening-community-library', 'phase7-a-listening-1')$$, 'Listening start replays idempotently');
select extensions.results_eq($$select count(*)::integer from public.learner_attempts where start_idempotency_key = 'phase7-a-listening-1'$$, array[1], 'idempotent start creates one attempt');
select extensions.ok(
  (select time_limit_seconds = 600 and reading_time_limit_seconds is null
      and expires_at = started_at + interval '600 seconds'
   from public.learner_attempts where start_idempotency_key = 'phase7-a-listening-1'),
  'Listening timer is database-derived and does not misuse Reading legacy field'
);
select extensions.ok(
  (select expires_at is not null and server_now is not null
   from public.get_listening_attempt_clock((select id from public.learner_attempts where start_idempotency_key = 'phase7-a-listening-1'))),
  'owner clock RPC returns database timestamps'
);
select extensions.throws_ok(
  $$select public.get_listening_attempt_result((select id from public.learner_attempts where start_idempotency_key = 'phase7-a-listening-1'))$$,
  '55000', 'result is not available before submit',
  'transcript and review remain locked before submit'
);
select extensions.lives_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase7-a-listening-1'), '77000000-0000-4000-8000-000000000201', array['77000000-0000-4000-8000-000000000302'::uuid], null, 1)$$,
  'single-choice Listening answer saves'
);
select extensions.lives_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase7-a-listening-1'), '77000000-0000-4000-8000-000000000202', array['77000000-0000-4000-8000-000000000305'::uuid, '77000000-0000-4000-8000-000000000304'::uuid], null, 1)$$,
  'multiple-choice Listening answer saves independent of option order'
);
select extensions.lives_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase7-a-listening-1'), '77000000-0000-4000-8000-000000000203', '{}'::uuid[], ' SECOND   FLOOR ', 1)$$,
  'short-text Listening answer saves with normalization input'
);
select extensions.lives_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase7-a-listening-1'), '77000000-0000-4000-8000-000000000203', '{}'::uuid[], ' SECOND   FLOOR ', 1)$$,
  'identical answer revision replays safely'
);
select extensions.throws_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase7-a-listening-1'), '77000000-0000-4000-8000-000000000203', '{}'::uuid[], 'first floor', 1)$$,
  '40001', 'stale or conflicting answer revision',
  'same revision with different payload is rejected'
);
select extensions.throws_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase7-a-listening-1'), '77000000-0000-4000-8000-000000000201', array['77000000-0000-4000-8000-000000000309'::uuid], null, 2)$$,
  '22023', 'invalid selected option',
  'option from another question is rejected'
);

select extensions.lives_ok($$select public.submit_exercise_attempt((select id from public.learner_attempts where start_idempotency_key = 'phase7-a-listening-1'))$$, 'Listening submit scores atomically');
select extensions.results_eq($$select score::integer from public.learner_attempts where start_idempotency_key = 'phase7-a-listening-1'$$, array[3], 'database scores saved Listening answers');
select extensions.results_eq($$select max_score::integer from public.learner_attempts where start_idempotency_key = 'phase7-a-listening-1'$$, array[8], 'database derives Listening max score');
select extensions.lives_ok($$select public.submit_exercise_attempt((select id from public.learner_attempts where start_idempotency_key = 'phase7-a-listening-1'))$$, 'repeated Listening submit returns stored result');
select extensions.ok(
  jsonb_array_length(public.get_listening_attempt_result((select id from public.learner_attempts where start_idempotency_key = 'phase7-a-listening-1')) -> 'questions') = 8
  and length(public.get_listening_attempt_result((select id from public.learner_attempts where start_idempotency_key = 'phase7-a-listening-1')) ->> 'transcriptMarkdown') > 100,
  'post-submit owner review contains questions and transcript'
);
select extensions.throws_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase7-a-listening-1'), '77000000-0000-4000-8000-000000000201', array['77000000-0000-4000-8000-000000000301'::uuid], null, 2)$$,
  '55000', 'submitted attempt is immutable',
  'submitted Listening answer cannot be changed'
);

set local request.jwt.claim.sub = '77222222-2222-4222-8222-222222222222';
select extensions.results_eq($$select count(*)::integer from public.learner_attempts$$, array[0], 'user B cannot read user A attempt');
select extensions.throws_ok(
  $$select public.get_listening_attempt_result('00000000-0000-0000-0000-000000000000'::uuid)$$,
  'P0002', 'listening attempt not found',
  'user B cannot retrieve another result through owner RPC'
);

set local request.jwt.claim.sub = '77333333-3333-4333-8333-333333333333';
select extensions.results_eq($$select count(*)::integer from public.listening_audio_assets$$, array[0], 'GT learner cannot read Academic-only audio metadata');
select extensions.throws_ok(
  $$select public.start_exercise_attempt('academic-listening-community-library', 'phase7-gt-listening-1')$$,
  'P0002', 'exercise not found',
  'GT learner cannot start Academic Listening set'
);

reset role;
set local role anon;
select extensions.throws_ok('select count(*) from public.listening_audio_assets', '42501', 'permission denied for table listening_audio_assets', 'anonymous cannot read Listening metadata');
select extensions.throws_ok(
  $$select public.start_exercise_attempt('academic-listening-community-library', 'phase7-anon-listening')$$,
  '42501', 'permission denied for function start_exercise_attempt',
  'anonymous cannot start Listening attempt'
);

reset role;
select * from extensions.finish();
rollback;

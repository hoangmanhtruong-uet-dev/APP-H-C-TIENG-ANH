begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

select extensions.has_table('public', 'reading_passages', 'reading_passages exists');
select extensions.has_table('public', 'reading_passage_versions', 'reading_passage_versions exists');
select extensions.has_table('public', 'reading_passage_sections', 'reading_passage_sections exists');
select extensions.has_table('public', 'reading_practice_versions', 'reading_practice_versions exists');
select extensions.has_table('public', 'reading_question_groups', 'reading_question_groups exists');

select extensions.ok(
  (select bool_and(relrowsecurity)
   from pg_catalog.pg_class
   where oid in (
     'public.reading_passages'::regclass,
     'public.reading_passage_versions'::regclass,
     'public.reading_passage_sections'::regclass,
     'public.reading_practice_versions'::regclass,
     'public.reading_question_groups'::regclass
   )),
  'RLS is enabled on every Phase 6 content table'
);

select extensions.policies_are(
  'public',
  'reading_passages',
  array['Learners can read accessible reading passages'],
  'reading passage identities expose one published-access policy'
);
select extensions.policies_are(
  'public',
  'reading_passage_versions',
  array['Learners can read accessible reading passage versions'],
  'reading passage versions expose one published-access policy'
);
select extensions.policies_are(
  'public',
  'reading_passage_sections',
  array['Learners can read accessible reading sections'],
  'reading sections expose one published-access policy'
);
select extensions.policies_are(
  'public',
  'reading_practice_versions',
  array['Learners can read accessible reading practice versions'],
  'reading practice mappings expose one published-access policy'
);
select extensions.policies_are(
  'public',
  'reading_question_groups',
  array['Learners can read accessible reading question groups'],
  'reading groups expose one published-access policy'
);

select extensions.is_definer(
  'public', 'get_reading_attempt_clock', array['uuid'],
  'reading clock RPC is security definer'
);
select extensions.is_definer(
  'public', 'start_exercise_attempt', array['text', 'text'],
  'shared start RPC remains security definer'
);
select extensions.is_definer(
  'public', 'save_exercise_answer', array['uuid', 'uuid', 'uuid[]', 'text', 'integer'],
  'shared save RPC remains security definer'
);
select extensions.is_definer(
  'public', 'submit_exercise_attempt', array['uuid'],
  'shared submit RPC remains security definer'
);

select extensions.ok(
  has_table_privilege('authenticated', 'public.reading_passages', 'select')
  and not has_table_privilege('authenticated', 'public.reading_passages', 'insert')
  and not has_table_privilege('authenticated', 'public.reading_passages', 'update')
  and not has_table_privilege('authenticated', 'public.reading_passages', 'delete')
  and has_table_privilege('authenticated', 'public.reading_passage_sections', 'select')
  and not has_table_privilege('authenticated', 'public.reading_passage_sections', 'insert')
  and not has_table_privilege('authenticated', 'public.reading_passage_sections', 'update')
  and not has_table_privilege('authenticated', 'public.reading_passage_sections', 'delete'),
  'authenticated receives read-only Reading content grants'
);
select extensions.ok(
  not has_table_privilege('anon', 'public.reading_passages', 'select')
  and not has_table_privilege('anon', 'public.reading_passage_versions', 'select')
  and not has_table_privilege('anon', 'public.reading_passage_sections', 'select'),
  'anonymous receives no Reading table grants'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'private.exercise_answer_keys', 'select')
  and not has_table_privilege('authenticated', 'private.exercise_correct_options', 'select')
  and not has_table_privilege('authenticated', 'private.exercise_correct_text_answers', 'select'),
  'Reading answer keys remain outside learner grants'
);

select extensions.results_eq(
  $$select count(*)::integer from public.reading_passage_versions where status = 'published'$$,
  array[1],
  'foundation content has one published Reading passage'
);
select extensions.results_eq(
  $$select count(*)::integer from public.reading_passage_versions where status = 'draft'$$,
  array[1],
  'foundation content has one draft Reading fixture'
);
select extensions.results_eq(
  $$select count(*)::integer from public.reading_passage_sections where reading_passage_version_id = '66000000-0000-4000-8000-000000000002'::uuid$$,
  array[4],
  'published Reading passage has four ordered sections'
);
select extensions.results_eq(
  $$select count(*)::integer from public.reading_question_groups where exercise_set_version_id = '66000000-0000-4000-8000-000000000101'::uuid$$,
  array[4],
  'published Reading set has four question groups'
);
select extensions.results_eq(
  $$select count(*)::integer from public.exercise_questions where exercise_set_version_id = '66000000-0000-4000-8000-000000000101'::uuid$$,
  array[10],
  'published Reading set has ten original questions'
);
select extensions.results_eq(
  $$select count(distinct question_type)::integer from public.exercise_questions where exercise_set_version_id = '66000000-0000-4000-8000-000000000101'::uuid$$,
  array[4],
  'published Reading set uses exactly four implemented question types'
);
select extensions.ok(
  (select source_name <> '' and licence = 'Original project-authored content'
   from public.reading_passage_versions
   where id = '66000000-0000-4000-8000-000000000002'::uuid),
  'published Reading content has explicit original-content provenance'
);

select extensions.throws_ok(
  $$update public.reading_passage_versions set title = 'Changed' where id = '66000000-0000-4000-8000-000000000002'::uuid$$,
  '55000', 'published reading passage versions are immutable',
  'published Reading passage version cannot be edited'
);
select extensions.throws_ok(
  $$update public.reading_passage_sections set body_markdown = 'Changed' where id = '66000000-0000-4000-8000-000000000010'::uuid$$,
  '55000', 'published reading content is immutable',
  'published Reading section cannot be edited'
);
select extensions.throws_ok(
  $$update public.reading_question_groups set title = 'Changed' where id = '66000000-0000-4000-8000-000000000110'::uuid$$,
  '55000', 'published reading content is immutable',
  'published Reading question group cannot be edited'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('66111111-1111-4111-8111-111111111111', 'phase6-user-a@example.test', '{"display_name":"Phase 6 Learner A"}'::jsonb),
  ('66222222-2222-4222-8222-222222222222', 'phase6-user-b@example.test', '{"display_name":"Phase 6 Learner B"}'::jsonb),
  ('66333333-3333-4333-8333-333333333333', 'phase6-user-gt@example.test', '{"display_name":"Phase 6 GT Learner"}'::jsonb);

insert into public.learner_profiles (
  user_id, test_type, current_band, target_band, daily_study_minutes,
  study_days_per_week, priority_skills, primary_goal, onboarding_step,
  onboarding_completed_at
) values
  ('66111111-1111-4111-8111-111111111111', 'academic', 5.0, 7.0, 45, 5, array['reading']::text[], 'study_abroad', 8, now()),
  ('66222222-2222-4222-8222-222222222222', 'academic', 5.5, 7.0, 30, 4, array['reading']::text[], 'work', 8, now()),
  ('66333333-3333-4333-8333-333333333333', 'general_training', 5.0, 6.5, 30, 4, array['reading']::text[], 'work', 8, now());

set local role authenticated;
set local request.jwt.claim.sub = '66111111-1111-4111-8111-111111111111';

select extensions.results_eq(
  $$select count(*)::integer from public.reading_passages$$,
  array[1],
  'Academic learner sees only the published Reading passage identity'
);
select extensions.results_eq(
  $$select count(*)::integer from public.reading_passage_versions where status = 'draft'$$,
  array[0],
  'draft Reading passage version is hidden by RLS'
);
select extensions.results_eq(
  $$select count(*)::integer from public.exercise_sets where domain = 'reading'$$,
  array[1],
  'Academic learner sees only the published Reading exercise set'
);
select extensions.throws_ok(
  'select count(*) from private.exercise_answer_keys',
  '42501', 'permission denied for table exercise_answer_keys',
  'learner cannot select hidden Reading answer keys'
);

select extensions.lives_ok(
  $$select public.start_exercise_attempt('academic-reading-cool-roofs', 'phase6-a-reading-1')$$,
  'learner can start a published Reading exercise by stable slug'
);
select extensions.lives_ok(
  $$select public.start_exercise_attempt('academic-reading-cool-roofs', 'phase6-a-reading-1')$$,
  'Reading start is idempotent for the same request key'
);
select extensions.results_eq(
  $$select count(*)::integer from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'$$,
  array[1],
  'idempotent Reading start creates one attempt'
);
select extensions.ok(
  (select reading_time_limit_seconds = 1200
      and expires_at = started_at + interval '1200 seconds'
   from public.learner_attempts
   where start_idempotency_key = 'phase6-a-reading-1'),
  'Reading deadline and duration are derived by the database'
);
select extensions.ok(
  (select expires_at is not null and server_now is not null
   from public.get_reading_attempt_clock(
     (select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1')
   )),
  'owner clock RPC returns database timestamps'
);
select extensions.throws_ok(
  $$select public.get_exercise_attempt_result((select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'))$$,
  '55000', 'result is not available before submit',
  'Reading result and answer key stay locked before submit'
);

select extensions.throws_ok(
  $$select public.save_exercise_answer(
    (select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'),
    '66000000-0000-4000-8000-000000000201'::uuid,
    array['66000000-0000-4000-8000-000000000312'::uuid], null, 1
  )$$,
  '22023', 'invalid selected option',
  'Reading save rejects an option owned by another question'
);

select extensions.lives_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'), '66000000-0000-4000-8000-000000000201', array['66000000-0000-4000-8000-000000000302'::uuid], null, 1)$$,
  'multiple-choice answer saves'
);
select extensions.lives_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'), '66000000-0000-4000-8000-000000000202', array['66000000-0000-4000-8000-000000000306'::uuid, '66000000-0000-4000-8000-000000000305'::uuid], null, 1)$$,
  'multi-answer multiple choice saves independent of option order'
);
select extensions.lives_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'), '66000000-0000-4000-8000-000000000203', array['66000000-0000-4000-8000-000000000310'::uuid], null, 1)$$,
  'false answer saves for true-false-not-given'
);
select extensions.lives_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'), '66000000-0000-4000-8000-000000000204', array['66000000-0000-4000-8000-000000000312'::uuid], null, 1)$$,
  'true answer saves for true-false-not-given'
);
select extensions.lives_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'), '66000000-0000-4000-8000-000000000205', array['66000000-0000-4000-8000-000000000317'::uuid], null, 1)$$,
  'not-given answer saves'
);
select extensions.lives_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'), '66000000-0000-4000-8000-000000000206', array['66000000-0000-4000-8000-000000000318'::uuid], null, 1)$$,
  'first matching-heading answer saves'
);
select extensions.lives_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'), '66000000-0000-4000-8000-000000000207', array['66000000-0000-4000-8000-000000000323'::uuid], null, 1)$$,
  'second matching-heading answer saves'
);
select extensions.lives_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'), '66000000-0000-4000-8000-000000000208', array['66000000-0000-4000-8000-000000000328'::uuid], null, 1)$$,
  'third matching-heading answer saves'
);
select extensions.lives_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'), '66000000-0000-4000-8000-000000000209', '{}'::uuid[], '  SURFACE   TEMPERATURES ', 1)$$,
  'declared summary-completion variant saves with extra whitespace'
);
select extensions.lives_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'), '66000000-0000-4000-8000-000000000210', '{}'::uuid[], 'maintenance', 1)$$,
  'second summary-completion answer saves'
);
select extensions.lives_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'), '66000000-0000-4000-8000-000000000210', '{}'::uuid[], 'maintenance', 1)$$,
  'identical Reading answer revision replays safely'
);
select extensions.throws_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'), '66000000-0000-4000-8000-000000000210', '{}'::uuid[], 'cleaning', 1)$$,
  '40001', 'stale or conflicting answer revision',
  'same Reading revision with a different payload cannot overwrite newer data'
);
select extensions.throws_ok(
  $$select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'), '66000000-0000-4000-8000-000000000210', '{}'::uuid[], 'regular roof maintenance', 2)$$,
  '22023', 'text answer exceeds the declared word limit',
  'summary completion enforces the authored word limit'
);

select extensions.lives_ok(
  $$select public.submit_exercise_attempt((select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'))$$,
  'Reading attempt submits and scores atomically'
);
select extensions.results_eq(
  $$select score::integer from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'$$,
  array[10],
  'database scores all four Reading question types deterministically'
);
select extensions.results_eq(
  $$select max_score::integer from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'$$,
  array[10],
  'database derives Reading max score from the pinned version'
);
select extensions.lives_ok(
  $$select public.submit_exercise_attempt((select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'))$$,
  'repeated Reading submit returns the stored result'
);
select extensions.ok(
  jsonb_array_length(public.get_exercise_attempt_result(
    (select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1')
  ) -> 'questions') = 10,
  'owner review contains all ten finalized questions'
);
select extensions.ok(
  not (public.get_exercise_attempt_result(
    (select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1')
  ) ->> 'submittedAfterTimeLimit')::boolean,
  'result derives timer status from database timestamps'
);
select extensions.throws_ok(
  $$select public.save_exercise_answer(
    (select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1'),
    '66000000-0000-4000-8000-000000000201',
    array['66000000-0000-4000-8000-000000000301'::uuid], null, 2
  )$$,
  '55000', 'submitted attempt is immutable',
  'submitted Reading answers cannot be changed'
);

set local request.jwt.claim.sub = '66222222-2222-4222-8222-222222222222';
select extensions.results_eq(
  $$select count(*)::integer from public.learner_attempts$$,
  array[0],
  'user B cannot read user A Reading attempt'
);
select extensions.results_eq(
  $$select count(*)::integer from public.learner_answers$$,
  array[0],
  'user B cannot read user A Reading answers'
);
select extensions.throws_ok(
  $$select public.get_exercise_attempt_result(
    (select id from public.learner_attempts where start_idempotency_key = 'phase6-a-reading-1')
  )$$,
  'P0002', 'attempt not found',
  'user B cannot access user A Reading result'
);

set local request.jwt.claim.sub = '66333333-3333-4333-8333-333333333333';
select extensions.results_eq(
  $$select count(*)::integer from public.reading_passages$$,
  array[0],
  'General Training learner cannot read Academic-only passage content'
);
select extensions.throws_ok(
  $$select public.start_exercise_attempt('academic-reading-cool-roofs', 'phase6-gt-reading-1')$$,
  'P0002', 'exercise not found',
  'General Training learner cannot start Academic-only Reading exercise'
);

reset role;
set local role anon;
select extensions.throws_ok(
  'select count(*) from public.reading_passages',
  '42501', 'permission denied for table reading_passages',
  'anonymous cannot read Reading passages'
);
select extensions.throws_ok(
  $$select public.start_exercise_attempt('academic-reading-cool-roofs', 'phase6-anon-reading')$$,
  '42501', 'permission denied for function start_exercise_attempt',
  'anonymous cannot start Reading attempts'
);

reset role;
select * from extensions.finish();
rollback;

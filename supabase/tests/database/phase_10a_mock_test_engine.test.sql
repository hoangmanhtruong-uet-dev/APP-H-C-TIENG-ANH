begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

select extensions.has_table('public', 'mock_tests', 'Mock test identity table exists');
select extensions.has_table('public', 'mock_test_versions', 'Mock test version table exists');
select extensions.has_table('public', 'mock_test_sections', 'Mock test section table exists');
select extensions.has_table('public', 'mock_test_sessions', 'Mock test session table exists');
select extensions.has_table('public', 'mock_test_section_attempts', 'Mock section attempt table exists');
select extensions.has_table('public', 'mock_test_results', 'Mock result table exists');
select extensions.ok((select bool_and(relrowsecurity) from pg_catalog.pg_class where oid in (
  'public.mock_tests'::regclass, 'public.mock_test_versions'::regclass,
  'public.mock_test_sections'::regclass, 'public.mock_test_sessions'::regclass,
  'public.mock_test_section_attempts'::regclass, 'public.mock_test_results'::regclass
)), 'RLS is enabled on every Phase 10A public table');
select extensions.ok(
  not has_table_privilege('authenticated', 'public.mock_test_sessions', 'insert')
  and not has_table_privilege('authenticated', 'public.mock_test_sessions', 'update')
  and not has_table_privilege('authenticated', 'public.mock_test_results', 'insert'),
  'Learners cannot author session, status or score fields directly'
);
select extensions.results_eq(
  $$select count(*)::integer from public.mock_test_versions where status = 'published'$$,
  array[1], 'Seed contains one published mock test'
);
select extensions.results_eq(
  $$select count(*)::integer from public.mock_test_versions where status = 'draft'$$,
  array[1], 'Seed contains one draft mock test fixture'
);
select extensions.results_eq(
  $$select count(*)::integer from public.mock_test_sections where mock_test_version_id = 'a1100000-0000-4000-8000-000000000001'$$,
  array[4], 'Published mock test links all four skills'
);
select extensions.col_is_null('public', 'mock_test_results', 'writing_submission_id', 'Result reference may be null before generation metadata exists');
select extensions.ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'mock_test_results'
      and column_name in ('overall_band', 'predicted_band', 'official_band', 'total_score')
  ),
  'Phase 10A result schema has no fake aggregate or band field'
);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a1911111-1111-4111-8111-111111111111', 'phase10a-a@example.test', '{"display_name":"Phase 10A A"}'::jsonb),
  ('a1922222-2222-4222-8222-222222222222', 'phase10a-b@example.test', '{"display_name":"Phase 10A B"}'::jsonb);
insert into public.learner_profiles (
  user_id, test_type, current_band, target_band, daily_study_minutes,
  study_days_per_week, priority_skills, primary_goal, onboarding_step, onboarding_completed_at
) values
  ('a1911111-1111-4111-8111-111111111111', 'academic', 5.0, 7.0, 30, 5, array['reading']::text[], 'study_abroad', 8, now()),
  ('a1922222-2222-4222-8222-222222222222', 'academic', 5.5, 7.0, 30, 5, array['listening']::text[], 'work', 8, now());

set local role authenticated;
set local request.jwt.claim.sub = 'a1911111-1111-4111-8111-111111111111';

select extensions.results_eq($$select count(*)::integer from public.mock_tests$$, array[1],
  'Completed learner sees only the published mock test');
select extensions.results_eq($$select count(*)::integer from public.mock_test_versions where status = 'draft'$$, array[0],
  'Draft mock version is invisible');
select extensions.results_eq($$select count(*)::integer from public.mock_test_sections$$, array[4],
  'Draft child sections are invisible');
select extensions.lives_ok(
  $$select public.start_mock_test('academic-foundation-mock', 'phase10a-start')$$,
  'Learner starts the published mock test'
);
select extensions.lives_ok(
  $$select public.start_mock_test('academic-foundation-mock', 'phase10a-start')$$,
  'Mock test start is idempotent'
);
select extensions.results_eq($$select count(*)::integer from public.mock_test_sessions$$, array[1],
  'Idempotent start creates one owner session');
select extensions.results_eq(
  $$select mock_test_version_id from public.mock_test_sessions$$,
  array['a1100000-0000-4000-8000-000000000001'::uuid],
  'Session pins the exact published mock version'
);
select extensions.lives_ok(
  $$select public.start_mock_test_section(
    (select id from public.mock_test_sessions), 'a1200000-0000-4000-8000-000000000001', 'phase10a-reading-start'
  )$$,
  'Learner starts the first Reading section'
);
select extensions.throws_ok(
  $$select public.start_mock_test_section(
    (select id from public.mock_test_sessions), 'a1200000-0000-4000-8000-000000000002', 'phase10a-listening-too-early'
  )$$,
  'P0001', 'mock sections must be completed in order',
  'Out-of-order section start is rejected'
);
select extensions.lives_ok(
  $$select public.submit_mock_test_section(
    (select id from public.mock_test_section_attempts where section_type = 'reading'), 'phase10a-reading-submit'
  )$$,
  'Reading section submits through the deterministic exercise engine'
);
select extensions.results_eq(
  $$select status from public.learner_attempts where id = (
    select learner_attempt_id from public.mock_test_section_attempts where section_type = 'reading'
  )$$,
  array['scored'::text], 'Reading underlying attempt is scored'
);
select extensions.lives_ok(
  $$select public.start_mock_test_section(
    (select id from public.mock_test_sessions), 'a1200000-0000-4000-8000-000000000002', 'phase10a-listening-start'
  )$$,
  'Learner starts Listening after Reading submission'
);
select extensions.lives_ok(
  $$select public.submit_mock_test_section(
    (select id from public.mock_test_section_attempts where section_type = 'listening'), 'phase10a-listening-submit'
  )$$,
  'Listening section submits through the deterministic exercise engine'
);
select extensions.lives_ok(
  $$select public.start_mock_test_section(
    (select id from public.mock_test_sessions), 'a1200000-0000-4000-8000-000000000003', 'phase10a-writing-start'
  )$$,
  'Learner starts Writing after Listening submission'
);
select extensions.lives_ok(
  $$select public.save_writing_draft(
    (select writing_submission_id from public.mock_test_section_attempts where section_type = 'writing'),
    'Public green spaces can improve health and social connection. Towns should balance these benefits with housing needs through evidence-based local planning.', 0
  )$$,
  'Writing draft is saved by the existing revision engine'
);
select extensions.lives_ok(
  $$select public.submit_mock_test_section(
    (select id from public.mock_test_section_attempts where section_type = 'writing'), 'phase10a-writing-submit'
  )$$,
  'Writing section submits as an immutable real submission'
);
select extensions.lives_ok(
  $$select public.start_mock_test_section(
    (select id from public.mock_test_sessions), 'a1200000-0000-4000-8000-000000000004', 'phase10a-speaking-start'
  )$$,
  'Learner starts Speaking after Writing submission'
);

reset role;
update public.speaking_attempts set
  status = 'submitted', submit_idempotency_key = 'phase10a-speaking-submit', submitted_at = now()
where id = (
  select speaking_attempt_id from public.mock_test_section_attempts
  where user_id = 'a1911111-1111-4111-8111-111111111111' and section_type = 'speaking'
);
set local role authenticated;
set local request.jwt.claim.sub = 'a1911111-1111-4111-8111-111111111111';
select extensions.lives_ok(
  $$select public.submit_mock_test_section(
    (select id from public.mock_test_section_attempts where section_type = 'speaking'), 'phase10a-speaking-submit'
  )$$,
  'Speaking section orchestration accepts a genuinely submitted underlying attempt'
);
select extensions.lives_ok(
  $$select public.submit_mock_test((select id from public.mock_test_sessions), 'phase10a-mock-submit')$$,
  'Whole mock submits only after all required sections'
);
select extensions.lives_ok(
  $$select public.complete_mock_test((select id from public.mock_test_sessions))$$,
  'Whole mock completes and creates a real result snapshot'
);
select extensions.results_eq($$select status from public.mock_test_sessions$$, array['completed'::text],
  'Completed session is server-owned and finalized');
select extensions.results_eq($$select count(*)::integer from public.mock_test_results$$, array[1],
  'Exactly one result snapshot exists');
select extensions.ok(
  (select reading_score is not null and reading_max_score > 0
    and listening_score is not null and listening_max_score > 0
    and writing_submission_id is not null and speaking_attempt_id is not null
   from public.mock_test_results),
  'Summary contains only real underlying engine data'
);
select extensions.throws_ok(
  $$update public.mock_test_sessions set status = 'in_progress'$$,
  '42501', null, 'Learner cannot reopen a completed session by direct update'
);

set local request.jwt.claim.sub = 'a1922222-2222-4222-8222-222222222222';
select extensions.results_eq($$select count(*)::integer from public.mock_test_sessions$$, array[0],
  'Actor B cannot read actor A session');
select extensions.results_eq($$select count(*)::integer from public.mock_test_section_attempts$$, array[0],
  'Actor B cannot read actor A section attempts or linked IDs');
select extensions.results_eq($$select count(*)::integer from public.mock_test_results$$, array[0],
  'Actor B cannot read actor A result or essay/audio references');

reset role;
set local role anon;
select extensions.throws_ok($$select count(*) from public.mock_tests$$, '42501', null,
  'Anonymous users cannot read mock test catalog');
select extensions.throws_ok($$select public.start_mock_test('academic-foundation-mock', 'anon-start')$$, '42501', null,
  'Anonymous users cannot execute start RPC');

reset role;
select * from extensions.finish();
rollback;

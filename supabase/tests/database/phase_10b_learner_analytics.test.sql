begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

select extensions.has_function('public', 'get_learner_progress_overview', array[]::text[], 'Progress overview RPC exists');
select extensions.has_function('public', 'get_learner_skill_progress', array[]::text[], 'Skill progress RPC exists');
select extensions.has_function('public', 'get_learner_recent_activity', array['integer'], 'Recent activity RPC exists');
select extensions.has_function('public', 'get_learner_mock_test_history', array['integer'], 'Mock history RPC exists');
select extensions.ok(
  not has_function_privilege('anon', 'public.get_learner_progress_overview()', 'execute')
  and has_function_privilege('authenticated', 'public.get_learner_progress_overview()', 'execute'),
  'Analytics execution is authenticated-only'
);
select extensions.ok(
  exists (
    select 1 from pg_catalog.pg_indexes
    where schemaname = 'public' and indexname = 'learner_attempts_user_scored_submitted_idx'
      and indexdef like '%(user_id, submitted_at DESC)%WHERE (status = ''scored''::text)%'
  ),
  'Scored history has a matching partial index'
);
select extensions.ok(
  not exists (
    select 1 from pg_catalog.pg_proc
    where oid in (
      'public.get_learner_progress_overview()'::regprocedure,
      'public.get_learner_skill_progress()'::regprocedure,
      'public.get_learner_recent_activity(integer)'::regprocedure,
      'public.get_learner_mock_test_history(integer)'::regprocedure
    ) and coalesce(array_to_string(proargnames, ','), '') ~ '(user_id|band|essay|transcript|audio|answer_key)'
  ),
  'RPC signatures expose no user selector, band, essay, transcript, audio or answer key'
);

insert into auth.users (id, email, raw_user_meta_data) values
  ('b1011111-1111-4111-8111-111111111111', 'phase10b-a@example.test', '{"display_name":"Phase 10B A"}'::jsonb),
  ('b1022222-2222-4222-8222-222222222222', 'phase10b-b@example.test', '{"display_name":"Phase 10B B"}'::jsonb);
insert into public.learner_profiles (
  user_id, test_type, current_band, target_band, daily_study_minutes,
  study_days_per_week, priority_skills, primary_goal, onboarding_step, onboarding_completed_at
) values
  ('b1011111-1111-4111-8111-111111111111', 'academic', 5.0, 7.0, 30, 5, array['reading']::text[], 'study_abroad', 8, now()),
  ('b1022222-2222-4222-8222-222222222222', 'academic', 5.5, 7.0, 30, 5, array['listening']::text[], 'work', 8, now());

insert into public.learner_lesson_progress (
  user_id, lesson_id, lesson_version_id, status, progress_percent,
  started_at, last_accessed_at, completed_at
)
select 'b1011111-1111-4111-8111-111111111111', lessons.id, versions.id,
  'completed', 100, now() - interval '2 days', now() - interval '1 day', now() - interval '1 day'
from public.learning_modules as modules
join public.lessons as lessons on lessons.module_id = modules.id
join public.lesson_versions as versions on versions.lesson_id = lessons.id and versions.status = 'published'
where modules.status = 'published'
order by modules.display_order, lessons.display_order
limit 1;

insert into public.learner_attempts (
  id, user_id, exercise_set_id, exercise_set_version_id, status,
  start_idempotency_key, current_question_position, score, max_score,
  started_at, last_saved_at, submitted_at, scored_at
)
select fixtures.id, fixtures.user_id, sets.id, versions.id, 'scored', fixtures.key, 1,
  fixtures.score, 2, fixtures.occurred_at - interval '5 minutes', fixtures.occurred_at,
  fixtures.occurred_at, fixtures.occurred_at
from public.exercise_sets as sets
join public.exercise_set_versions as versions on versions.exercise_set_id = sets.id and versions.status = 'published'
cross join (values
  ('b10a0000-0000-4000-8000-000000000001'::uuid, 'b1011111-1111-4111-8111-111111111111'::uuid, 'phase10b-a-reading-1', 1::smallint, now() - interval '4 hours'),
  ('b10a0000-0000-4000-8000-000000000002'::uuid, 'b1011111-1111-4111-8111-111111111111'::uuid, 'phase10b-a-reading-2', 1::smallint, now() - interval '3 hours'),
  ('b10b0000-0000-4000-8000-000000000001'::uuid, 'b1022222-2222-4222-8222-222222222222'::uuid, 'phase10b-b-reading-1', 2::smallint, now() - interval '2 hours')
) as fixtures(id, user_id, key, score, occurred_at)
where sets.domain = 'reading'
order by versions.version desc
limit 3;

insert into public.mock_test_sessions (
  id, user_id, mock_test_id, mock_test_version_id, status,
  start_idempotency_key, started_at
)
select 'b10c0000-0000-4000-8000-000000000001',
  'b1011111-1111-4111-8111-111111111111', tests.id, versions.id,
  'in_progress', 'phase10b-a-mock', now() - interval '1 hour'
from public.mock_tests as tests
join public.mock_test_versions as versions on versions.mock_test_id = tests.id and versions.status = 'published'
limit 1;

set local role authenticated;
set local request.jwt.claim.sub = 'b1011111-1111-4111-8111-111111111111';

select extensions.results_eq(
  $$select lesson_completed from public.get_learner_progress_overview()$$,
  array[1], 'Overview uses persisted lesson progress'
);
select extensions.results_eq(
  $$select active_mock_tests from public.get_learner_progress_overview()$$,
  array[1], 'Overview uses persisted active mock sessions'
);
select extensions.results_eq(
  $$select accuracy_percent from public.get_learner_skill_progress() where skill = 'reading'$$,
  array[50.0::numeric], 'Objective accuracy is derived from real stored score totals'
);
select extensions.results_eq(
  $$select scored_count::integer from public.get_learner_skill_progress() where skill = 'reading'$$,
  array[2], 'Skill evidence exposes its real sample count'
);
select extensions.results_eq(
  $$select count(*)::integer from public.get_learner_skill_progress() where skill in ('writing', 'speaking') and accuracy_percent is not null$$,
  array[0], 'Writing and Speaking receive no fabricated score or accuracy'
);
select extensions.results_eq(
  $$select count(*)::integer from public.get_learner_recent_activity(20) where entity_id = 'b10b0000-0000-4000-8000-000000000001'$$,
  array[0], 'Actor A recent activity excludes actor B data'
);
select extensions.results_eq(
  $$select count(*)::integer from public.get_learner_mock_test_history(8)$$,
  array[1], 'Actor A sees the persisted mock session'
);
select extensions.throws_ok(
  $$select * from public.get_learner_recent_activity(21)$$,
  '22023', 'p_limit must be between 1 and 20', 'Recent activity rejects an unbounded limit'
);

set local request.jwt.claim.sub = 'b1022222-2222-4222-8222-222222222222';
select extensions.results_eq(
  $$select count(*)::integer from public.get_learner_mock_test_history(8)$$,
  array[0], 'Actor B cannot read actor A mock history'
);
select extensions.results_eq(
  $$select scored_count::integer from public.get_learner_skill_progress() where skill = 'reading'$$,
  array[1], 'Actor B skill totals contain only actor B evidence'
);

set local request.jwt.claim.sub = '';
select extensions.throws_ok(
  $$select * from public.get_learner_progress_overview()$$,
  '42501', 'Authentication required', 'Empty actor is rejected before catalog data can leak'
);

reset role;
set local role anon;
select extensions.throws_ok(
  $$select * from public.get_learner_progress_overview()$$,
  '42501', null, 'Anonymous execution is denied'
);

reset role;
select * from extensions.finish();
rollback;

begin;

select '1..17';
select case when to_regprocedure('public.get_learner_progress_overview()') is not null then 'ok 1 - overview RPC exists' else 'not ok 1 - overview RPC missing' end;
select case when to_regprocedure('public.get_learner_skill_progress()') is not null then 'ok 2 - skill RPC exists' else 'not ok 2 - skill RPC missing' end;
select case when to_regprocedure('public.get_learner_recent_activity(integer)') is not null then 'ok 3 - activity RPC exists' else 'not ok 3 - activity RPC missing' end;
select case when to_regprocedure('public.get_learner_mock_test_history(integer)') is not null then 'ok 4 - mock history RPC exists' else 'not ok 4 - mock history RPC missing' end;
select case when has_function_privilege('authenticated', 'public.get_learner_progress_overview()', 'execute')
  and not has_function_privilege('anon', 'public.get_learner_progress_overview()', 'execute')
  then 'ok 5 - execution is authenticated only' else 'not ok 5 - execution grants are unsafe' end;
select case when exists (select 1 from pg_catalog.pg_indexes where schemaname = 'public'
  and indexname = 'learner_attempts_user_scored_submitted_idx')
  then 'ok 6 - scored history index exists' else 'not ok 6 - scored history index missing' end;
select case when not exists (
  select 1 from pg_catalog.pg_proc where oid in (
    'public.get_learner_progress_overview()'::regprocedure,
    'public.get_learner_skill_progress()'::regprocedure,
    'public.get_learner_recent_activity(integer)'::regprocedure,
    'public.get_learner_mock_test_history(integer)'::regprocedure
  ) and coalesce(array_to_string(proargnames, ','), '') ~ '(user_id|band|essay|transcript|audio|answer_key)'
) then 'ok 7 - RPC signatures expose no sensitive selector or payload' else 'not ok 7 - unsafe RPC signature' end;
select case when not has_table_privilege('authenticated', (
  select tables.oid from pg_catalog.pg_class as tables
  join pg_catalog.pg_namespace as schemas on schemas.oid = tables.relnamespace
  where schemas.nspname = 'private' and tables.relname = 'exercise_answer_keys'
), 'select')
  then 'ok 8 - answer keys remain private' else 'not ok 8 - answer keys leaked' end;

insert into auth.users (id, email, raw_user_meta_data) values
  ('b1031111-1111-4111-8111-111111111111', 'phase10b-remote-a@example.test', '{"display_name":"Remote Phase 10B A"}'::jsonb),
  ('b1032222-2222-4222-8222-222222222222', 'phase10b-remote-b@example.test', '{"display_name":"Remote Phase 10B B"}'::jsonb);
insert into public.learner_profiles (user_id, test_type, current_band, target_band, daily_study_minutes,
  study_days_per_week, priority_skills, primary_goal, onboarding_step, onboarding_completed_at) values
  ('b1031111-1111-4111-8111-111111111111', 'academic', 5.0, 7.0, 30, 5, array['reading']::text[], 'study_abroad', 8, now()),
  ('b1032222-2222-4222-8222-222222222222', 'academic', 5.5, 7.0, 30, 5, array['listening']::text[], 'work', 8, now());

insert into public.learner_attempts (
  id, user_id, exercise_set_id, exercise_set_version_id, status, start_idempotency_key,
  current_question_position, score, max_score, started_at, last_saved_at, submitted_at, scored_at
)
select fixtures.id, fixtures.user_id, sets.id, versions.id, 'scored', fixtures.key, 1,
  fixtures.score, 2, now() - interval '10 minutes', now(), now(), now()
from public.exercise_sets as sets
join public.exercise_set_versions as versions on versions.exercise_set_id = sets.id and versions.status = 'published'
cross join (values
  ('b10d0000-0000-4000-8000-000000000001'::uuid, 'b1031111-1111-4111-8111-111111111111'::uuid, 'phase10b-remote-a-1', 1::smallint),
  ('b10d0000-0000-4000-8000-000000000002'::uuid, 'b1031111-1111-4111-8111-111111111111'::uuid, 'phase10b-remote-a-2', 1::smallint),
  ('b10e0000-0000-4000-8000-000000000001'::uuid, 'b1032222-2222-4222-8222-222222222222'::uuid, 'phase10b-remote-b-1', 2::smallint)
) as fixtures(id, user_id, key, score)
where sets.domain = 'reading'
order by versions.version desc
limit 3;

insert into public.mock_test_sessions (id, user_id, mock_test_id, mock_test_version_id, status, start_idempotency_key)
select 'b10f0000-0000-4000-8000-000000000001', 'b1031111-1111-4111-8111-111111111111',
  tests.id, versions.id, 'in_progress', 'phase10b-remote-mock'
from public.mock_tests as tests
join public.mock_test_versions as versions on versions.mock_test_id = tests.id and versions.status = 'published'
limit 1;

select case when current_user = 'postgres'
  then 'ok 9 - verifier runs as database owner' else 'not ok 9 - verifier is not database owner' end;

set local role authenticated;
set local request.jwt.claim.sub = 'b1031111-1111-4111-8111-111111111111';
select case when (select accuracy_percent from public.get_learner_skill_progress() where skill = 'reading') = 50.0
  then 'ok 10 - objective accuracy uses persisted scores' else 'not ok 10 - objective accuracy mismatch' end;
select case when (select scored_count from public.get_learner_skill_progress() where skill = 'reading') = 2
  then 'ok 11 - sample count is real' else 'not ok 11 - sample count mismatch' end;
select case when (select count(*) from public.get_learner_skill_progress() where skill in ('writing', 'speaking') and accuracy_percent is not null) = 0
  then 'ok 12 - no fabricated Writing or Speaking score' else 'not ok 12 - fabricated subjective score' end;
select case when (select count(*) from public.get_learner_mock_test_history(8)) = 1
  then 'ok 13 - owner mock history visible' else 'not ok 13 - owner mock history mismatch' end;
select case when (select count(*) from public.get_learner_recent_activity(20) where entity_id = 'b10e0000-0000-4000-8000-000000000001') = 0
  then 'ok 14 - actor B activity excluded' else 'not ok 14 - cross user activity leaked' end;

set local request.jwt.claim.sub = 'b1032222-2222-4222-8222-222222222222';
select case when (select scored_count from public.get_learner_skill_progress() where skill = 'reading') = 1
  then 'ok 15 - actor B totals are isolated' else 'not ok 15 - actor B totals leaked' end;
select case when (select count(*) from public.get_learner_mock_test_history(8)) = 0
  then 'ok 16 - actor B cannot read actor A mock history' else 'not ok 16 - mock history leaked' end;
select case when (select count(*) from public.get_learner_recent_activity(20) where entity_id = 'b10d0000-0000-4000-8000-000000000001') = 0
  then 'ok 17 - actor B cannot read actor A activity' else 'not ok 17 - recent activity leaked' end;

reset role;
rollback;

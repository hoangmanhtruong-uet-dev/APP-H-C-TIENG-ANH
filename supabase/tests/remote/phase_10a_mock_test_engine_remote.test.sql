begin;

select '1..20';
select case when to_regclass('public.mock_tests') is not null then 'ok 1 - mock tests exist' else 'not ok 1 - mock tests missing' end;
select case when to_regclass('public.mock_test_sessions') is not null then 'ok 2 - mock sessions exist' else 'not ok 2 - mock sessions missing' end;
select case when to_regclass('public.mock_test_results') is not null then 'ok 3 - mock results exist' else 'not ok 3 - mock results missing' end;
select case when (select bool_and(relrowsecurity) from pg_catalog.pg_class where oid in (
  'public.mock_tests'::regclass, 'public.mock_test_versions'::regclass, 'public.mock_test_sections'::regclass,
  'public.mock_test_sessions'::regclass, 'public.mock_test_section_attempts'::regclass, 'public.mock_test_results'::regclass
)) then 'ok 4 - Phase 10A RLS enabled' else 'not ok 4 - Phase 10A RLS disabled' end;
select case when not has_table_privilege('authenticated', 'public.mock_test_sessions', 'insert')
  and not has_table_privilege('authenticated', 'public.mock_test_results', 'insert')
  then 'ok 5 - learner table grants are read only' else 'not ok 5 - learner can forge state' end;
select case when (select count(*) from public.mock_test_versions where status = 'published') = 1
  then 'ok 6 - one published fixture' else 'not ok 6 - published fixture mismatch' end;
select case when (select count(*) from public.mock_test_versions where status = 'draft') = 1
  then 'ok 7 - one draft fixture' else 'not ok 7 - draft fixture mismatch' end;
select case when not exists (select 1 from information_schema.columns where table_schema = 'public'
  and table_name = 'mock_test_results' and column_name in ('overall_band', 'predicted_band', 'total_score'))
  then 'ok 8 - no fake aggregate band field' else 'not ok 8 - fake aggregate field exists' end;

insert into auth.users (id, email, raw_user_meta_data) values
  ('a1931111-1111-4111-8111-111111111111', 'phase10a-remote-a@example.test', '{"display_name":"Remote Phase 10A A"}'::jsonb),
  ('a1932222-2222-4222-8222-222222222222', 'phase10a-remote-b@example.test', '{"display_name":"Remote Phase 10A B"}'::jsonb);
insert into public.learner_profiles (user_id, test_type, current_band, target_band, daily_study_minutes,
  study_days_per_week, priority_skills, primary_goal, onboarding_step, onboarding_completed_at) values
  ('a1931111-1111-4111-8111-111111111111', 'academic', 5.0, 7.0, 30, 5, array['reading']::text[], 'study_abroad', 8, now()),
  ('a1932222-2222-4222-8222-222222222222', 'academic', 5.5, 7.0, 30, 5, array['listening']::text[], 'work', 8, now());

set local role authenticated;
set local request.jwt.claim.sub = 'a1931111-1111-4111-8111-111111111111';
select case when (select count(*) from public.mock_tests) = 1 then 'ok 9 - published catalog visible' else 'not ok 9 - catalog visibility mismatch' end;
select case when (select count(*) from public.mock_test_versions where status = 'draft') = 0 then 'ok 10 - draft version invisible' else 'not ok 10 - draft version leaked' end;
select case when (select count(*) from public.mock_test_sections) = 4 then 'ok 11 - only published sections visible' else 'not ok 11 - section visibility mismatch' end;
do $$ begin perform public.start_mock_test('academic-foundation-mock', 'phase10a-remote-start'); end $$;
select case when (select count(*) from public.mock_test_sessions) = 1 then 'ok 12 - session starts' else 'not ok 12 - session start failed' end;
do $$ begin perform public.start_mock_test('academic-foundation-mock', 'phase10a-remote-start'); end $$;
select case when (select count(*) from public.mock_test_sessions) = 1 then 'ok 13 - session start idempotent' else 'not ok 13 - duplicate session' end;
select case when (select mock_test_version_id from public.mock_test_sessions) = 'a1100000-0000-4000-8000-000000000001'::uuid
  then 'ok 14 - version pinned' else 'not ok 14 - version pin mismatch' end;
do $$ begin perform public.start_mock_test_section((select id from public.mock_test_sessions),
  'a1200000-0000-4000-8000-000000000001', 'phase10a-remote-reading'); end $$;
select case when (select count(*) from public.mock_test_section_attempts) = 1 then 'ok 15 - first section starts' else 'not ok 15 - first section start failed' end;
select case when not has_table_privilege('authenticated', 'private.exercise_answer_keys', 'select')
  then 'ok 16 - answer keys remain private' else 'not ok 16 - answer key grant leaked' end;

set local request.jwt.claim.sub = 'a1932222-2222-4222-8222-222222222222';
select case when (select count(*) from public.mock_test_sessions) = 0 then 'ok 17 - cross user session denied' else 'not ok 17 - cross user session leaked' end;
select case when (select count(*) from public.mock_test_section_attempts) = 0 then 'ok 18 - cross user section denied' else 'not ok 18 - cross user section leaked' end;
select case when (select count(*) from public.mock_test_results) = 0 then 'ok 19 - cross user result denied' else 'not ok 19 - cross user result leaked' end;
set local request.jwt.claim.sub = '';
select case when (select count(*) from public.mock_test_sessions) = 0 then 'ok 20 - empty actor sees no sessions' else 'not ok 20 - anonymous-style actor leaked sessions' end;

reset role;
rollback;

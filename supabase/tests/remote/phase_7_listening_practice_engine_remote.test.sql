begin;

create function pg_temp.throws_state(command text, expected_state text)
returns boolean language plpgsql as $$
begin execute command; return false;
exception when others then return sqlstate = expected_state;
end;
$$;

select '1..34';
select case when to_regclass('public.listening_audio_assets') is not null then 'ok 1 - audio schema exists' else 'not ok 1 - audio schema missing' end;
select case when to_regclass('public.listening_parts') is not null then 'ok 2 - Listening parts schema exists' else 'not ok 2 - Listening parts schema missing' end;
select case when to_regclass('private.listening_transcripts') is not null then 'ok 3 - private transcript schema exists' else 'not ok 3 - transcript schema missing' end;
select case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'learner_attempts' and column_name = 'time_limit_seconds') then 'ok 4 - generic timer column exists' else 'not ok 4 - generic timer column missing' end;
select case when (select bool_and(relrowsecurity) from pg_catalog.pg_class where oid in ('public.listening_audio_assets'::regclass, 'public.listening_practice_versions'::regclass, 'public.listening_parts'::regclass)) then 'ok 5 - Listening RLS enabled' else 'not ok 5 - Listening RLS disabled' end;
select case when (select count(*) from public.exercise_set_versions where id = '77000000-0000-4000-8000-000000000101' and status = 'published') = 1 then 'ok 6 - published Listening seed exists' else 'not ok 6 - published Listening seed mismatch' end;
select case when (select count(*) from public.exercise_set_versions where id = '77000000-0000-4000-8000-000000000903' and status = 'draft') = 1 then 'ok 7 - draft Listening fixture exists' else 'not ok 7 - draft Listening fixture mismatch' end;
select case when (select count(*) from public.listening_parts where exercise_set_version_id = '77000000-0000-4000-8000-000000000101') = 2 then 'ok 8 - Listening parts exist' else 'not ok 8 - Listening part mismatch' end;
select case when (select count(*) from public.exercise_questions where exercise_set_version_id = '77000000-0000-4000-8000-000000000101') = 8 then 'ok 9 - Listening questions exist' else 'not ok 9 - Listening question mismatch' end;
select case when not has_table_privilege('authenticated', 'private.listening_transcripts', 'select') and not has_table_privilege('authenticated', 'private.exercise_answer_keys', 'select') then 'ok 10 - transcript and answer keys hidden' else 'not ok 10 - private content exposed' end;
select case when has_table_privilege('authenticated', 'public.listening_audio_assets', 'select') and not has_table_privilege('authenticated', 'public.listening_audio_assets', 'update') then 'ok 11 - Listening metadata is read-only' else 'not ok 11 - Listening grant mismatch' end;
select case when (select prosecdef from pg_catalog.pg_proc where oid = 'public.get_listening_attempt_clock(uuid)'::regprocedure) then 'ok 12 - clock RPC hardened' else 'not ok 12 - clock RPC not hardened' end;
select case when (select prosecdef from pg_catalog.pg_proc where oid = 'public.get_listening_attempt_result(uuid)'::regprocedure) then 'ok 13 - result RPC hardened' else 'not ok 13 - result RPC not hardened' end;

insert into auth.users (id, email, raw_user_meta_data) values
  ('87111111-1111-4111-8111-111111111111', 'phase7-remote-a@example.test', '{"display_name":"Remote Phase 7 A"}'::jsonb),
  ('87222222-2222-4222-8222-222222222222', 'phase7-remote-b@example.test', '{"display_name":"Remote Phase 7 B"}'::jsonb),
  ('87333333-3333-4333-8333-333333333333', 'phase7-remote-gt@example.test', '{"display_name":"Remote Phase 7 GT"}'::jsonb);
insert into public.learner_profiles (user_id, test_type, current_band, target_band, daily_study_minutes, study_days_per_week, priority_skills, primary_goal, onboarding_step, onboarding_completed_at) values
  ('87111111-1111-4111-8111-111111111111', 'academic', 5.0, 7.0, 45, 5, array['listening']::text[], 'study_abroad', 8, now()),
  ('87222222-2222-4222-8222-222222222222', 'academic', 5.0, 6.5, 30, 4, array['listening']::text[], 'work', 8, now()),
  ('87333333-3333-4333-8333-333333333333', 'general_training', 5.0, 6.5, 30, 4, array['listening']::text[], 'work', 8, now());

set local role authenticated;
set local request.jwt.claim.sub = '87111111-1111-4111-8111-111111111111';
select case when (select count(*) from public.listening_audio_assets) = 1 then 'ok 14 - published audio metadata visible' else 'not ok 14 - audio visibility mismatch' end;
select case when (select count(*) from public.exercise_set_versions where status = 'draft') = 0 then 'ok 15 - draft exercise hidden' else 'not ok 15 - draft exercise leaked' end;
select case when (select count(*) from public.exercise_sets where domain = 'listening') = 1 then 'ok 16 - published Listening set visible' else 'not ok 16 - Listening set visibility mismatch' end;
select case when pg_temp.throws_state('select count(*) from private.listening_transcripts', '42501') then 'ok 17 - direct transcript read denied' else 'not ok 17 - direct transcript read allowed' end;

select public.start_exercise_attempt('academic-listening-community-library', 'phase7-remote-a-1');
select case when (select count(*) from public.learner_attempts where start_idempotency_key = 'phase7-remote-a-1') = 1 then 'ok 18 - Listening start persists one attempt' else 'not ok 18 - Listening start failed' end;
select public.start_exercise_attempt('academic-listening-community-library', 'phase7-remote-a-1');
select case when (select count(*) from public.learner_attempts where start_idempotency_key = 'phase7-remote-a-1') = 1 then 'ok 19 - Listening start is idempotent' else 'not ok 19 - Listening start duplicated' end;
select case when (select time_limit_seconds = 600 and reading_time_limit_seconds is null and expires_at = started_at + interval '600 seconds' from public.learner_attempts where start_idempotency_key = 'phase7-remote-a-1') then 'ok 20 - Listening timer is database-derived' else 'not ok 20 - timer derivation mismatch' end;
select case when pg_temp.throws_state(format('select public.get_listening_attempt_result(%L::uuid)', (select id from public.learner_attempts where start_idempotency_key = 'phase7-remote-a-1')), '55000') then 'ok 21 - result and transcript hidden before submit' else 'not ok 21 - pre-submit review leaked' end;

select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase7-remote-a-1'), '77000000-0000-4000-8000-000000000201', array['77000000-0000-4000-8000-000000000302'::uuid], null, 1);
select case when (select count(*) from public.learner_answers) = 1 then 'ok 22 - option answer persists' else 'not ok 22 - option answer missing' end;
select public.save_exercise_answer((select id from public.learner_attempts where start_idempotency_key = 'phase7-remote-a-1'), '77000000-0000-4000-8000-000000000203', '{}'::uuid[], ' SECOND FLOOR ', 1);
select case when (select count(*) from public.learner_answers) = 2 then 'ok 23 - text answer persists' else 'not ok 23 - text answer missing' end;
select case when pg_temp.throws_state(format('select public.save_exercise_answer(%L::uuid, %L::uuid, %L::uuid[], %L, 1)', (select id from public.learner_attempts where start_idempotency_key = 'phase7-remote-a-1'), '77000000-0000-4000-8000-000000000203', '{}', 'first floor'), '40001') then 'ok 24 - stale answer rejected' else 'not ok 24 - stale answer accepted' end;
select case when pg_temp.throws_state(format('select public.save_exercise_answer(%L::uuid, %L::uuid, array[%L::uuid], null, 2)', (select id from public.learner_attempts where start_idempotency_key = 'phase7-remote-a-1'), '77000000-0000-4000-8000-000000000201', '77000000-0000-4000-8000-000000000309'), '22023') then 'ok 25 - cross-question option rejected' else 'not ok 25 - invalid option accepted' end;

select public.submit_exercise_attempt((select id from public.learner_attempts where start_idempotency_key = 'phase7-remote-a-1'));
select case when (select score = 2 and max_score = 8 and status = 'scored' from public.learner_attempts where start_idempotency_key = 'phase7-remote-a-1') then 'ok 26 - database Listening scoring persists' else 'not ok 26 - database score mismatch' end;
select public.submit_exercise_attempt((select id from public.learner_attempts where start_idempotency_key = 'phase7-remote-a-1'));
select case when (select count(*) from public.learner_attempts where start_idempotency_key = 'phase7-remote-a-1') = 1 then 'ok 27 - submit is idempotent' else 'not ok 27 - submit duplicated state' end;
select case when jsonb_array_length(public.get_listening_attempt_result((select id from public.learner_attempts where start_idempotency_key = 'phase7-remote-a-1')) -> 'questions') = 8 and length(public.get_listening_attempt_result((select id from public.learner_attempts where start_idempotency_key = 'phase7-remote-a-1')) ->> 'transcriptMarkdown') > 100 then 'ok 28 - post-submit review and transcript available' else 'not ok 28 - Listening review missing' end;
select case when pg_temp.throws_state(format('select public.save_exercise_answer(%L::uuid, %L::uuid, array[%L::uuid], null, 2)', (select id from public.learner_attempts where start_idempotency_key = 'phase7-remote-a-1'), '77000000-0000-4000-8000-000000000201', '77000000-0000-4000-8000-000000000301'), '55000') then 'ok 29 - submitted answer immutable' else 'not ok 29 - submitted answer changed' end;

set local request.jwt.claim.sub = '87222222-2222-4222-8222-222222222222';
select case when (select count(*) from public.learner_attempts) = 0 then 'ok 30 - user B cannot read user A attempt' else 'not ok 30 - cross-user attempt leaked' end;
select case when pg_temp.throws_state($$select public.get_listening_attempt_result('00000000-0000-0000-0000-000000000000')$$, 'P0002') then 'ok 31 - user B cannot read another result' else 'not ok 31 - cross-user result leaked' end;

set local request.jwt.claim.sub = '87333333-3333-4333-8333-333333333333';
select case when (select count(*) from public.listening_audio_assets) = 0 then 'ok 32 - GT learner cannot read Academic audio' else 'not ok 32 - test-type audio leaked' end;
select case when pg_temp.throws_state($$select public.start_exercise_attempt('academic-listening-community-library', 'phase7-remote-gt-1')$$, 'P0002') then 'ok 33 - GT learner cannot start Academic set' else 'not ok 33 - GT learner started Academic set' end;

reset role;
set local role anon;
select case when pg_temp.throws_state('select count(*) from public.listening_audio_assets', '42501') then 'ok 34 - anonymous Listening read denied' else 'not ok 34 - anonymous Listening read allowed' end;

reset role;
rollback;

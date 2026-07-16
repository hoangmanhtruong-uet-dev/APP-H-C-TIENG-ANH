begin;

create function pg_temp.throws_state(command text, expected_state text)
returns boolean language plpgsql as $$
begin execute command; return false;
exception when others then return sqlstate = expected_state;
end;
$$;

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'writing_feedback_signing_secret') then
    perform vault.create_secret('phase8-remote-verifier-secret', 'writing_feedback_signing_secret', 'Transaction-scoped Phase 8 verifier secret');
  end if;
end;
$$;

create function pg_temp.feedback_payload()
returns text language sql immutable as $$
  select jsonb_build_object(
    'overallBandEstimate', 6.5,
    'confidence', 'medium',
    'summary', 'Practice guidance only; this estimate is not an official IELTS score.',
    'criteria', jsonb_build_object(
      'taskResponse', jsonb_build_object('band', 6.5, 'comment', 'Clear position.', 'evidence', jsonb_build_array('Urban green spaces improve daily life.')),
      'coherenceCohesion', jsonb_build_object('band', 6.5, 'comment', 'Connected ideas.', 'evidence', jsonb_build_array('Urban green spaces improve daily life.')),
      'lexicalResource', jsonb_build_object('band', 6.0, 'comment', 'Clear vocabulary.', 'evidence', jsonb_build_array('Urban green spaces improve daily life.')),
      'grammaticalRangeAccuracy', jsonb_build_object('band', 6.0, 'comment', 'Controlled sentences.', 'evidence', jsonb_build_array('Urban green spaces improve daily life.'))
    ),
    'strengths', jsonb_build_array('A direct opening position.'),
    'priorityIssues', jsonb_build_array(
      jsonb_build_object('issue', 'Develop the comparison.', 'evidence', 'Urban green spaces improve daily life.'),
      jsonb_build_object('issue', 'Add an example.', 'evidence', 'Urban green spaces improve daily life.'),
      jsonb_build_object('issue', 'Vary sentence openings.', 'evidence', 'Urban green spaces improve daily life.')
    ),
    'revisionPlan', jsonb_build_array('Clarify the thesis.', 'Develop two body paragraphs.', 'Check links between ideas.'),
    'correctedExamples', jsonb_build_array(jsonb_build_object('source', 'Urban green spaces improve daily life.', 'revision', 'Well-planned green spaces can improve residents'' daily lives.')),
    'meta', jsonb_build_object('provider', 'openai', 'modelLabel', 'phase8-verifier-model', 'inputTokens', 100, 'outputTokens', 200, 'latencyMs', 300)
  )::text;
$$;

create function pg_temp.feedback_signature(run_id uuid, expires_at timestamptz)
returns text language sql security definer set search_path = '' as $$
  select encode(
    extensions.hmac(
      convert_to(
        'writing-feedback-v1:' || run_id::text || ':' || runs.finalize_nonce::text || ':'
          || extract(epoch from expires_at)::bigint::text || ':' || pg_temp.feedback_payload(),
        'UTF8'
      ),
      convert_to(private.writing_signing_secret(), 'UTF8'),
      'sha256'
    ),
    'hex'
  )
  from public.writing_feedback_runs as runs where runs.id = run_id;
$$;

select '1..40';
select case when to_regclass('public.writing_tasks') is not null then 'ok 1 - Writing tasks exist' else 'not ok 1 - Writing tasks missing' end;
select case when to_regclass('public.writing_task_versions') is not null then 'ok 2 - Writing versions exist' else 'not ok 2 - Writing versions missing' end;
select case when to_regclass('public.writing_submissions') is not null then 'ok 3 - Writing submissions exist' else 'not ok 3 - Writing submissions missing' end;
select case when to_regclass('public.writing_feedback_runs') is not null then 'ok 4 - feedback runs exist' else 'not ok 4 - feedback runs missing' end;
select case when to_regclass('public.writing_feedback') is not null then 'ok 5 - validated feedback exists' else 'not ok 5 - validated feedback missing' end;
select case when (select bool_and(relrowsecurity) from pg_catalog.pg_class where oid in ('public.writing_tasks'::regclass, 'public.writing_task_versions'::regclass, 'public.writing_submissions'::regclass, 'public.writing_feedback_runs'::regclass, 'public.writing_feedback'::regclass)) then 'ok 6 - Phase 8 RLS enabled' else 'not ok 6 - Phase 8 RLS disabled' end;
select case when (select count(*) from public.writing_task_versions where id = '82000000-0000-4000-8000-000000000001' and status = 'published') = 1 then 'ok 7 - published Writing seed exists' else 'not ok 7 - published seed mismatch' end;
select case when (select count(*) from public.writing_task_versions where id = '82000000-0000-4000-8000-000000000002' and status = 'draft') = 1 then 'ok 8 - draft fixture exists' else 'not ok 8 - draft fixture mismatch' end;
select case when has_table_privilege('authenticated', 'public.writing_tasks', 'select') and not has_table_privilege('authenticated', 'public.writing_submissions', 'insert') and not has_table_privilege('authenticated', 'public.writing_feedback', 'insert') then 'ok 9 - table grants are read-only' else 'not ok 9 - table grants are unsafe' end;
select case when (select bool_and(prosecdef) from pg_catalog.pg_proc where oid in ('public.start_writing_submission(text,text)'::regprocedure, 'public.save_writing_draft(uuid,text,integer)'::regprocedure, 'public.submit_writing_submission(uuid,text)'::regprocedure, 'public.start_writing_feedback_request(uuid,text,text)'::regprocedure, 'public.finalize_writing_feedback(uuid,text,timestamptz,text)'::regprocedure)) then 'ok 10 - mutation RPCs are hardened' else 'not ok 10 - mutation RPC hardening mismatch' end;

insert into auth.users (id, email, raw_user_meta_data) values
  ('98111111-1111-4111-8111-111111111111', 'phase8-remote-a@example.test', '{"display_name":"Remote Phase 8 A"}'::jsonb),
  ('98222222-2222-4222-8222-222222222222', 'phase8-remote-b@example.test', '{"display_name":"Remote Phase 8 B"}'::jsonb),
  ('98333333-3333-4333-8333-333333333333', 'phase8-remote-gt@example.test', '{"display_name":"Remote Phase 8 GT"}'::jsonb);
insert into public.learner_profiles (user_id, test_type, current_band, target_band, daily_study_minutes, study_days_per_week, priority_skills, primary_goal, onboarding_step, onboarding_completed_at) values
  ('98111111-1111-4111-8111-111111111111', 'academic', 5.0, 7.0, 45, 5, array['writing']::text[], 'study_abroad', 8, now()),
  ('98222222-2222-4222-8222-222222222222', 'academic', 5.0, 6.5, 30, 4, array['writing']::text[], 'work', 8, now()),
  ('98333333-3333-4333-8333-333333333333', 'general_training', 5.0, 6.5, 30, 4, array['writing']::text[], 'work', 8, now());

set local role authenticated;
set local request.jwt.claim.sub = '98111111-1111-4111-8111-111111111111';
select case when (select count(*) from public.writing_tasks) = 1 then 'ok 11 - published Writing task visible' else 'not ok 11 - published task visibility mismatch' end;
select case when (select count(*) from public.writing_task_versions where status = 'draft') = 0 then 'ok 12 - draft Writing content hidden' else 'not ok 12 - draft Writing content leaked' end;

do $$ begin perform public.start_writing_submission('community-green-spaces', 'phase8-remote-start-1'); end $$;
select case when (select count(*) from public.writing_submissions) = 1 then 'ok 13 - start creates one draft' else 'not ok 13 - start failed' end;
do $$ begin perform public.start_writing_submission('community-green-spaces', 'phase8-remote-start-1'); end $$;
select case when (select count(*) from public.writing_submissions) = 1 then 'ok 14 - start is idempotent' else 'not ok 14 - start duplicated' end;
select case when (select expires_at = started_at + interval '2400 seconds' from public.writing_submissions limit 1) then 'ok 15 - timer is database-derived' else 'not ok 15 - timer mismatch' end;
select case when pg_temp.throws_state(format('select public.start_writing_feedback_request(%L::uuid, %L, %L)', (select id from public.writing_submissions limit 1), 'phase8-too-early', 'writing-ai-v1'), '55000') then 'ok 16 - review locked before submit' else 'not ok 16 - pre-submit review allowed' end;

do $$ begin
  perform public.save_writing_draft(
    (select id from public.writing_submissions limit 1),
    'Urban green spaces improve daily life. ' || repeat('Supporting ideas need careful explanation and practical local examples. ', 45),
    0
  );
end $$;
select case when (select server_revision = 1 and word_count > 250 and minimum_words_met from public.writing_submissions limit 1) then 'ok 17 - autosave persists server state' else 'not ok 17 - autosave state mismatch' end;
select case when pg_temp.throws_state(format('select public.save_writing_draft(%L::uuid, %L, 0)', (select id from public.writing_submissions limit 1), 'stale conflict'), '40001') then 'ok 18 - stale autosave rejected' else 'not ok 18 - stale autosave accepted' end;

do $$ begin perform public.submit_writing_submission((select id from public.writing_submissions limit 1), 'phase8-remote-submit-1'); end $$;
select case when (select status = 'submitted' and submitted_text = draft_text and submitted_at is not null from public.writing_submissions limit 1) then 'ok 19 - submit snapshots essay atomically' else 'not ok 19 - submit state mismatch' end;
do $$ begin perform public.submit_writing_submission((select id from public.writing_submissions limit 1), 'phase8-remote-submit-retry'); end $$;
select case when (select count(*) from public.writing_submissions) = 1 then 'ok 20 - submit is idempotent' else 'not ok 20 - submit duplicated state' end;
select case when pg_temp.throws_state(format('select public.save_writing_draft(%L::uuid, %L, 1)', (select id from public.writing_submissions limit 1), 'changed after submit'), '55000') then 'ok 21 - submitted essay immutable' else 'not ok 21 - submitted essay changed' end;
select case when public.get_writing_ai_configuration_state() then 'ok 22 - AI configuration state available' else 'not ok 22 - AI configuration unavailable' end;

do $$ begin perform public.start_writing_feedback_request((select id from public.writing_submissions limit 1), 'phase8-remote-feedback-1', 'writing-ai-v1'); end $$;
select case when (select count(*) from public.writing_feedback_runs where status = 'pending') = 1 then 'ok 23 - feedback request persists pending run' else 'not ok 23 - feedback request missing' end;
select case when pg_temp.throws_state(format('select public.finalize_writing_feedback(%L::uuid, %L, now() + interval ''2 minutes'', %L)', (select id from public.writing_feedback_runs limit 1), pg_temp.feedback_payload(), repeat('0', 64)), '42501') then 'ok 24 - forged feedback denied' else 'not ok 24 - forged feedback accepted' end;
do $$ begin
  perform set_config('phase8.feedback_expires_at', (now() + interval '2 minutes')::text, true);
  perform public.finalize_writing_feedback(
    (select id from public.writing_feedback_runs limit 1),
    pg_temp.feedback_payload(),
    current_setting('phase8.feedback_expires_at')::timestamptz,
    pg_temp.feedback_signature((select id from public.writing_feedback_runs limit 1), current_setting('phase8.feedback_expires_at')::timestamptz)
  );
end $$;
select case when (select count(*) from public.writing_feedback_runs where status = 'ready') = 1 then 'ok 25 - signed feedback finalizes' else 'not ok 25 - signed feedback failed' end;
select case when (select count(*) from public.writing_feedback where overall_band_estimate = 6.5 and confidence = 'medium') = 1 then 'ok 26 - structured feedback stored' else 'not ok 26 - structured feedback mismatch' end;
select case when (select summary like '%not an official IELTS score%' from public.writing_feedback limit 1) then 'ok 27 - feedback disclaimer retained' else 'not ok 27 - feedback disclaimer missing' end;
select case when pg_temp.throws_state('update public.writing_feedback set summary = ''changed''', '42501') then 'ok 28 - learner cannot mutate feedback' else 'not ok 28 - learner changed feedback' end;

set local request.jwt.claim.sub = '98222222-2222-4222-8222-222222222222';
select case when (select count(*) from public.writing_submissions) = 0 then 'ok 29 - user B cannot read user A submission' else 'not ok 29 - submission leaked cross-user' end;
select case when (select count(*) from public.writing_feedback_runs) = 0 then 'ok 30 - user B cannot read user A run' else 'not ok 30 - feedback run leaked cross-user' end;
select case when (select count(*) from public.writing_feedback) = 0 then 'ok 31 - user B cannot read user A feedback' else 'not ok 31 - feedback leaked cross-user' end;

set local request.jwt.claim.sub = '98333333-3333-4333-8333-333333333333';
select case when (select count(*) from public.writing_tasks) = 0 then 'ok 32 - GT learner cannot read Academic task' else 'not ok 32 - Academic task leaked to GT' end;
select case when pg_temp.throws_state($$select public.start_writing_submission('community-green-spaces', 'phase8-remote-gt')$$, 'P0002') then 'ok 33 - GT learner cannot start Academic task' else 'not ok 33 - GT learner started Academic task' end;

reset role;
select case when pg_temp.throws_state($$update public.writing_task_versions set prompt_text = 'Changed' where id = '82000000-0000-4000-8000-000000000001'$$, '55000') then 'ok 34 - published content immutable' else 'not ok 34 - published content changed' end;
select case when not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'writing_feedback' and column_name like '%raw%') then 'ok 35 - raw provider response not stored' else 'not ok 35 - raw provider response column found' end;
select case when (select count(*) from public.writing_task_versions where source_name = 'IELTS Flow original content') = 2 then 'ok 36 - seed provenance is original' else 'not ok 36 - seed provenance mismatch' end;
select case when not has_table_privilege('authenticated', 'public.writing_feedback_runs', 'update') then 'ok 37 - client cannot set feedback status' else 'not ok 37 - client can set feedback status' end;
select case when not has_table_privilege('authenticated', 'public.writing_submissions', 'update') then 'ok 38 - client cannot set submission state' else 'not ok 38 - client can set submission state' end;

set local role anon;
select case when pg_temp.throws_state('select count(*) from public.writing_tasks', '42501') then 'ok 39 - anonymous Writing read denied' else 'not ok 39 - anonymous Writing read allowed' end;
select case when pg_temp.throws_state($$select public.start_writing_submission('community-green-spaces', 'phase8-anon')$$, '42501') then 'ok 40 - anonymous Writing start denied' else 'not ok 40 - anonymous Writing start allowed' end;

reset role;
rollback;

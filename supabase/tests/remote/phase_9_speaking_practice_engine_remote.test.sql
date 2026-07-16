begin;

create function pg_temp.throws_state(command text, expected_state text)
returns boolean language plpgsql as $$
begin execute command; return false;
exception when others then return sqlstate = expected_state;
end $$;

select '1..24';
select case when to_regclass('public.speaking_attempts') is not null then 'ok 1 - Speaking attempts exist' else 'not ok 1 - Speaking attempts missing' end;
select case when to_regclass('public.speaking_audio_assets') is not null then 'ok 2 - audio metadata exists' else 'not ok 2 - audio metadata missing' end;
select case when to_regclass('public.speaking_transcripts') is not null then 'ok 3 - optional transcripts exist' else 'not ok 3 - transcripts missing' end;
select case when to_regclass('public.speaking_feedback') is not null then 'ok 4 - optional feedback exists' else 'not ok 4 - feedback missing' end;
select case when (select bool_and(relrowsecurity) from pg_catalog.pg_class where oid in (
  'public.speaking_sets'::regclass, 'public.speaking_set_versions'::regclass, 'public.speaking_prompts'::regclass,
  'public.speaking_attempts'::regclass, 'public.speaking_responses'::regclass, 'public.speaking_upload_intents'::regclass,
  'public.speaking_audio_assets'::regclass, 'public.speaking_transcripts'::regclass, 'public.speaking_feedback'::regclass
)) then 'ok 5 - Phase 9 RLS enabled' else 'not ok 5 - Phase 9 RLS disabled' end;
select case when (select count(*) from pg_catalog.pg_policies where schemaname = 'storage' and tablename = 'objects'
  and policyname in ('Learners can upload issued speaking recordings', 'Learners can read their own speaking recordings', 'Learners can delete unsubmitted speaking recordings')) = 3
  then 'ok 6 - three scoped Storage policies deployed' else 'not ok 6 - Storage policy deployment mismatch' end;
select case when not has_table_privilege('authenticated', 'public.speaking_attempts', 'insert')
  and not has_table_privilege('authenticated', 'public.speaking_responses', 'update')
  and not has_table_privilege('authenticated', 'public.speaking_transcripts', 'insert')
  then 'ok 7 - client table grants are read-only' else 'not ok 7 - client can author server state' end;
select case when to_regclass('public.speaking_set_versions_one_published_idx') is not null then 'ok 8 - one-published-version guard deployed' else 'not ok 8 - publication guard missing' end;
select case when to_regclass('public.speaking_prompts_version_order_unique') is not null then 'ok 9 - prompt ordering guard deployed' else 'not ok 9 - prompt ordering guard missing' end;
select case when (select bool_and(prosecdef) from pg_catalog.pg_proc where oid in (
  'public.start_speaking_attempt(text,text)'::regprocedure,
  'public.create_speaking_upload_intent(uuid,uuid,text,bigint,numeric,text)'::regprocedure,
  'public.finalize_speaking_upload(uuid,text,bigint,numeric,text,timestamptz,text)'::regprocedure,
  'public.submit_speaking_attempt(uuid,text)'::regprocedure
)) then 'ok 10 - mutation RPCs are security definer' else 'not ok 10 - RPC hardening mismatch' end;

insert into auth.users (id, email, raw_user_meta_data) values
  ('99311111-1111-4111-8111-111111111111', 'phase9-remote-a@example.test', '{"display_name":"Remote Phase 9 A"}'::jsonb),
  ('99322222-2222-4222-8222-222222222222', 'phase9-remote-b@example.test', '{"display_name":"Remote Phase 9 B"}'::jsonb);
insert into public.learner_profiles (user_id, test_type, current_band, target_band, daily_study_minutes,
  study_days_per_week, priority_skills, primary_goal, onboarding_step, onboarding_completed_at) values
  ('99311111-1111-4111-8111-111111111111', 'academic', 5.0, 7.0, 30, 5, array['speaking']::text[], 'study_abroad', 8, now()),
  ('99322222-2222-4222-8222-222222222222', 'academic', 5.0, 7.0, 30, 5, array['speaking']::text[], 'work', 8, now());

set local role authenticated;
set local request.jwt.claim.sub = '99311111-1111-4111-8111-111111111111';
select case when (select count(*) from public.speaking_sets) = 1 then 'ok 11 - actor sees published set' else 'not ok 11 - published visibility mismatch' end;
select case when (select count(*) from public.speaking_set_versions where status = 'draft') = 0 then 'ok 12 - actor cannot read draft' else 'not ok 12 - draft leaked' end;
do $$ begin perform public.start_speaking_attempt('everyday-choices', 'phase9-remote-start'); end $$;
select case when (select count(*) from public.speaking_attempts) = 1 then 'ok 13 - actor starts attempt' else 'not ok 13 - start failed' end;
do $$ begin perform public.start_speaking_attempt('everyday-choices', 'phase9-remote-start'); end $$;
select case when (select count(*) from public.speaking_attempts) = 1 then 'ok 14 - start idempotent' else 'not ok 14 - start duplicated' end;
select case when pg_temp.throws_state(format($$select public.create_speaking_upload_intent(%L::uuid, %L::uuid, 'audio/webm', 200, 20, 'wrong-prompt')$$,
  (select id from public.speaking_attempts limit 1), '91200000-0000-4000-8000-000000000005'), 'P0001')
  then 'ok 15 - draft prompt cannot receive an upload intent' else 'not ok 15 - draft prompt crossed attempt boundary' end;

do $$
declare prompt record; intent jsonb;
begin
  for prompt in select id, display_order from public.speaking_prompts
    where speaking_set_version_id = '91100000-0000-4000-8000-000000000001' order by display_order
  loop
    intent := public.create_speaking_upload_intent((select id from public.speaking_attempts limit 1), prompt.id,
      'audio/webm', 200 + prompt.display_order, 20 + prompt.display_order, 'phase9-remote-upload-' || prompt.display_order);
  end loop;
end $$;
select case when (select count(*) from public.speaking_upload_intents) = 4
  and (select bool_and(storage_path like auth.uid()::text || '/%') from public.speaking_upload_intents)
  then 'ok 16 - four actor-prefixed exact paths issued' else 'not ok 16 - issued path scope mismatch' end;
select case when pg_temp.throws_state(format($$select public.finalize_speaking_upload(%L::uuid, 'audio/webm', 201, 21, %L, now() + interval '2 minutes', %L)$$,
  (select id from public.speaking_upload_intents where idempotency_key = 'phase9-remote-upload-1'), repeat('c',64), repeat('0',64)), 'P0001') then 'ok 17 - unsigned or unconfigured finalization fails closed' else 'not ok 17 - unsafe finalization accepted' end;
select case when pg_temp.throws_state(format($$select public.submit_speaking_attempt(%L::uuid, 'phase9-remote-submit')$$,
  (select id from public.speaking_attempts limit 1)), 'P0001') then 'ok 18 - submit rejects unverified responses' else 'not ok 18 - unverified attempt submitted' end;
select case when pg_temp.throws_state('update public.speaking_attempts set submitted_at = now()', '42501') then 'ok 19 - client cannot mutate attempt state' else 'not ok 19 - attempt state mutable' end;
select case when not has_table_privilege('authenticated', 'public.speaking_feedback_runs', 'insert') then 'ok 20 - client cannot forge feedback run' else 'not ok 20 - feedback run writable' end;

set local request.jwt.claim.sub = '99322222-2222-4222-8222-222222222222';
select case when (select count(*) from public.speaking_attempts) = 0 then 'ok 21 - actor B cannot read actor A attempt' else 'not ok 21 - attempt leaked' end;
select case when (select count(*) from public.speaking_audio_assets) = 0 then 'ok 22 - actor B cannot read actor A audio metadata' else 'not ok 22 - audio metadata leaked' end;
select case when (select count(*) from public.speaking_upload_intents) = 0 then 'ok 23 - actor B cannot read actor A upload intents' else 'not ok 23 - upload intent leaked' end;
select case when (select count(*) from public.speaking_transcripts) = 0 and (select count(*) from public.speaking_feedback) = 0 then 'ok 24 - actor B cannot read transcript or feedback' else 'not ok 24 - AI data leaked' end;

reset role;
rollback;

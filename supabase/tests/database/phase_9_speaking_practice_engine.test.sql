begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

do $$ begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'speaking_pipeline_signing_secret') then
    perform vault.create_secret(repeat('phase9-local-secret-', 3), 'speaking_pipeline_signing_secret', 'Transaction-scoped Phase 9 test secret');
  end if;
end $$;

create function pg_temp.upload_signature(intent_id uuid, mime text, size_bytes bigint, duration numeric, checksum text, expires_at timestamptz)
returns text language sql security definer set search_path = '' as $$
  select private.speaking_upload_expected_signature(
    auth.uid(), intent_id, mime, size_bytes, duration, checksum, expires_at);
$$;
create function pg_temp.transcript_signature(run_id uuid, transcript text, language_code text, expires_at timestamptz)
returns text language sql security definer set search_path = '' as $$
  select encode(extensions.hmac(convert_to(concat_ws('|', 'speaking-transcript-v1', runs.user_id, runs.id,
    encode(extensions.digest(convert_to(transcript, 'UTF8'), 'sha256'), 'hex'), language_code,
    extract(epoch from expires_at)::bigint), 'UTF8'), convert_to(private.speaking_signing_secret(), 'UTF8'), 'sha256'), 'hex')
  from public.speaking_transcript_runs runs where runs.id = run_id;
$$;
create function pg_temp.feedback_payload() returns text language sql immutable as $$
  select jsonb_build_object(
    'estimatedOverallBand', 6.0, 'estimatedFluencyBand', 6.0, 'estimatedLexicalBand', 6.0,
    'estimatedGrammarBand', 5.5, 'estimatedPronunciationBand', null,
    'pronunciationScope', 'transcript_only', 'confidence', 'low',
    'summary', 'Practice feedback based on transcripts only.',
    'criteria', jsonb_build_object('fluency', 'The response develops a relevant idea.'),
    'strengths', jsonb_build_array('The answer addresses the prompt.'),
    'suggestions', jsonb_build_array('Add one specific supporting example.')
  )::text;
$$;
create function pg_temp.feedback_signature(run_id uuid, payload text, expires_at timestamptz)
returns text language sql security definer set search_path = '' as $$
  select encode(extensions.hmac(convert_to(concat_ws('|', 'speaking-feedback-v1', runs.user_id, runs.id,
    encode(extensions.digest(convert_to(payload, 'UTF8'), 'sha256'), 'hex'),
    extract(epoch from expires_at)::bigint), 'UTF8'), convert_to(private.speaking_signing_secret(), 'UTF8'), 'sha256'), 'hex')
  from public.speaking_feedback_runs runs where runs.id = run_id;
$$;

select extensions.has_table('public', 'speaking_attempts', 'Speaking attempts exist');
select extensions.has_table('public', 'speaking_audio_assets', 'Speaking audio metadata exists');
select extensions.has_table('public', 'speaking_transcripts', 'Optional transcripts exist');
select extensions.has_table('public', 'speaking_feedback', 'Optional feedback exists');
select extensions.ok((select bool_and(relrowsecurity) from pg_catalog.pg_class where oid in (
  'public.speaking_sets'::regclass, 'public.speaking_set_versions'::regclass, 'public.speaking_prompts'::regclass,
  'public.speaking_attempts'::regclass, 'public.speaking_responses'::regclass, 'public.speaking_upload_intents'::regclass,
  'public.speaking_audio_assets'::regclass, 'public.speaking_transcript_runs'::regclass,
  'public.speaking_transcripts'::regclass, 'public.speaking_feedback_runs'::regclass, 'public.speaking_feedback'::regclass
)), 'RLS is enabled on every Phase 9 public table');
select extensions.ok((select not public and file_size_limit = 15728640 and allowed_mime_types @> array['audio/webm']::text[]
  from storage.buckets where id = 'speaking-recordings'), 'Speaking bucket is private and constrained');
select extensions.ok(not has_table_privilege('authenticated', 'public.speaking_attempts', 'insert')
  and not has_table_privilege('authenticated', 'public.speaking_responses', 'update')
  and not has_table_privilege('authenticated', 'public.speaking_transcripts', 'insert')
  and not has_table_privilege('authenticated', 'public.speaking_feedback', 'insert'),
  'Client cannot author server-owned Speaking fields directly');
select extensions.results_eq($$select count(*)::integer from public.speaking_set_versions where status = 'published'$$, array[1], 'seed has one original published set');
select extensions.results_eq($$select count(*)::integer from public.speaking_set_versions where status = 'draft'$$, array[1], 'seed has one draft visibility fixture');

insert into auth.users (id, email, raw_user_meta_data) values
  ('99111111-1111-4111-8111-111111111111', 'phase9-a@example.test', '{"display_name":"Phase 9 A"}'::jsonb),
  ('99222222-2222-4222-8222-222222222222', 'phase9-b@example.test', '{"display_name":"Phase 9 B"}'::jsonb);
insert into public.learner_profiles (user_id, test_type, current_band, target_band, daily_study_minutes,
  study_days_per_week, priority_skills, primary_goal, onboarding_step, onboarding_completed_at) values
  ('99111111-1111-4111-8111-111111111111', 'academic', 5.0, 7.0, 30, 5, array['speaking']::text[], 'study_abroad', 8, now()),
  ('99222222-2222-4222-8222-222222222222', 'academic', 5.5, 7.0, 30, 4, array['speaking']::text[], 'work', 8, now());

set local role authenticated;
set local request.jwt.claim.sub = '99111111-1111-4111-8111-111111111111';
select extensions.results_eq($$select count(*)::integer from public.speaking_sets$$, array[1], 'Actor A sees only the published Speaking set');
select extensions.results_eq($$select count(*)::integer from public.speaking_set_versions where status = 'draft'$$, array[0], 'Actor A cannot read draft Speaking content');
select extensions.lives_ok($$select public.start_speaking_attempt('everyday-choices', 'phase9-start-a')$$, 'Actor A starts a published set');
select extensions.lives_ok($$select public.start_speaking_attempt('everyday-choices', 'phase9-start-a')$$, 'Speaking start is idempotent');
select extensions.results_eq($$select count(*)::integer from public.speaking_attempts$$, array[1], 'Idempotent start creates one attempt');

select extensions.throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id) values ('speaking-recordings', '99111111-1111-4111-8111-111111111111/unissued.webm', '99111111-1111-4111-8111-111111111111')$$,
  '42501', 'new row violates row-level security policy for table "objects"', 'Actor cannot upload without a database-issued path');

do $$
declare prompt record; intent jsonb; expires_at timestamptz; checksum text := repeat('a', 64);
begin
  for prompt in select id, display_order from public.speaking_prompts
    where speaking_set_version_id = '91100000-0000-4000-8000-000000000001' order by display_order
  loop
    intent := public.create_speaking_upload_intent(
      (select id from public.speaking_attempts limit 1), prompt.id, 'audio/webm', 100 + prompt.display_order,
      10 + prompt.display_order, 'phase9-upload-' || prompt.display_order
    );
    insert into storage.objects (bucket_id, name, owner_id)
    values ('speaking-recordings', intent->>'storagePath', auth.uid()::text);
    if prompt.display_order = 1 then
      begin
        perform public.finalize_speaking_upload((intent->>'intentId')::uuid, 'audio/webm', 101, 11,
          checksum, now() + interval '2 minutes', repeat('0', 64));
        raise exception 'forged signature was accepted';
      exception when others then
        if sqlerrm not like 'Invalid verification signature%' then raise; end if;
      end;
    end if;
    expires_at := now() + interval '2 minutes';
    perform public.finalize_speaking_upload((intent->>'intentId')::uuid, 'audio/webm', 100 + prompt.display_order,
      10 + prompt.display_order, checksum, expires_at,
      pg_temp.upload_signature((intent->>'intentId')::uuid, 'audio/webm', 100 + prompt.display_order,
        10 + prompt.display_order, checksum, expires_at));
  end loop;
end $$;
select extensions.results_eq($$select count(*)::integer from public.speaking_audio_assets where status = 'ready'$$, array[4], 'Four actor-owned audio objects finalize with server signatures');
select extensions.lives_ok($$select public.submit_speaking_attempt((select id from public.speaking_attempts limit 1), 'phase9-submit-a')$$, 'Actor submits after every required response is verified');
select extensions.ok((select status = 'submitted' and submitted_at is not null from public.speaking_attempts limit 1), 'PostgreSQL owns submitted status and timestamp');
select extensions.throws_ok($$update public.speaking_attempts set submitted_at = now() + interval '1 minute'$$,
  '42501', 'permission denied for table speaking_attempts', 'Client cannot mutate submitted attempt');
select extensions.throws_ok($$delete from storage.objects where bucket_id = 'speaking-recordings'$$,
  '42501', 'Direct deletion from storage tables is not allowed. Use the Storage API instead.',
  'Direct SQL deletion of submitted audio is blocked');
select extensions.results_eq($$select count(*)::integer from storage.objects where bucket_id = 'speaking-recordings'$$,
  array[4], 'Submitted audio cannot be deleted by learner');

do $$
declare response record; run jsonb; expires_at timestamptz; transcript text;
begin
  for response in select id from public.speaking_responses order by created_at loop
    run := public.start_speaking_transcript_request(response.id, 'phase9-transcript-' || response.id, 'speaking-ai-v1', 'test-provider', 'test-model');
    transcript := 'This is a real provider fixture for response ' || response.id || '.';
    expires_at := now() + interval '2 minutes';
    perform public.finalize_speaking_transcript((run->>'runId')::uuid, transcript, 'en', expires_at,
      pg_temp.transcript_signature((run->>'runId')::uuid, transcript, 'en', expires_at));
  end loop;
end $$;
select extensions.results_eq($$select count(*)::integer from public.speaking_transcripts$$, array[4], 'Optional transcript finalizers persist provider text only');
select set_config('phase9.bundle_checksum', repeat('b', 64), true);
select extensions.lives_ok(format($$select public.start_speaking_feedback_request(%L::uuid, 'phase9-feedback-a', 'speaking-ai-v1', 'test-provider', 'test-model', %L)$$,
  (select id from public.speaking_attempts limit 1), current_setting('phase9.bundle_checksum')), 'Feedback starts only after every transcript is ready');
select extensions.throws_ok(format($$select public.finalize_speaking_feedback(%L::uuid, %L, now() + interval '2 minutes', %L)$$,
  (select id from public.speaking_feedback_runs limit 1), pg_temp.feedback_payload(), repeat('0', 64)),
  'P0001', 'Invalid feedback signature', 'Actor cannot forge AI feedback');
select set_config('phase9.feedback_expires', (now() + interval '2 minutes')::text, true);
select extensions.lives_ok(format($$select public.finalize_speaking_feedback(%L::uuid, %L, %L::timestamptz, %L)$$,
  (select id from public.speaking_feedback_runs limit 1), pg_temp.feedback_payload(), current_setting('phase9.feedback_expires'),
  pg_temp.feedback_signature((select id from public.speaking_feedback_runs limit 1), pg_temp.feedback_payload(), current_setting('phase9.feedback_expires')::timestamptz)),
  'Valid server-signed optional feedback finalizes');
select extensions.ok((select disclaimer = 'AI practice feedback only - not an official IELTS score.' and estimated_pronunciation_band is null
  from public.speaking_feedback limit 1), 'Feedback is non-official and does not invent pronunciation scoring');

set local request.jwt.claim.sub = '99222222-2222-4222-8222-222222222222';
select extensions.results_eq($$select count(*)::integer from public.speaking_attempts$$, array[0], 'Actor B cannot read Actor A attempt');
select extensions.results_eq($$select count(*)::integer from public.speaking_audio_assets$$, array[0], 'Actor B cannot read Actor A audio metadata');
select extensions.results_eq($$select count(*)::integer from public.speaking_transcripts$$, array[0], 'Actor B cannot read Actor A transcripts');
select extensions.results_eq($$select count(*)::integer from public.speaking_feedback$$, array[0], 'Actor B cannot read Actor A feedback');
select extensions.results_eq($$select count(*)::integer from storage.objects where bucket_id = 'speaking-recordings'$$, array[0], 'Actor B cannot read Actor A private objects');

reset role;
set local role anon;
select extensions.throws_ok($$select count(*) from public.speaking_sets$$, '42501', 'permission denied for table speaking_sets', 'Anonymous Speaking read is denied');
select extensions.throws_ok($$select public.start_speaking_attempt('everyday-choices', 'anon-start')$$, '42501', 'permission denied for function start_speaking_attempt', 'Anonymous Speaking mutation is denied');
reset role;

select extensions.finish();
rollback;

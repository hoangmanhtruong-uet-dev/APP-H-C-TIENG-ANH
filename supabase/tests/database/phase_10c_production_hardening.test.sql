begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(17);

select extensions.has_column(
  'public', 'speaking_audio_assets', 'deleted_at',
  'Speaking audio records track completed deletion'
);
select extensions.has_column(
  'public', 'speaking_audio_assets', 'cleanup_started_at',
  'Audio cleanup uses a retryable server lease'
);
select extensions.has_column(
  'public', 'speaking_upload_intents', 'storage_deleted_at',
  'Expired upload paths track completed Storage deletion'
);
select extensions.col_not_null(
  'public', 'speaking_audio_assets', 'retention_until',
  'Every Speaking audio record has a retention deadline'
);
select extensions.has_index(
  'public', 'speaking_audio_assets', 'speaking_audio_assets_retention_cleanup_idx',
  'Retention cleanup has a targeted partial index'
);
select extensions.has_index(
  'public', 'speaking_upload_intents', 'speaking_upload_intents_expired_cleanup_idx',
  'Expired upload cleanup has a targeted partial index'
);
select extensions.has_index(
  'public', 'speaking_transcript_runs', 'speaking_transcript_runs_user_recent_idx',
  'Transcript quota checks have a user-time index'
);
select extensions.ok(
  exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.speaking_audio_assets'::regclass
      and conname = 'speaking_audio_assets_retention_check'
      and contype = 'c'
  ),
  'Audio retention cannot predate creation'
);
select extensions.ok(
  exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.speaking_audio_assets'::regclass
      and conname = 'speaking_audio_assets_deleted_state_check'
      and contype = 'c'
  ),
  'Deleted state and deletion timestamp stay consistent'
);
select extensions.is_empty(
  $$select id from public.speaking_audio_assets where retention_until is null$$,
  'Existing audio metadata received a retention deadline'
);
select extensions.ok(
  position('pg_advisory_xact_lock' in pg_get_functiondef(
    'public.start_speaking_transcript_request(uuid,text,text,text,text)'::regprocedure
  )) > 0,
  'Transcript quota reservation is serialized per learner'
);
select extensions.ok(
  position($needle$interval '7 days'$needle$ in pg_get_functiondef(
    'public.start_speaking_feedback_request(uuid,text,text,text,text,text)'::regprocedure
  )) > 0,
  'Feedback requests enforce a rolling weekly quota'
);
select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.start_speaking_transcript_request(uuid,text,text,text,text)',
    'execute'
  ),
  'Anonymous callers cannot start transcript work'
);
select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.start_speaking_transcript_request(uuid,text,text,text,text)',
    'execute'
  ),
  'Authenticated learners retain the transcript RPC grant'
);
select extensions.ok(
  has_function_privilege('service_role', 'public.claim_speaking_audio_cleanup(integer)', 'execute')
    and not has_function_privilege('authenticated', 'public.claim_speaking_audio_cleanup(integer)', 'execute')
    and not has_function_privilege('anon', 'public.claim_speaking_audio_cleanup(integer)', 'execute'),
  'Only the server service role can claim audio cleanup work'
);
select extensions.ok(
  not has_table_privilege('anon', 'public.speaking_audio_assets', 'select')
    and not has_table_privilege('authenticated', 'public.speaking_audio_assets', 'update')
    and not has_table_privilege('authenticated', 'public.speaking_audio_assets', 'delete'),
  'Audio retention and deletion metadata remain server-owned'
);
select extensions.ok(
  pg_catalog.to_regprocedure('public.rls_auto_enable()') is null
    or (
      not has_function_privilege('anon', 'public.rls_auto_enable()', 'execute')
      and not has_function_privilege('authenticated', 'public.rls_auto_enable()', 'execute')
    ),
  'The platform RLS event-trigger helper is not exposed as a client RPC'
);

select * from extensions.finish();
rollback;

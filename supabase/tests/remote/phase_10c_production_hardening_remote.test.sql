begin;

create extension if not exists pgtap with schema extensions;
create temporary table phase_10c_tap_output (
  sequence bigint generated always as identity,
  line text not null
) on commit drop;

insert into phase_10c_tap_output (line) select extensions.plan(12);
insert into phase_10c_tap_output (line)
select extensions.has_column('public', 'speaking_audio_assets', 'deleted_at', 'Remote schema tracks audio deletion');
insert into phase_10c_tap_output (line)
select extensions.has_column('public', 'speaking_audio_assets', 'cleanup_started_at', 'Remote cleanup uses a lease');
insert into phase_10c_tap_output (line)
select extensions.has_column('public', 'speaking_upload_intents', 'storage_deleted_at', 'Remote expired paths track deletion');
insert into phase_10c_tap_output (line)
select extensions.col_not_null('public', 'speaking_audio_assets', 'retention_until', 'Remote audio retention is mandatory');
insert into phase_10c_tap_output (line)
select extensions.has_index(
  'public', 'speaking_audio_assets', 'speaking_audio_assets_retention_cleanup_idx',
  'Remote cleanup index exists'
);
insert into phase_10c_tap_output (line)
select extensions.has_index(
  'public', 'speaking_upload_intents', 'speaking_upload_intents_expired_cleanup_idx',
  'Remote expired upload cleanup index exists'
);
insert into phase_10c_tap_output (line)
select extensions.has_index(
  'public', 'speaking_transcript_runs', 'speaking_transcript_runs_user_recent_idx',
  'Remote transcript quota index exists'
);
insert into phase_10c_tap_output (line)
select extensions.ok(
  position('pg_advisory_xact_lock' in pg_get_functiondef(
    'public.start_speaking_transcript_request(uuid,text,text,text,text)'::regprocedure
  )) > 0,
  'Remote transcript requests use a serialized quota reservation'
);
insert into phase_10c_tap_output (line)
select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.start_speaking_feedback_request(uuid,text,text,text,text,text)',
    'execute'
  ),
  'Remote anonymous callers cannot start feedback work'
);
insert into phase_10c_tap_output (line)
select extensions.ok(
  not has_table_privilege('authenticated', 'public.speaking_audio_assets', 'update')
    and not has_table_privilege('authenticated', 'public.speaking_audio_assets', 'delete'),
  'Remote audio lifecycle metadata stays server-owned'
);
insert into phase_10c_tap_output (line)
select extensions.is_empty(
  $$select id from public.speaking_audio_assets where retention_until is null$$,
  'Remote audio metadata has no missing retention deadline'
);
insert into phase_10c_tap_output (line)
select extensions.ok(
  pg_catalog.to_regprocedure('public.rls_auto_enable()') is null
    or (
      not has_function_privilege('anon', 'public.rls_auto_enable()', 'execute')
      and not has_function_privilege('authenticated', 'public.rls_auto_enable()', 'execute')
    ),
  'Remote RLS event-trigger helper is not exposed as a client RPC'
);
insert into phase_10c_tap_output (line) select * from extensions.finish();

select line as tap from phase_10c_tap_output order by sequence;
rollback;

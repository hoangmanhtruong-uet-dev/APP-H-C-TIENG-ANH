alter table public.speaking_audio_assets
  add column deleted_at timestamptz,
  add column cleanup_started_at timestamptz;

alter table public.speaking_upload_intents
  add column storage_deleted_at timestamptz;

alter table public.speaking_audio_assets
  alter column retention_until set default (now() + interval '30 days');

update public.speaking_audio_assets
set retention_until = created_at + interval '30 days'
where retention_until is null;

alter table public.speaking_audio_assets
  alter column retention_until set not null,
  drop constraint speaking_audio_assets_status_check,
  add constraint speaking_audio_assets_status_check
    check (status in ('ready', 'orphaned', 'cleanup_pending', 'deleted')),
  add constraint speaking_audio_assets_retention_check
    check (retention_until >= created_at),
  add constraint speaking_audio_assets_deleted_state_check
    check ((status = 'deleted') = (deleted_at is not null)),
  add constraint speaking_audio_assets_cleanup_state_check
    check ((status = 'cleanup_pending') = (cleanup_started_at is not null));

create index speaking_audio_assets_retention_cleanup_idx
on public.speaking_audio_assets (retention_until, id)
where status in ('ready', 'orphaned', 'cleanup_pending');

create index speaking_upload_intents_expired_cleanup_idx
on public.speaking_upload_intents (expires_at, id)
where status = 'expired' and storage_deleted_at is null;

create or replace function public.claim_speaking_audio_cleanup(p_batch_size integer default 100)
returns table (id uuid, storage_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select assets.id
    from public.speaking_audio_assets assets
    where (
      assets.status = 'orphaned'
      or (assets.status = 'ready' and assets.retention_until <= now())
      or (
        assets.status = 'cleanup_pending'
        and assets.cleanup_started_at <= now() - interval '15 minutes'
      )
    )
    order by assets.retention_until, assets.id
    for update skip locked
    limit least(greatest(p_batch_size, 1), 100)
  )
  update public.speaking_audio_assets assets
  set status = 'cleanup_pending', cleanup_started_at = now()
  from candidates
  where assets.id = candidates.id
  returning assets.id, assets.storage_path;
end;
$$;

create or replace function public.start_speaking_transcript_request(
  p_response_id uuid, p_idempotency_key text, p_consent_version text, p_provider text, p_model text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_response public.speaking_responses; target_attempt public.speaking_attempts;
  target_asset public.speaking_audio_assets; target_run public.speaking_transcript_runs;
  previous_count integer; weekly_used integer; burst_used integer;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if nullif(private.speaking_signing_secret(), '') is null then raise exception 'Speaking AI is not configured'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200
    or p_consent_version <> 'speaking-ai-v1' then raise exception 'Invalid transcript request'; end if;
  select * into target_response from public.speaking_responses where id = p_response_id and user_id = actor_id;
  if not found or target_response.submitted_at is null then raise exception 'Only submitted responses can be transcribed'; end if;
  select * into target_attempt from public.speaking_attempts where id = target_response.attempt_id and user_id = actor_id;
  if target_attempt.status <> 'submitted' then raise exception 'Only submitted attempts can be transcribed'; end if;
  select * into target_asset from public.speaking_audio_assets where id = target_response.audio_asset_id and status = 'ready';
  if not found then raise exception 'Verified audio is unavailable'; end if;
  select * into target_run from public.speaking_transcript_runs where user_id = actor_id and request_idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('runId', target_run.id, 'bucketId', target_asset.bucket_id, 'storagePath', target_asset.storage_path); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_id::text || ':speaking-transcript', 0));
  select count(*) into previous_count from public.speaking_transcript_runs where response_id = target_response.id;
  if previous_count >= 2 then raise exception 'Transcript retry limit reached'; end if;
  select count(*) into weekly_used from public.speaking_transcript_runs
  where user_id = actor_id and requested_at >= now() - interval '7 days';
  if weekly_used >= 20 then raise exception 'Speaking transcript weekly quota reached'; end if;
  select count(*) into burst_used from public.speaking_transcript_runs
  where user_id = actor_id and requested_at >= now() - interval '1 minute';
  if burst_used >= 5 then raise exception 'Speaking transcript rate limit reached'; end if;
  update public.speaking_transcript_runs set status = 'failed', completed_at = now(), error_code = 'lease_expired'
  where response_id = target_response.id and status = 'pending' and lease_expires_at <= now();
  if exists (select 1 from public.speaking_transcript_runs where response_id = target_response.id and status in ('pending', 'ready')) then
    raise exception 'Transcript already exists or is being prepared';
  end if;
  insert into public.speaking_transcript_runs (
    user_id, response_id, provider, model, request_idempotency_key, audio_checksum,
    consent_version, attempt_number, lease_expires_at
  ) values (actor_id, target_response.id, left(p_provider, 80), left(p_model, 120), p_idempotency_key,
    target_asset.sha256_checksum, p_consent_version, previous_count + 1, now() + interval '2 minutes')
  returning * into target_run;
  return jsonb_build_object('runId', target_run.id, 'bucketId', target_asset.bucket_id, 'storagePath', target_asset.storage_path);
end; $$;

create or replace function public.start_speaking_feedback_request(
  p_attempt_id uuid, p_idempotency_key text, p_consent_version text, p_provider text, p_model text,
  p_transcript_bundle_checksum text
) returns public.speaking_feedback_runs language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_attempt public.speaking_attempts; target_run public.speaking_feedback_runs;
  previous_count integer; weekly_used integer; burst_used integer;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if nullif(private.speaking_signing_secret(), '') is null then raise exception 'Speaking AI is not configured'; end if;
  if p_consent_version <> 'speaking-ai-v1' or p_transcript_bundle_checksum !~ '^[0-9a-f]{64}$'
    or p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then
    raise exception 'Invalid feedback request';
  end if;
  select * into target_attempt from public.speaking_attempts where id = p_attempt_id and user_id = actor_id;
  if not found or target_attempt.status <> 'submitted' then raise exception 'Only submitted attempts can receive feedback'; end if;
  if exists (
    select 1 from public.speaking_responses responses where responses.attempt_id = target_attempt.id
    and not exists (select 1 from public.speaking_transcripts transcripts where transcripts.response_id = responses.id)
  ) then raise exception 'Transcripts are not ready for every response'; end if;
  select * into target_run from public.speaking_feedback_runs where user_id = actor_id and request_idempotency_key = p_idempotency_key;
  if found then return target_run; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_id::text || ':speaking-feedback', 0));
  select count(*) into previous_count from public.speaking_feedback_runs where attempt_id = target_attempt.id;
  if previous_count >= 2 then raise exception 'Feedback retry limit reached'; end if;
  select count(*) into weekly_used from public.speaking_feedback_runs
  where user_id = actor_id and requested_at >= now() - interval '7 days';
  if weekly_used >= 5 then raise exception 'Speaking feedback weekly quota reached'; end if;
  select count(*) into burst_used from public.speaking_feedback_runs
  where user_id = actor_id and requested_at >= now() - interval '1 minute';
  if burst_used >= 2 then raise exception 'Speaking feedback rate limit reached'; end if;
  update public.speaking_feedback_runs set status = 'failed', completed_at = now(), error_code = 'lease_expired'
  where attempt_id = target_attempt.id and status = 'pending' and lease_expires_at <= now();
  if exists (select 1 from public.speaking_feedback_runs where attempt_id = target_attempt.id and status in ('pending', 'ready')) then
    raise exception 'Feedback already exists or is being prepared';
  end if;
  insert into public.speaking_feedback_runs (
    user_id, attempt_id, provider, model, request_idempotency_key, transcript_bundle_checksum,
    rubric_version, prompt_version, consent_version, attempt_number, lease_expires_at
  ) values (actor_id, target_attempt.id, left(p_provider, 80), left(p_model, 120), p_idempotency_key,
    p_transcript_bundle_checksum, 'speaking-practice-v1', 'speaking-feedback-v1', p_consent_version,
    previous_count + 1, now() + interval '2 minutes') returning * into target_run;
  return target_run;
end; $$;

revoke all on function public.start_speaking_transcript_request(uuid, text, text, text, text),
  public.start_speaking_feedback_request(uuid, text, text, text, text, text),
  public.claim_speaking_audio_cleanup(integer) from public, anon, authenticated;
grant execute on function public.start_speaking_transcript_request(uuid, text, text, text, text),
  public.start_speaking_feedback_request(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.claim_speaking_audio_cleanup(integer) to service_role;

comment on column public.speaking_audio_assets.retention_until is
  'Private recording deletion deadline. Production cleanup removes the Storage object before marking metadata deleted.';
comment on column public.speaking_audio_assets.deleted_at is
  'Timestamp set only after the private Storage object has been removed by the authenticated cleanup job.';
comment on column public.speaking_audio_assets.cleanup_started_at is
  'Server-only cleanup lease timestamp. Stale leases become retryable after 15 minutes.';
comment on column public.speaking_upload_intents.storage_deleted_at is
  'Timestamp set after an expired upload path has been removed from private Storage.';

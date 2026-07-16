create table public.speaking_transcript_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  response_id uuid not null,
  status text not null default 'pending',
  provider text not null,
  model text not null,
  request_idempotency_key text not null,
  audio_checksum text not null,
  consent_version text not null,
  attempt_number smallint not null default 1,
  requested_at timestamptz not null default now(),
  lease_expires_at timestamptz not null,
  completed_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_transcript_runs_response_owner_fkey foreign key (response_id, user_id)
    references public.speaking_responses (id, user_id) on delete restrict,
  constraint speaking_transcript_runs_id_response_user_unique unique (id, response_id, user_id),
  constraint speaking_transcript_runs_status_check check (status in ('pending', 'ready', 'failed')),
  constraint speaking_transcript_runs_provider_check check (btrim(provider) <> '' and char_length(provider) <= 80),
  constraint speaking_transcript_runs_model_check check (btrim(model) <> '' and char_length(model) <= 120),
  constraint speaking_transcript_runs_key_check check (btrim(request_idempotency_key) <> '' and char_length(request_idempotency_key) <= 200),
  constraint speaking_transcript_runs_checksum_check check (audio_checksum ~ '^[0-9a-f]{64}$'),
  constraint speaking_transcript_runs_consent_check check (btrim(consent_version) <> '' and char_length(consent_version) <= 80),
  constraint speaking_transcript_runs_attempt_check check (attempt_number between 1 and 2),
  constraint speaking_transcript_runs_lease_check check (lease_expires_at > requested_at),
  constraint speaking_transcript_runs_state_check check (
    (status = 'pending' and completed_at is null and error_code is null)
    or (status = 'ready' and completed_at is not null and error_code is null)
    or (status = 'failed' and completed_at is not null and error_code is not null)
  ),
  constraint speaking_transcript_runs_user_key_unique unique (user_id, request_idempotency_key)
);
create unique index speaking_transcript_runs_one_ready_idx on public.speaking_transcript_runs (response_id) where status = 'ready';
create unique index speaking_transcript_runs_one_pending_idx on public.speaking_transcript_runs (response_id) where status = 'pending';
create index speaking_transcript_runs_user_recent_idx on public.speaking_transcript_runs (user_id, requested_at desc);

create table public.speaking_transcripts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique,
  user_id uuid not null,
  response_id uuid not null,
  transcript_text text not null,
  language_code text,
  created_at timestamptz not null default now(),
  constraint speaking_transcripts_run_scope_fkey foreign key (run_id, response_id, user_id)
    references public.speaking_transcript_runs (id, response_id, user_id) on delete restrict,
  constraint speaking_transcripts_text_check check (btrim(transcript_text) <> '' and char_length(transcript_text) <= 20000),
  constraint speaking_transcripts_language_check check (language_code is null or language_code ~ '^[a-z]{2,3}(?:-[A-Z]{2})?$')
);
create index speaking_transcripts_response_idx on public.speaking_transcripts (response_id);
create index speaking_transcripts_user_recent_idx on public.speaking_transcripts (user_id, created_at desc);

create table public.speaking_feedback_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  attempt_id uuid not null,
  status text not null default 'pending',
  provider text not null,
  model text not null,
  request_idempotency_key text not null,
  transcript_bundle_checksum text not null,
  rubric_version text not null,
  prompt_version text not null,
  consent_version text not null,
  attempt_number smallint not null default 1,
  requested_at timestamptz not null default now(),
  lease_expires_at timestamptz not null,
  completed_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_feedback_runs_attempt_owner_fkey foreign key (attempt_id, user_id)
    references public.speaking_attempts (id, user_id) on delete restrict,
  constraint speaking_feedback_runs_id_attempt_user_unique unique (id, attempt_id, user_id),
  constraint speaking_feedback_runs_status_check check (status in ('pending', 'ready', 'failed')),
  constraint speaking_feedback_runs_text_check check (
    btrim(provider) <> '' and char_length(provider) <= 80 and btrim(model) <> '' and char_length(model) <= 120
    and btrim(rubric_version) <> '' and char_length(rubric_version) <= 80
    and btrim(prompt_version) <> '' and char_length(prompt_version) <= 80
    and btrim(consent_version) <> '' and char_length(consent_version) <= 80
  ),
  constraint speaking_feedback_runs_key_check check (btrim(request_idempotency_key) <> '' and char_length(request_idempotency_key) <= 200),
  constraint speaking_feedback_runs_checksum_check check (transcript_bundle_checksum ~ '^[0-9a-f]{64}$'),
  constraint speaking_feedback_runs_attempt_check check (attempt_number between 1 and 2),
  constraint speaking_feedback_runs_lease_check check (lease_expires_at > requested_at),
  constraint speaking_feedback_runs_state_check check (
    (status = 'pending' and completed_at is null and error_code is null)
    or (status = 'ready' and completed_at is not null and error_code is null)
    or (status = 'failed' and completed_at is not null and error_code is not null)
  ),
  constraint speaking_feedback_runs_user_key_unique unique (user_id, request_idempotency_key)
);
create unique index speaking_feedback_runs_one_ready_idx on public.speaking_feedback_runs (attempt_id) where status = 'ready';
create unique index speaking_feedback_runs_one_pending_idx on public.speaking_feedback_runs (attempt_id) where status = 'pending';
create index speaking_feedback_runs_user_recent_idx on public.speaking_feedback_runs (user_id, requested_at desc);

create table public.speaking_feedback (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique,
  user_id uuid not null,
  attempt_id uuid not null,
  estimated_overall_band numeric(2,1),
  estimated_fluency_band numeric(2,1),
  estimated_lexical_band numeric(2,1),
  estimated_grammar_band numeric(2,1),
  estimated_pronunciation_band numeric(2,1),
  pronunciation_scope text not null,
  confidence text not null,
  summary text not null,
  criteria jsonb not null,
  strengths jsonb not null,
  suggestions jsonb not null,
  disclaimer text not null,
  created_at timestamptz not null default now(),
  constraint speaking_feedback_run_scope_fkey foreign key (run_id, attempt_id, user_id)
    references public.speaking_feedback_runs (id, attempt_id, user_id) on delete restrict,
  constraint speaking_feedback_band_check check (
    private.valid_writing_band(estimated_overall_band) and private.valid_writing_band(estimated_fluency_band)
    and private.valid_writing_band(estimated_lexical_band) and private.valid_writing_band(estimated_grammar_band)
    and private.valid_writing_band(estimated_pronunciation_band)
  ),
  constraint speaking_feedback_pronunciation_scope_check check (pronunciation_scope in ('audio_available', 'transcript_only')),
  constraint speaking_feedback_confidence_check check (confidence in ('low', 'medium', 'high')),
  constraint speaking_feedback_summary_check check (btrim(summary) <> '' and char_length(summary) <= 3000),
  constraint speaking_feedback_json_check check (
    jsonb_typeof(criteria) = 'object' and jsonb_typeof(strengths) = 'array' and jsonb_typeof(suggestions) = 'array'
    and jsonb_array_length(strengths) between 1 and 8 and jsonb_array_length(suggestions) between 1 and 8
  ),
  constraint speaking_feedback_disclaimer_check check (
    disclaimer = 'AI practice feedback only - not an official IELTS score.'
  )
);
create index speaking_feedback_attempt_idx on public.speaking_feedback (attempt_id);
create index speaking_feedback_user_recent_idx on public.speaking_feedback (user_id, created_at desc);

create trigger speaking_transcript_runs_set_updated_at before update on public.speaking_transcript_runs
for each row execute function public.set_profile_updated_at();
create trigger speaking_feedback_runs_set_updated_at before update on public.speaking_feedback_runs
for each row execute function public.set_profile_updated_at();

create function public.protect_speaking_transcript()
returns trigger language plpgsql set search_path = '' as $$ begin
  raise exception 'Speaking transcripts are immutable';
end; $$;
create trigger protect_speaking_transcript before update or delete on public.speaking_transcripts
for each row execute function public.protect_speaking_transcript();
create function public.protect_speaking_feedback()
returns trigger language plpgsql set search_path = '' as $$ begin
  raise exception 'Speaking feedback is immutable';
end; $$;
create trigger protect_speaking_feedback before update or delete on public.speaking_feedback
for each row execute function public.protect_speaking_feedback();

alter table public.speaking_transcript_runs enable row level security;
alter table public.speaking_transcripts enable row level security;
alter table public.speaking_feedback_runs enable row level security;
alter table public.speaking_feedback enable row level security;
revoke all on table public.speaking_transcript_runs, public.speaking_transcripts,
  public.speaking_feedback_runs, public.speaking_feedback from anon, authenticated;
grant select on table public.speaking_transcript_runs, public.speaking_transcripts,
  public.speaking_feedback_runs, public.speaking_feedback to authenticated;
create policy "Learners can read their own speaking transcript runs" on public.speaking_transcript_runs
for select to authenticated using (user_id = (select auth.uid()));
create policy "Learners can read their own speaking transcripts" on public.speaking_transcripts
for select to authenticated using (user_id = (select auth.uid()));
create policy "Learners can read their own speaking feedback runs" on public.speaking_feedback_runs
for select to authenticated using (user_id = (select auth.uid()));
create policy "Learners can read their own speaking feedback" on public.speaking_feedback
for select to authenticated using (user_id = (select auth.uid()));

create function public.start_speaking_transcript_request(
  p_response_id uuid, p_idempotency_key text, p_consent_version text, p_provider text, p_model text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_response public.speaking_responses; target_attempt public.speaking_attempts;
  target_asset public.speaking_audio_assets; target_run public.speaking_transcript_runs; previous_count integer;
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
  select * into target_run from public.speaking_transcript_runs where user_id = actor_id and request_idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('runId', target_run.id, 'bucketId', target_asset.bucket_id, 'storagePath', target_asset.storage_path); end if;
  select count(*) into previous_count from public.speaking_transcript_runs where response_id = target_response.id;
  if previous_count >= 2 then raise exception 'Transcript retry limit reached'; end if;
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

create function public.finalize_speaking_transcript(
  p_run_id uuid, p_transcript_text text, p_language_code text,
  p_signature_expires_at timestamptz, p_signature text
) returns public.speaking_transcripts language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_run public.speaking_transcript_runs; result public.speaking_transcripts;
  message text; expected text; secret text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  select * into target_run from public.speaking_transcript_runs where id = p_run_id and user_id = actor_id for update;
  if not found then raise exception 'Transcript run not found'; end if;
  if target_run.status = 'ready' then select * into result from public.speaking_transcripts where run_id = target_run.id; return result; end if;
  if target_run.status <> 'pending' or target_run.lease_expires_at <= now() then raise exception 'Transcript run is not active'; end if;
  if p_signature_expires_at <= now() or p_signature_expires_at > now() + interval '5 minutes'
    or p_transcript_text is null or btrim(p_transcript_text) = '' or char_length(p_transcript_text) > 20000 then
    raise exception 'Invalid transcript result';
  end if;
  secret := private.speaking_signing_secret();
  message := concat_ws('|', 'speaking-transcript-v1', actor_id, target_run.id,
    encode(extensions.digest(convert_to(p_transcript_text, 'UTF8'), 'sha256'), 'hex'),
    coalesce(p_language_code, ''), extract(epoch from p_signature_expires_at)::bigint);
  expected := encode(extensions.hmac(convert_to(message, 'UTF8'), convert_to(secret, 'UTF8'), 'sha256'), 'hex');
  if expected <> lower(p_signature) then raise exception 'Invalid transcript signature'; end if;
  insert into public.speaking_transcripts (run_id, user_id, response_id, transcript_text, language_code)
  values (target_run.id, actor_id, target_run.response_id, p_transcript_text, p_language_code) returning * into result;
  update public.speaking_transcript_runs set status = 'ready', completed_at = now() where id = target_run.id;
  return result;
end; $$;

create function public.fail_speaking_transcript_run(
  p_run_id uuid, p_error_code text, p_signature_expires_at timestamptz, p_signature text
) returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_run public.speaking_transcript_runs; message text; expected text; secret text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  select * into target_run from public.speaking_transcript_runs where id = p_run_id and user_id = actor_id for update;
  if not found or target_run.status <> 'pending' then return; end if;
  if p_signature_expires_at <= now() or p_signature_expires_at > now() + interval '5 minutes'
    or p_error_code !~ '^[a-z0-9_]{1,80}$' then raise exception 'Invalid failure result'; end if;
  secret := private.speaking_signing_secret();
  message := concat_ws('|', 'speaking-transcript-failure-v1', actor_id, target_run.id, p_error_code,
    extract(epoch from p_signature_expires_at)::bigint);
  expected := encode(extensions.hmac(convert_to(message, 'UTF8'), convert_to(secret, 'UTF8'), 'sha256'), 'hex');
  if expected <> lower(p_signature) then raise exception 'Invalid transcript failure signature'; end if;
  update public.speaking_transcript_runs set status = 'failed', completed_at = now(), error_code = p_error_code where id = target_run.id;
end; $$;

create function public.start_speaking_feedback_request(
  p_attempt_id uuid, p_idempotency_key text, p_consent_version text, p_provider text, p_model text,
  p_transcript_bundle_checksum text
) returns public.speaking_feedback_runs language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_attempt public.speaking_attempts; target_run public.speaking_feedback_runs; previous_count integer;
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
  select count(*) into previous_count from public.speaking_feedback_runs where attempt_id = target_attempt.id;
  if previous_count >= 2 then raise exception 'Feedback retry limit reached'; end if;
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

create function public.finalize_speaking_feedback(
  p_run_id uuid, p_payload text, p_signature_expires_at timestamptz, p_signature text
) returns public.speaking_feedback language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_run public.speaking_feedback_runs; result public.speaking_feedback;
  payload jsonb; message text; expected text; secret text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  select * into target_run from public.speaking_feedback_runs where id = p_run_id and user_id = actor_id for update;
  if not found then raise exception 'Feedback run not found'; end if;
  if target_run.status = 'ready' then select * into result from public.speaking_feedback where run_id = target_run.id; return result; end if;
  if target_run.status <> 'pending' or target_run.lease_expires_at <= now() then raise exception 'Feedback run is not active'; end if;
  if p_signature_expires_at <= now() or p_signature_expires_at > now() + interval '5 minutes' or char_length(p_payload) > 30000 then
    raise exception 'Invalid feedback result'; end if;
  begin payload := p_payload::jsonb; exception when others then raise exception 'Invalid feedback payload'; end;
  secret := private.speaking_signing_secret();
  message := concat_ws('|', 'speaking-feedback-v1', actor_id, target_run.id,
    encode(extensions.digest(convert_to(p_payload, 'UTF8'), 'sha256'), 'hex'),
    extract(epoch from p_signature_expires_at)::bigint);
  expected := encode(extensions.hmac(convert_to(message, 'UTF8'), convert_to(secret, 'UTF8'), 'sha256'), 'hex');
  if expected <> lower(p_signature) then raise exception 'Invalid feedback signature'; end if;
  insert into public.speaking_feedback (
    run_id, user_id, attempt_id, estimated_overall_band, estimated_fluency_band,
    estimated_lexical_band, estimated_grammar_band, estimated_pronunciation_band,
    pronunciation_scope, confidence, summary, criteria, strengths, suggestions, disclaimer
  ) values (
    target_run.id, actor_id, target_run.attempt_id,
    nullif(payload->>'estimatedOverallBand', '')::numeric,
    nullif(payload->>'estimatedFluencyBand', '')::numeric,
    nullif(payload->>'estimatedLexicalBand', '')::numeric,
    nullif(payload->>'estimatedGrammarBand', '')::numeric,
    nullif(payload->>'estimatedPronunciationBand', '')::numeric,
    payload->>'pronunciationScope', payload->>'confidence', payload->>'summary',
    payload->'criteria', payload->'strengths', payload->'suggestions',
    'AI practice feedback only - not an official IELTS score.'
  ) returning * into result;
  update public.speaking_feedback_runs set status = 'ready', completed_at = now() where id = target_run.id;
  return result;
end; $$;

create function public.fail_speaking_feedback_run(
  p_run_id uuid, p_error_code text, p_signature_expires_at timestamptz, p_signature text
) returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_run public.speaking_feedback_runs; message text; expected text; secret text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  select * into target_run from public.speaking_feedback_runs where id = p_run_id and user_id = actor_id for update;
  if not found or target_run.status <> 'pending' then return; end if;
  if p_signature_expires_at <= now() or p_signature_expires_at > now() + interval '5 minutes'
    or p_error_code !~ '^[a-z0-9_]{1,80}$' then raise exception 'Invalid failure result'; end if;
  secret := private.speaking_signing_secret();
  message := concat_ws('|', 'speaking-feedback-failure-v1', actor_id, target_run.id, p_error_code,
    extract(epoch from p_signature_expires_at)::bigint);
  expected := encode(extensions.hmac(convert_to(message, 'UTF8'), convert_to(secret, 'UTF8'), 'sha256'), 'hex');
  if expected <> lower(p_signature) then raise exception 'Invalid feedback failure signature'; end if;
  update public.speaking_feedback_runs set status = 'failed', completed_at = now(), error_code = p_error_code where id = target_run.id;
end; $$;

revoke all on function public.protect_speaking_transcript(), public.protect_speaking_feedback() from public, anon, authenticated;
revoke all on function public.start_speaking_transcript_request(uuid, text, text, text, text),
  public.finalize_speaking_transcript(uuid, text, text, timestamptz, text),
  public.fail_speaking_transcript_run(uuid, text, timestamptz, text),
  public.start_speaking_feedback_request(uuid, text, text, text, text, text),
  public.finalize_speaking_feedback(uuid, text, timestamptz, text),
  public.fail_speaking_feedback_run(uuid, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.start_speaking_transcript_request(uuid, text, text, text, text),
  public.finalize_speaking_transcript(uuid, text, text, timestamptz, text),
  public.fail_speaking_transcript_run(uuid, text, timestamptz, text),
  public.start_speaking_feedback_request(uuid, text, text, text, text, text),
  public.finalize_speaking_feedback(uuid, text, timestamptz, text),
  public.fail_speaking_feedback_run(uuid, text, timestamptz, text) to authenticated;

comment on table public.speaking_transcripts is 'Optional provider transcript; absent on failure and never fabricated.';
comment on table public.speaking_feedback is 'Optional AI practice feedback, explicitly not an official IELTS score.';

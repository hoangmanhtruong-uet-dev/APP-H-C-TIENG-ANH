create table public.speaking_sets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_sets_slug_check check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 120
  ),
  constraint speaking_sets_display_order_check check (display_order between 1 and 10000)
);

create table public.speaking_set_versions (
  id uuid primary key default gen_random_uuid(),
  speaking_set_id uuid not null references public.speaking_sets (id) on delete restrict,
  version smallint not null,
  title text not null,
  description text not null,
  instructions text not null,
  test_type text not null,
  difficulty text not null,
  estimated_minutes integer not null,
  status text not null default 'draft',
  source_name text not null,
  licence text not null,
  content_checksum text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_set_versions_set_version_unique unique (speaking_set_id, version),
  constraint speaking_set_versions_set_id_id_unique unique (speaking_set_id, id),
  constraint speaking_set_versions_version_check check (version between 1 and 32767),
  constraint speaking_set_versions_title_check check (btrim(title) <> '' and char_length(title) <= 180),
  constraint speaking_set_versions_description_check check (btrim(description) <> '' and char_length(description) <= 1200),
  constraint speaking_set_versions_instructions_check check (btrim(instructions) <> '' and char_length(instructions) <= 4000),
  constraint speaking_set_versions_test_type_check check (test_type in ('academic', 'general_training', 'both')),
  constraint speaking_set_versions_difficulty_check check (difficulty in ('beginner', 'intermediate', 'advanced')),
  constraint speaking_set_versions_duration_check check (estimated_minutes between 1 and 30),
  constraint speaking_set_versions_status_check check (status in ('draft', 'published', 'archived')),
  constraint speaking_set_versions_publication_check check (
    (status = 'draft' and published_at is null)
    or (status in ('published', 'archived') and published_at is not null)
  ),
  constraint speaking_set_versions_source_check check (btrim(source_name) <> '' and char_length(source_name) <= 200),
  constraint speaking_set_versions_licence_check check (btrim(licence) <> '' and char_length(licence) <= 200),
  constraint speaking_set_versions_checksum_check check (content_checksum ~ '^[0-9a-f]{64}$')
);

create unique index speaking_set_versions_one_published_idx
on public.speaking_set_versions (speaking_set_id) where status = 'published';
create index speaking_set_versions_catalog_idx
on public.speaking_set_versions (status, test_type, speaking_set_id, version desc);

create table public.speaking_prompts (
  id uuid primary key default gen_random_uuid(),
  speaking_set_version_id uuid not null references public.speaking_set_versions (id) on delete restrict,
  part text not null,
  prompt_text text not null,
  instructions text not null,
  preparation_seconds integer not null default 0,
  minimum_answer_seconds integer not null,
  maximum_answer_seconds integer not null,
  display_order integer not null,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_prompts_version_order_unique unique (speaking_set_version_id, display_order),
  constraint speaking_prompts_version_id_unique unique (speaking_set_version_id, id),
  constraint speaking_prompts_part_check check (part in ('part_1', 'part_2', 'part_3')),
  constraint speaking_prompts_text_check check (btrim(prompt_text) <> '' and char_length(prompt_text) <= 2000),
  constraint speaking_prompts_instructions_check check (char_length(instructions) <= 2000),
  constraint speaking_prompts_duration_check check (
    preparation_seconds between 0 and 120
    and minimum_answer_seconds between 1 and 180
    and maximum_answer_seconds between minimum_answer_seconds and 180
  ),
  constraint speaking_prompts_order_check check (display_order between 1 and 100)
);
create index speaking_prompts_version_idx on public.speaking_prompts (speaking_set_version_id, display_order);

create table public.speaking_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  speaking_set_id uuid not null references public.speaking_sets (id) on delete restrict,
  speaking_set_version_id uuid not null,
  status text not null default 'in_progress',
  start_idempotency_key text not null,
  submit_idempotency_key text,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_attempts_set_version_fkey foreign key (speaking_set_id, speaking_set_version_id)
    references public.speaking_set_versions (speaking_set_id, id) on delete restrict,
  constraint speaking_attempts_id_user_unique unique (id, user_id),
  constraint speaking_attempts_id_version_unique unique (id, speaking_set_version_id),
  constraint speaking_attempts_status_check check (status in ('in_progress', 'submitted')),
  constraint speaking_attempts_start_key_check check (btrim(start_idempotency_key) <> '' and char_length(start_idempotency_key) <= 200),
  constraint speaking_attempts_submit_key_check check (
    submit_idempotency_key is null or (btrim(submit_idempotency_key) <> '' and char_length(submit_idempotency_key) <= 200)
  ),
  constraint speaking_attempts_state_check check (
    (status = 'in_progress' and submit_idempotency_key is null and submitted_at is null)
    or (status = 'submitted' and submit_idempotency_key is not null and submitted_at is not null)
  ),
  constraint speaking_attempts_user_start_key_unique unique (user_id, start_idempotency_key),
  constraint speaking_attempts_user_submit_key_unique unique (user_id, submit_idempotency_key)
);
create unique index speaking_attempts_one_active_set_idx
on public.speaking_attempts (user_id, speaking_set_id) where status = 'in_progress';
create index speaking_attempts_user_recent_idx
on public.speaking_attempts (user_id, status, coalesce(submitted_at, started_at) desc);
create index speaking_attempts_version_idx on public.speaking_attempts (speaking_set_version_id);

create table public.speaking_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  attempt_id uuid not null,
  speaking_set_version_id uuid not null,
  prompt_id uuid not null,
  audio_asset_id uuid,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_responses_attempt_owner_fkey foreign key (attempt_id, user_id)
    references public.speaking_attempts (id, user_id) on delete restrict,
  constraint speaking_responses_attempt_version_fkey foreign key (attempt_id, speaking_set_version_id)
    references public.speaking_attempts (id, speaking_set_version_id) on delete restrict,
  constraint speaking_responses_prompt_version_fkey foreign key (speaking_set_version_id, prompt_id)
    references public.speaking_prompts (speaking_set_version_id, id) on delete restrict,
  constraint speaking_responses_attempt_prompt_unique unique (attempt_id, prompt_id),
  constraint speaking_responses_id_user_unique unique (id, user_id),
  constraint speaking_responses_id_attempt_user_unique unique (id, attempt_id, user_id),
  constraint speaking_responses_submission_check check (submitted_at is null or audio_asset_id is not null)
);
create index speaking_responses_user_recent_idx on public.speaking_responses (user_id, created_at desc);
create index speaking_responses_prompt_idx on public.speaking_responses (prompt_id);

create table public.speaking_upload_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  attempt_id uuid not null,
  response_id uuid not null,
  storage_path text not null unique,
  expected_mime_type text not null,
  expected_size_bytes bigint not null,
  expected_duration_seconds numeric(7,3) not null,
  status text not null default 'issued',
  idempotency_key text not null,
  expires_at timestamptz not null,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_upload_intents_response_scope_fkey foreign key (response_id, attempt_id, user_id)
    references public.speaking_responses (id, attempt_id, user_id) on delete restrict,
  constraint speaking_upload_intents_status_check check (status in ('issued', 'finalized', 'expired')),
  constraint speaking_upload_intents_mime_check check (expected_mime_type in ('audio/webm', 'audio/mp4', 'audio/mpeg')),
  constraint speaking_upload_intents_size_check check (expected_size_bytes between 1 and 15728640),
  constraint speaking_upload_intents_duration_check check (expected_duration_seconds between 1 and 180),
  constraint speaking_upload_intents_path_check check (storage_path !~ '(^|/)\.\.(/|$)' and char_length(storage_path) <= 500),
  constraint speaking_upload_intents_key_check check (btrim(idempotency_key) <> '' and char_length(idempotency_key) <= 200),
  constraint speaking_upload_intents_state_check check (
    (status = 'issued' and finalized_at is null)
    or (status = 'finalized' and finalized_at is not null)
    or status = 'expired'
  ),
  constraint speaking_upload_intents_user_key_unique unique (user_id, idempotency_key)
);
create index speaking_upload_intents_response_idx on public.speaking_upload_intents (response_id, status);
create index speaking_upload_intents_expiry_idx on public.speaking_upload_intents (status, expires_at);

create table public.speaking_audio_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  attempt_id uuid not null,
  response_id uuid not null,
  upload_intent_id uuid not null unique references public.speaking_upload_intents (id) on delete restrict,
  bucket_id text not null default 'speaking-recordings',
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  duration_seconds numeric(7,3) not null,
  sha256_checksum text not null,
  status text not null default 'ready',
  retention_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_audio_assets_response_scope_fkey foreign key (response_id, attempt_id, user_id)
    references public.speaking_responses (id, attempt_id, user_id) on delete restrict,
  constraint speaking_audio_assets_bucket_check check (bucket_id = 'speaking-recordings'),
  constraint speaking_audio_assets_mime_check check (mime_type in ('audio/webm', 'audio/mp4', 'audio/mpeg')),
  constraint speaking_audio_assets_size_check check (size_bytes between 1 and 15728640),
  constraint speaking_audio_assets_duration_check check (duration_seconds between 1 and 180),
  constraint speaking_audio_assets_checksum_check check (sha256_checksum ~ '^[0-9a-f]{64}$'),
  constraint speaking_audio_assets_status_check check (status in ('ready', 'orphaned'))
);
create index speaking_audio_assets_user_recent_idx on public.speaking_audio_assets (user_id, created_at desc);
create index speaking_audio_assets_response_idx on public.speaking_audio_assets (response_id, status);

alter table public.speaking_responses
  add constraint speaking_responses_audio_asset_fkey foreign key (audio_asset_id)
  references public.speaking_audio_assets (id) on delete restrict;

create trigger speaking_sets_set_updated_at before update on public.speaking_sets
for each row execute function public.set_profile_updated_at();
create trigger speaking_set_versions_set_updated_at before update on public.speaking_set_versions
for each row execute function public.set_profile_updated_at();
create trigger speaking_prompts_set_updated_at before update on public.speaking_prompts
for each row execute function public.set_profile_updated_at();
create trigger speaking_attempts_set_updated_at before update on public.speaking_attempts
for each row execute function public.set_profile_updated_at();
create trigger speaking_responses_set_updated_at before update on public.speaking_responses
for each row execute function public.set_profile_updated_at();
create trigger speaking_upload_intents_set_updated_at before update on public.speaking_upload_intents
for each row execute function public.set_profile_updated_at();
create trigger speaking_audio_assets_set_updated_at before update on public.speaking_audio_assets
for each row execute function public.set_profile_updated_at();

create function public.protect_speaking_attempt()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'Speaking attempts cannot be deleted'; end if;
  if old.user_id is distinct from new.user_id
    or old.speaking_set_id is distinct from new.speaking_set_id
    or old.speaking_set_version_id is distinct from new.speaking_set_version_id
    or old.started_at is distinct from new.started_at then
    raise exception 'Speaking attempt identity is immutable';
  end if;
  if old.status = 'submitted' and old is distinct from new then
    raise exception 'Submitted speaking attempts are immutable';
  end if;
  return new;
end; $$;
create trigger protect_speaking_attempt before update or delete on public.speaking_attempts
for each row execute function public.protect_speaking_attempt();

create function public.protect_speaking_response()
returns trigger language plpgsql set search_path = '' as $$
declare parent_status text;
begin
  if tg_op = 'DELETE' then raise exception 'Speaking responses cannot be deleted'; end if;
  select status into parent_status from public.speaking_attempts where id = old.attempt_id;
  if parent_status = 'submitted' and old is distinct from new then
    raise exception 'Submitted speaking responses are immutable';
  end if;
  if old.user_id is distinct from new.user_id or old.attempt_id is distinct from new.attempt_id
    or old.speaking_set_version_id is distinct from new.speaking_set_version_id
    or old.prompt_id is distinct from new.prompt_id then
    raise exception 'Speaking response identity is immutable';
  end if;
  return new;
end; $$;
create trigger protect_speaking_response before update or delete on public.speaking_responses
for each row execute function public.protect_speaking_response();

create function public.protect_speaking_audio_asset()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'Speaking audio metadata cannot be deleted'; end if;
  if old is distinct from new and not (
    old.status = 'ready' and new.status = 'orphaned'
    and old.user_id = new.user_id and old.attempt_id = new.attempt_id
    and old.response_id = new.response_id and old.upload_intent_id = new.upload_intent_id
    and old.bucket_id = new.bucket_id and old.storage_path = new.storage_path
    and old.mime_type = new.mime_type and old.size_bytes = new.size_bytes
    and old.duration_seconds = new.duration_seconds and old.sha256_checksum = new.sha256_checksum
    and old.created_at = new.created_at
  ) then raise exception 'Verified speaking audio metadata is immutable'; end if;
  return new;
end; $$;
create trigger protect_speaking_audio_asset before update or delete on public.speaking_audio_assets
for each row execute function public.protect_speaking_audio_asset();

create function private.speaking_set_version_is_accessible(target_version_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.speaking_set_versions versions
    join public.learner_profiles learners on learners.user_id = (select auth.uid())
    where versions.id = target_version_id and versions.status = 'published'
      and versions.published_at <= now() and learners.onboarding_completed_at is not null
      and (versions.test_type = 'both' or versions.test_type = learners.test_type)
  );
$$;
create function private.speaking_set_is_accessible(target_set_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.speaking_set_versions versions
    where versions.speaking_set_id = target_set_id
      and (select private.speaking_set_version_is_accessible(versions.id))
  );
$$;

alter table public.speaking_sets enable row level security;
alter table public.speaking_set_versions enable row level security;
alter table public.speaking_prompts enable row level security;
alter table public.speaking_attempts enable row level security;
alter table public.speaking_responses enable row level security;
alter table public.speaking_upload_intents enable row level security;
alter table public.speaking_audio_assets enable row level security;

revoke all on table public.speaking_sets, public.speaking_set_versions, public.speaking_prompts,
  public.speaking_attempts, public.speaking_responses, public.speaking_upload_intents,
  public.speaking_audio_assets from anon, authenticated;
grant select on table public.speaking_sets, public.speaking_set_versions, public.speaking_prompts,
  public.speaking_attempts, public.speaking_responses, public.speaking_upload_intents,
  public.speaking_audio_assets to authenticated;

create policy "Learners can read accessible or pinned speaking sets" on public.speaking_sets
for select to authenticated using (
  (select private.speaking_set_is_accessible(id)) or exists (
    select 1 from public.speaking_attempts attempts
    where attempts.speaking_set_id = speaking_sets.id and attempts.user_id = (select auth.uid())
  )
);
create policy "Learners can read accessible or pinned speaking versions" on public.speaking_set_versions
for select to authenticated using (
  (select private.speaking_set_version_is_accessible(id)) or exists (
    select 1 from public.speaking_attempts attempts
    where attempts.speaking_set_version_id = speaking_set_versions.id and attempts.user_id = (select auth.uid())
  )
);
create policy "Learners can read accessible or pinned speaking prompts" on public.speaking_prompts
for select to authenticated using (
  (select private.speaking_set_version_is_accessible(speaking_set_version_id)) or exists (
    select 1 from public.speaking_attempts attempts
    where attempts.speaking_set_version_id = speaking_prompts.speaking_set_version_id
      and attempts.user_id = (select auth.uid())
  )
);
create policy "Learners can read their own speaking attempts" on public.speaking_attempts
for select to authenticated using (user_id = (select auth.uid()));
create policy "Learners can read their own speaking responses" on public.speaking_responses
for select to authenticated using (user_id = (select auth.uid()));
create policy "Learners can read their own speaking upload intents" on public.speaking_upload_intents
for select to authenticated using (user_id = (select auth.uid()));
create policy "Learners can read their own speaking audio metadata" on public.speaking_audio_assets
for select to authenticated using (user_id = (select auth.uid()));

create function public.start_speaking_attempt(p_set_slug text, p_idempotency_key text)
returns public.speaking_attempts language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_version public.speaking_set_versions; result public.speaking_attempts;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then
    raise exception 'Invalid idempotency key';
  end if;
  select versions.* into target_version
  from public.speaking_sets sets
  join public.speaking_set_versions versions on versions.speaking_set_id = sets.id
  join public.learner_profiles learners on learners.user_id = actor_id
  where sets.slug = p_set_slug and versions.status = 'published' and versions.published_at <= now()
    and learners.onboarding_completed_at is not null
    and (versions.test_type = 'both' or versions.test_type = learners.test_type)
  order by versions.version desc limit 1;
  if not found then raise exception 'Speaking set is not available'; end if;
  select * into result from public.speaking_attempts
  where user_id = actor_id and start_idempotency_key = p_idempotency_key;
  if found then
    if result.speaking_set_id <> target_version.speaking_set_id then raise exception 'Idempotency key conflict'; end if;
    return result;
  end if;
  select * into result from public.speaking_attempts
  where user_id = actor_id and speaking_set_id = target_version.speaking_set_id and status = 'in_progress';
  if found then return result; end if;
  insert into public.speaking_attempts (user_id, speaking_set_id, speaking_set_version_id, start_idempotency_key)
  values (actor_id, target_version.speaking_set_id, target_version.id, p_idempotency_key)
  returning * into result;
  return result;
end; $$;

create function public.create_speaking_upload_intent(
  p_attempt_id uuid, p_prompt_id uuid, p_mime_type text, p_size_bytes bigint,
  p_duration_seconds numeric, p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_attempt public.speaking_attempts; target_prompt public.speaking_prompts;
  target_response public.speaking_responses; target_intent public.speaking_upload_intents;
  object_id uuid := gen_random_uuid(); object_extension text; object_path text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then raise exception 'Invalid idempotency key'; end if;
  if p_mime_type not in ('audio/webm', 'audio/mp4', 'audio/mpeg') then raise exception 'Unsupported audio type'; end if;
  if p_size_bytes not between 1 and 15728640 then raise exception 'Audio size is outside the allowed range'; end if;
  if p_duration_seconds not between 1 and 180 then raise exception 'Audio duration is outside the allowed range'; end if;
  select * into target_attempt from public.speaking_attempts
  where id = p_attempt_id and user_id = actor_id for update;
  if not found or target_attempt.status <> 'in_progress' then raise exception 'Speaking attempt is not editable'; end if;
  select * into target_prompt from public.speaking_prompts
  where id = p_prompt_id and speaking_set_version_id = target_attempt.speaking_set_version_id;
  if not found then raise exception 'Prompt does not belong to this speaking attempt'; end if;
  select * into target_intent from public.speaking_upload_intents
  where user_id = actor_id and idempotency_key = p_idempotency_key;
  if found then
    if target_intent.attempt_id <> p_attempt_id then raise exception 'Idempotency key conflict'; end if;
    return jsonb_build_object('intentId', target_intent.id, 'responseId', target_intent.response_id,
      'bucketId', 'speaking-recordings', 'storagePath', target_intent.storage_path, 'expiresAt', target_intent.expires_at);
  end if;
  insert into public.speaking_responses (user_id, attempt_id, speaking_set_version_id, prompt_id)
  values (actor_id, target_attempt.id, target_attempt.speaking_set_version_id, target_prompt.id)
  on conflict (attempt_id, prompt_id) do update set updated_at = public.speaking_responses.updated_at
  returning * into target_response;
  object_extension := case p_mime_type when 'audio/webm' then 'webm' when 'audio/mp4' then 'm4a' else 'mp3' end;
  object_path := actor_id::text || '/' || target_attempt.id::text || '/' || target_response.id::text || '/' || object_id::text || '.' || object_extension;
  insert into public.speaking_upload_intents (
    user_id, attempt_id, response_id, storage_path, expected_mime_type, expected_size_bytes,
    expected_duration_seconds, idempotency_key, expires_at
  ) values (actor_id, target_attempt.id, target_response.id, object_path, p_mime_type, p_size_bytes,
    p_duration_seconds, p_idempotency_key, now() + interval '15 minutes') returning * into target_intent;
  return jsonb_build_object('intentId', target_intent.id, 'responseId', target_intent.response_id,
    'bucketId', 'speaking-recordings', 'storagePath', target_intent.storage_path, 'expiresAt', target_intent.expires_at);
end; $$;

create function private.speaking_signing_secret()
returns text language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets
  where name = 'speaking_pipeline_signing_secret' order by created_at desc limit 1;
$$;

create function public.get_speaking_pipeline_configuration_state()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and nullif((select private.speaking_signing_secret()), '') is not null;
$$;

create function private.speaking_upload_signature_message(
  actor_id uuid, intent_id uuid, mime_type text, size_bytes bigint,
  duration_seconds numeric, checksum text, expires_at timestamptz
) returns text language sql immutable set search_path = '' as $$
  select concat_ws('|', 'speaking-upload-v1', actor_id, intent_id, mime_type,
    size_bytes, round(duration_seconds * 1000)::bigint, checksum,
    extract(epoch from expires_at)::bigint);
$$;

create function private.speaking_upload_expected_signature(
  actor_id uuid, intent_id uuid, mime_type text, size_bytes bigint,
  duration_seconds numeric, checksum text, expires_at timestamptz
) returns text language sql stable security definer set search_path = '' as $$
  select encode(extensions.hmac(
    convert_to(private.speaking_upload_signature_message(actor_id, intent_id, mime_type,
      size_bytes, duration_seconds, checksum, expires_at), 'UTF8'),
    convert_to(private.speaking_signing_secret(), 'UTF8'), 'sha256'), 'hex');
$$;

create function public.finalize_speaking_upload(
  p_intent_id uuid, p_verified_mime_type text, p_verified_size_bytes bigint,
  p_verified_duration_seconds numeric, p_sha256_checksum text,
  p_signature_expires_at timestamptz, p_signature text
) returns public.speaking_audio_assets language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_intent public.speaking_upload_intents; target_attempt public.speaking_attempts;
  target_response public.speaking_responses; old_asset_id uuid; result public.speaking_audio_assets;
  signing_secret text; expected_signature text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if p_signature_expires_at <= now() or p_signature_expires_at > now() + interval '5 minutes' then raise exception 'Invalid verification signature expiry'; end if;
  select * into target_intent from public.speaking_upload_intents where id = p_intent_id and user_id = actor_id for update;
  if not found then raise exception 'Upload intent not found'; end if;
  if target_intent.status = 'finalized' then
    select * into result from public.speaking_audio_assets where upload_intent_id = target_intent.id;
    return result;
  end if;
  if target_intent.status <> 'issued' or target_intent.expires_at <= now() then raise exception 'Upload intent expired'; end if;
  select * into target_attempt from public.speaking_attempts where id = target_intent.attempt_id and user_id = actor_id for update;
  if target_attempt.status <> 'in_progress' then raise exception 'Speaking attempt is not editable'; end if;
  if p_verified_mime_type not in ('audio/webm', 'audio/mp4', 'audio/mpeg')
    or p_verified_size_bytes not between 1 and 15728640
    or p_verified_duration_seconds not between 1 and 180
    or p_sha256_checksum !~ '^[0-9a-f]{64}$' then raise exception 'Invalid verified audio metadata'; end if;
  if p_verified_mime_type <> target_intent.expected_mime_type
    or p_verified_size_bytes <> target_intent.expected_size_bytes
    or abs(p_verified_duration_seconds - target_intent.expected_duration_seconds) > 2 then
    raise exception 'Verified audio does not match the upload intent';
  end if;
  signing_secret := private.speaking_signing_secret();
  if nullif(signing_secret, '') is null then raise exception 'Speaking verification is not configured'; end if;
  expected_signature := private.speaking_upload_expected_signature(actor_id, target_intent.id,
    p_verified_mime_type, p_verified_size_bytes, p_verified_duration_seconds,
    p_sha256_checksum, p_signature_expires_at);
  if expected_signature <> lower(p_signature) then raise exception 'Invalid verification signature'; end if;
  select * into target_response from public.speaking_responses where id = target_intent.response_id for update;
  old_asset_id := target_response.audio_asset_id;
  insert into public.speaking_audio_assets (
    user_id, attempt_id, response_id, upload_intent_id, storage_path, mime_type,
    size_bytes, duration_seconds, sha256_checksum
  ) values (actor_id, target_intent.attempt_id, target_intent.response_id, target_intent.id,
    target_intent.storage_path, p_verified_mime_type, p_verified_size_bytes,
    p_verified_duration_seconds, p_sha256_checksum) returning * into result;
  update public.speaking_responses set audio_asset_id = result.id where id = target_response.id;
  if old_asset_id is not null then update public.speaking_audio_assets set status = 'orphaned' where id = old_asset_id; end if;
  update public.speaking_upload_intents set status = 'finalized', finalized_at = now() where id = target_intent.id;
  return result;
end; $$;

create function public.submit_speaking_attempt(p_attempt_id uuid, p_idempotency_key text)
returns public.speaking_attempts language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target public.speaking_attempts; missing_count integer;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then raise exception 'Invalid idempotency key'; end if;
  select * into target from public.speaking_attempts where id = p_attempt_id and user_id = actor_id for update;
  if not found then raise exception 'Speaking attempt not found'; end if;
  if target.status = 'submitted' then
    if target.submit_idempotency_key <> p_idempotency_key then raise exception 'Speaking attempt is already submitted'; end if;
    return target;
  end if;
  select count(*) into missing_count from public.speaking_prompts prompts
  where prompts.speaking_set_version_id = target.speaking_set_version_id and prompts.is_required
    and not exists (
      select 1 from public.speaking_responses responses
      join public.speaking_audio_assets assets on assets.id = responses.audio_asset_id and assets.status = 'ready'
      where responses.attempt_id = target.id and responses.prompt_id = prompts.id
    );
  if missing_count > 0 then raise exception 'Record every required response before submitting'; end if;
  update public.speaking_responses set submitted_at = now() where attempt_id = target.id;
  update public.speaking_attempts set status = 'submitted', submit_idempotency_key = p_idempotency_key,
    submitted_at = now() where id = target.id returning * into target;
  return target;
end; $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('speaking-recordings', 'speaking-recordings', false, 15728640, array['audio/webm', 'audio/mp4', 'audio/mpeg']::text[])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Learners can upload issued speaking recordings" on storage.objects
for insert to authenticated with check (
  bucket_id = 'speaking-recordings'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.speaking_upload_intents intents
    where intents.user_id = (select auth.uid()) and intents.storage_path = name
      and intents.status = 'issued' and intents.expires_at > now()
  )
);
create policy "Learners can read their own speaking recordings" on storage.objects
for select to authenticated using (
  bucket_id = 'speaking-recordings' and (
    exists (select 1 from public.speaking_audio_assets assets
      where assets.user_id = (select auth.uid()) and assets.storage_path = name)
    or exists (select 1 from public.speaking_upload_intents intents
      where intents.user_id = (select auth.uid()) and intents.storage_path = name and intents.expires_at > now())
  )
);
create policy "Learners can delete unsubmitted speaking recordings" on storage.objects
for delete to authenticated using (
  bucket_id = 'speaking-recordings' and exists (
    select 1 from public.speaking_upload_intents intents
    join public.speaking_attempts attempts on attempts.id = intents.attempt_id
    where intents.user_id = (select auth.uid()) and intents.storage_path = name
      and attempts.user_id = (select auth.uid()) and attempts.status = 'in_progress'
  )
);

revoke all on function public.protect_speaking_attempt(), public.protect_speaking_response(),
  public.protect_speaking_audio_asset(), private.speaking_set_version_is_accessible(uuid),
  private.speaking_set_is_accessible(uuid), private.speaking_signing_secret(),
  private.speaking_upload_signature_message(uuid, uuid, text, bigint, numeric, text, timestamptz),
  private.speaking_upload_expected_signature(uuid, uuid, text, bigint, numeric, text, timestamptz)
  from public, anon, authenticated;
grant execute on function private.speaking_set_version_is_accessible(uuid), private.speaking_set_is_accessible(uuid) to authenticated;
revoke all on function public.start_speaking_attempt(text, text),
  public.create_speaking_upload_intent(uuid, uuid, text, bigint, numeric, text),
  public.get_speaking_pipeline_configuration_state(),
  public.finalize_speaking_upload(uuid, text, bigint, numeric, text, timestamptz, text),
  public.submit_speaking_attempt(uuid, text) from public, anon, authenticated;
grant execute on function public.start_speaking_attempt(text, text),
  public.create_speaking_upload_intent(uuid, uuid, text, bigint, numeric, text),
  public.get_speaking_pipeline_configuration_state(),
  public.finalize_speaking_upload(uuid, text, bigint, numeric, text, timestamptz, text),
  public.submit_speaking_attempt(uuid, text) to authenticated;

comment on table public.speaking_attempts is 'Phase 9 server-owned Speaking attempt state. Submitted rows are immutable.';
comment on table public.speaking_audio_assets is 'Verified metadata for private speaking-recordings objects; Storage remains the audio source of truth.';
comment on function public.finalize_speaking_upload(uuid, text, bigint, numeric, text, timestamptz, text) is
  'Accepts only short-lived server-signed metadata after the uploaded object has been independently verified.';

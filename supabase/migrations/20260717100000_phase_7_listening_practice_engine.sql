begin;

alter table public.exercise_sets
  drop constraint exercise_sets_domain_check;

alter table public.exercise_sets
  add constraint exercise_sets_domain_check check (
    domain in ('vocabulary', 'grammar', 'reading', 'listening')
  );

create table public.listening_audio_assets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  asset_path text not null unique,
  mime_type text not null,
  duration_seconds integer not null,
  sha256 text not null,
  source_name text not null,
  source_url text,
  licence text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listening_audio_assets_slug_check check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 1 and 120
  ),
  constraint listening_audio_assets_path_check check (
    asset_path ~ '^/audio/listening/[a-z0-9][a-z0-9._/-]*\.wav$'
    and asset_path !~ '\.\.'
    and char_length(asset_path) <= 500
  ),
  constraint listening_audio_assets_mime_check check (mime_type = 'audio/wav'),
  constraint listening_audio_assets_duration_check check (duration_seconds between 1 and 7200),
  constraint listening_audio_assets_sha256_check check (sha256 ~ '^[0-9a-f]{64}$'),
  constraint listening_audio_assets_provenance_check check (
    btrim(source_name) <> '' and char_length(source_name) <= 300
    and btrim(licence) <> '' and char_length(licence) <= 300
    and (source_url is null or source_url ~ '^https://')
  )
);

create table public.listening_practice_versions (
  exercise_set_version_id uuid primary key references public.exercise_set_versions (id) on delete restrict,
  audio_asset_id uuid not null references public.listening_audio_assets (id) on delete restrict,
  test_type text not null,
  time_limit_seconds integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listening_practice_versions_test_type_check check (
    test_type in ('academic', 'general_training', 'both')
  ),
  constraint listening_practice_versions_time_limit_check check (
    time_limit_seconds between 60 and 7200
  ),
  constraint listening_practice_versions_version_audio_unique unique (
    exercise_set_version_id,
    audio_asset_id
  )
);

create table public.listening_parts (
  id uuid primary key default gen_random_uuid(),
  exercise_set_version_id uuid not null references public.listening_practice_versions (exercise_set_version_id) on delete restrict,
  position integer not null,
  title text not null,
  instructions_markdown text not null,
  audio_start_seconds integer not null,
  audio_end_seconds integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listening_parts_position_check check (position between 1 and 100),
  constraint listening_parts_title_check check (btrim(title) <> '' and char_length(title) <= 220),
  constraint listening_parts_instructions_check check (
    btrim(instructions_markdown) <> '' and char_length(instructions_markdown) <= 10000
  ),
  constraint listening_parts_audio_range_check check (
    audio_start_seconds >= 0
    and audio_end_seconds > audio_start_seconds
    and audio_end_seconds <= 7200
  ),
  constraint listening_parts_version_position_unique unique (exercise_set_version_id, position),
  constraint listening_parts_version_id_unique unique (exercise_set_version_id, id)
);

create table private.listening_transcripts (
  audio_asset_id uuid primary key references public.listening_audio_assets (id) on delete restrict,
  transcript_markdown text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listening_transcripts_body_check check (
    btrim(transcript_markdown) <> '' and char_length(transcript_markdown) <= 30000
  )
);

alter table public.exercise_questions
  add column listening_part_id uuid;

alter table public.exercise_questions
  add constraint exercise_questions_listening_part_fkey foreign key (
    exercise_set_version_id,
    listening_part_id
  ) references public.listening_parts (
    exercise_set_version_id,
    id
  ) on delete restrict;

alter table public.learner_attempts
  add column time_limit_seconds integer;

update public.learner_attempts
set time_limit_seconds = reading_time_limit_seconds
where reading_time_limit_seconds is not null;

alter table public.learner_attempts
  drop constraint learner_attempts_reading_timer_check;

alter table public.learner_attempts
  add constraint learner_attempts_timer_check check (
    (
      time_limit_seconds is null
      and reading_time_limit_seconds is null
      and expires_at is null
    )
    or (
      time_limit_seconds between 60 and 7200
      and expires_at is not null
      and expires_at > started_at
      and expires_at <= started_at + interval '2 hours'
      and (
        reading_time_limit_seconds is null
        or reading_time_limit_seconds = time_limit_seconds
      )
    )
  );

create index listening_practice_versions_audio_idx
on public.listening_practice_versions (audio_asset_id, exercise_set_version_id);

create index listening_parts_version_position_idx
on public.listening_parts (exercise_set_version_id, position, id);

create index exercise_questions_listening_part_idx
on public.exercise_questions (listening_part_id, position)
where listening_part_id is not null;

create index learner_attempts_listening_expiry_idx
on public.learner_attempts (user_id, expires_at)
where status = 'in_progress' and time_limit_seconds is not null;

create trigger set_listening_audio_assets_updated_at
before update on public.listening_audio_assets
for each row execute function public.set_profile_updated_at();

create trigger set_listening_practice_versions_updated_at
before update on public.listening_practice_versions
for each row execute function public.set_profile_updated_at();

create trigger set_listening_parts_updated_at
before update on public.listening_parts
for each row execute function public.set_profile_updated_at();

create trigger set_listening_transcripts_updated_at
before update on private.listening_transcripts
for each row execute function public.set_profile_updated_at();

create function public.protect_listening_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_audio_id uuid;
  target_version_id uuid;
  published_reference_exists boolean;
begin
  if tg_table_schema = 'private' and tg_table_name = 'listening_transcripts' then
    target_audio_id := case when tg_op = 'DELETE' then old.audio_asset_id else new.audio_asset_id end;
  elsif tg_table_name = 'listening_audio_assets' then
    target_audio_id := case when tg_op = 'DELETE' then old.id else new.id end;
  elsif tg_table_name = 'listening_practice_versions' then
    target_audio_id := case when tg_op = 'DELETE' then old.audio_asset_id else new.audio_asset_id end;
    target_version_id := case when tg_op = 'DELETE' then old.exercise_set_version_id else new.exercise_set_version_id end;
  elsif tg_table_name = 'listening_parts' then
    target_version_id := case when tg_op = 'DELETE' then old.exercise_set_version_id else new.exercise_set_version_id end;
  else
    raise exception using errcode = 'P0001', message = 'unsupported listening content table';
  end if;

  select exists (
    select 1
    from public.listening_practice_versions as practice
    join public.exercise_set_versions as versions
      on versions.id = practice.exercise_set_version_id
    where (target_audio_id is not null and practice.audio_asset_id = target_audio_id)
      and versions.status in ('published', 'archived')
  ) or exists (
    select 1
    from public.exercise_set_versions as versions
    where target_version_id is not null
      and versions.id = target_version_id
      and versions.status in ('published', 'archived')
  ) into published_reference_exists;

  if published_reference_exists then
    raise exception using errcode = '55000', message = 'published listening content is immutable';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.protect_listening_content()
from public, anon, authenticated;

create trigger protect_listening_audio_assets
before update or delete on public.listening_audio_assets
for each row execute function public.protect_listening_content();

create trigger protect_listening_practice_versions
before insert or update or delete on public.listening_practice_versions
for each row execute function public.protect_listening_content();

create trigger protect_listening_parts
before insert or update or delete on public.listening_parts
for each row execute function public.protect_listening_content();

create trigger protect_listening_transcripts
before update or delete on private.listening_transcripts
for each row execute function public.protect_listening_content();

create function private.listening_practice_version_is_accessible(target_exercise_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listening_practice_versions as practice
    join public.exercise_set_versions as versions
      on versions.id = practice.exercise_set_version_id
    join public.learner_profiles as learners
      on learners.user_id = (select auth.uid())
    where practice.exercise_set_version_id = target_exercise_version_id
      and versions.status = 'published'
      and versions.published_at <= now()
      and learners.onboarding_completed_at is not null
      and (practice.test_type = 'both' or practice.test_type = learners.test_type)
  ) or exists (
    select 1
    from public.learner_attempts as attempts
    where attempts.user_id = (select auth.uid())
      and attempts.exercise_set_version_id = target_exercise_version_id
  );
$$;

create function private.listening_audio_is_accessible(target_audio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listening_practice_versions as practice
    where practice.audio_asset_id = target_audio_id
      and (select private.listening_practice_version_is_accessible(practice.exercise_set_version_id))
  );
$$;

create function private.listening_part_is_accessible(target_part_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listening_parts as parts
    where parts.id = target_part_id
      and (select private.listening_practice_version_is_accessible(parts.exercise_set_version_id))
  );
$$;

revoke all on function private.listening_practice_version_is_accessible(uuid)
from public, anon, authenticated;
revoke all on function private.listening_audio_is_accessible(uuid)
from public, anon, authenticated;
revoke all on function private.listening_part_is_accessible(uuid)
from public, anon, authenticated;

grant execute on function private.listening_practice_version_is_accessible(uuid) to authenticated;
grant execute on function private.listening_audio_is_accessible(uuid) to authenticated;
grant execute on function private.listening_part_is_accessible(uuid) to authenticated;

create or replace function private.exercise_version_is_accessible(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.exercise_set_versions as versions
    join public.exercise_sets as sets on sets.id = versions.exercise_set_id
    where versions.id = target_version_id
      and versions.status = 'published'
      and versions.published_at <= now()
      and (select private.completed_learner_exists())
      and (
        (sets.domain = 'reading' and (select private.reading_practice_version_is_accessible(versions.id)))
        or (sets.domain = 'listening' and (select private.listening_practice_version_is_accessible(versions.id)))
        or sets.domain in ('vocabulary', 'grammar')
      )
  ) or exists (
    select 1
    from public.learner_attempts as attempts
    where attempts.user_id = (select auth.uid())
      and attempts.exercise_set_version_id = target_version_id
  );
$$;

revoke all on function private.exercise_version_is_accessible(uuid)
from public, anon, authenticated;
grant execute on function private.exercise_version_is_accessible(uuid) to authenticated;

alter table public.listening_audio_assets enable row level security;
alter table public.listening_practice_versions enable row level security;
alter table public.listening_parts enable row level security;

revoke all on table public.listening_audio_assets from anon, authenticated;
revoke all on table public.listening_practice_versions from anon, authenticated;
revoke all on table public.listening_parts from anon, authenticated;
revoke all on table private.listening_transcripts from public, anon, authenticated;

grant select on table public.listening_audio_assets to authenticated;
grant select on table public.listening_practice_versions to authenticated;
grant select on table public.listening_parts to authenticated;

create policy "Learners can read accessible listening audio metadata"
on public.listening_audio_assets for select to authenticated
using ((select private.listening_audio_is_accessible(id)));

create policy "Learners can read accessible listening practice versions"
on public.listening_practice_versions for select to authenticated
using ((select private.listening_practice_version_is_accessible(exercise_set_version_id)));

create policy "Learners can read accessible listening parts"
on public.listening_parts for select to authenticated
using ((select private.listening_practice_version_is_accessible(exercise_set_version_id)));

create function public.validate_listening_exercise_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_domain text;
  part_count integer;
  audio_duration integer;
begin
  select sets.domain into target_domain
  from public.exercise_sets as sets
  where sets.id = new.exercise_set_id;

  if new.status = 'published' and old.status <> 'published' and target_domain = 'listening' then
    select assets.duration_seconds into audio_duration
    from public.listening_practice_versions as practice
    join public.listening_audio_assets as assets on assets.id = practice.audio_asset_id
    where practice.exercise_set_version_id = new.id;
    if audio_duration is null then
      raise exception using errcode = '23514', message = 'a published listening exercise requires an audio snapshot';
    end if;

    select count(*)::integer into part_count
    from public.listening_parts as parts
    where parts.exercise_set_version_id = new.id;
    if part_count = 0 then
      raise exception using errcode = '23514', message = 'a published listening exercise requires at least one part';
    end if;
    if (
      select min(parts.position) <> 1 or max(parts.position) <> count(*)
      from public.listening_parts as parts
      where parts.exercise_set_version_id = new.id
    ) then
      raise exception using errcode = '23514', message = 'published listening part positions must be contiguous';
    end if;
    if exists (
      select 1 from public.listening_parts as parts
      where parts.exercise_set_version_id = new.id
        and parts.audio_end_seconds > audio_duration
    ) then
      raise exception using errcode = '23514', message = 'listening part exceeds the declared audio duration';
    end if;
    if exists (
      select 1
      from public.exercise_questions as questions
      left join public.listening_parts as parts
        on parts.id = questions.listening_part_id
       and parts.exercise_set_version_id = questions.exercise_set_version_id
      where questions.exercise_set_version_id = new.id
        and (
          parts.id is null
          or questions.question_type not in ('single_choice', 'multiple_choice', 'short_text')
          or questions.reading_question_group_id is not null
        )
    ) then
      raise exception using errcode = '23514', message = 'listening questions require a valid part and supported type';
    end if;
    if not exists (
      select 1
      from public.listening_practice_versions as practice
      join private.listening_transcripts as transcripts on transcripts.audio_asset_id = practice.audio_asset_id
      where practice.exercise_set_version_id = new.id
    ) then
      raise exception using errcode = '23514', message = 'a published listening exercise requires a private transcript';
    end if;
  elsif target_domain <> 'listening' and exists (
    select 1 from public.exercise_questions as questions
    where questions.exercise_set_version_id = new.id
      and questions.listening_part_id is not null
  ) then
    raise exception using errcode = '23514', message = 'non-listening exercises cannot use listening parts';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_listening_exercise_publication()
from public, anon, authenticated;

create trigger validate_listening_exercise_before_publish
before update on public.exercise_set_versions
for each row execute function public.validate_listening_exercise_publication();

create or replace function public.start_exercise_attempt(
  p_exercise_slug text,
  p_idempotency_key text
)
returns public.learner_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_set_id uuid;
  target_version_id uuid;
  target_domain text;
  target_time_limit integer;
  attempt_started_at timestamptz := now();
  result public.learner_attempts;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  if p_exercise_slug is null or p_exercise_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'invalid exercise slug';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  if not (select private.completed_learner_exists()) then
    raise exception using errcode = '42501', message = 'completed onboarding required';
  end if;

  select sets.id, versions.id, sets.domain,
    coalesce(reading.time_limit_seconds, listening.time_limit_seconds)
  into target_set_id, target_version_id, target_domain, target_time_limit
  from public.exercise_sets as sets
  join public.exercise_set_versions as versions on versions.exercise_set_id = sets.id
  left join public.reading_practice_versions as reading on reading.exercise_set_version_id = versions.id
  left join public.listening_practice_versions as listening on listening.exercise_set_version_id = versions.id
  where sets.slug = p_exercise_slug
    and versions.status = 'published'
    and versions.published_at <= now()
    and (select private.exercise_version_is_accessible(versions.id));
  if target_version_id is null then raise exception using errcode = 'P0002', message = 'exercise not found'; end if;

  select attempts.* into result
  from public.learner_attempts as attempts
  where attempts.user_id = actor_id and attempts.start_idempotency_key = p_idempotency_key;
  if found then
    if result.exercise_set_id <> target_set_id then
      raise exception using errcode = '23505', message = 'idempotency key belongs to another exercise';
    end if;
    return result;
  end if;

  insert into public.learner_attempts (
    user_id, exercise_set_id, exercise_set_version_id, start_idempotency_key,
    started_at, time_limit_seconds, reading_time_limit_seconds, expires_at
  ) values (
    actor_id, target_set_id, target_version_id, p_idempotency_key,
    attempt_started_at, target_time_limit,
    case when target_domain = 'reading' then target_time_limit else null end,
    case when target_time_limit is null then null else attempt_started_at + make_interval(secs => target_time_limit) end
  )
  on conflict (user_id, exercise_set_id) where status = 'in_progress'
  do update set last_saved_at = now(), updated_at = now()
  returning * into result;
  return result;
end;
$$;

create function public.get_listening_attempt_clock(p_attempt_id uuid)
returns table (
  attempt_id uuid,
  started_at timestamptz,
  expires_at timestamptz,
  server_now timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select attempts.id, attempts.started_at, attempts.expires_at, now()
  from public.learner_attempts as attempts
  join public.exercise_sets as sets on sets.id = attempts.exercise_set_id
  where attempts.id = p_attempt_id
    and attempts.user_id = (select auth.uid())
    and sets.domain = 'listening';
$$;

create function public.get_listening_attempt_result(p_attempt_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_attempt public.learner_attempts;
  base_result jsonb;
  transcript text;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  select attempts.* into target_attempt
  from public.learner_attempts as attempts
  join public.exercise_sets as sets on sets.id = attempts.exercise_set_id
  where attempts.id = p_attempt_id and attempts.user_id = actor_id and sets.domain = 'listening';
  if not found then raise exception using errcode = 'P0002', message = 'listening attempt not found'; end if;
  base_result := public.get_exercise_attempt_result(p_attempt_id);
  select transcripts.transcript_markdown into transcript
  from public.listening_practice_versions as practice
  join private.listening_transcripts as transcripts on transcripts.audio_asset_id = practice.audio_asset_id
  where practice.exercise_set_version_id = target_attempt.exercise_set_version_id;
  return base_result || jsonb_build_object('transcriptMarkdown', transcript);
end;
$$;

revoke all on function public.start_exercise_attempt(text, text)
from public, anon, authenticated;
revoke all on function public.get_listening_attempt_clock(uuid)
from public, anon, authenticated;
revoke all on function public.get_listening_attempt_result(uuid)
from public, anon, authenticated;

grant execute on function public.start_exercise_attempt(text, text) to authenticated;
grant execute on function public.get_listening_attempt_clock(uuid) to authenticated;
grant execute on function public.get_listening_attempt_result(uuid) to authenticated;

comment on table public.listening_audio_assets is
  'Controlled Listening audio snapshots with path, duration, checksum, source and licence provenance.';
comment on table public.listening_practice_versions is
  'Pins one exercise version to one controlled audio snapshot, learner test type and database-owned time limit.';
comment on table public.listening_parts is
  'Ordered Listening parts with immutable audio ranges and learner-visible instructions.';
comment on table private.listening_transcripts is
  'Private transcripts released only by the post-submit owner-scoped result RPC.';
comment on column public.learner_attempts.time_limit_seconds is
  'Generic server-derived attempt limit. Client timer values are never accepted as authority.';
comment on function public.get_listening_attempt_clock(uuid) is
  'Returns an owner-scoped database clock snapshot for a non-authoritative Listening countdown.';
comment on function public.get_listening_attempt_result(uuid) is
  'Returns Listening review data and transcript only after the owner has submitted the attempt.';

commit;

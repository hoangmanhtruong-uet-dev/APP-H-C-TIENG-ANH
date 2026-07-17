create table public.mock_tests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mock_tests_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint mock_tests_display_order_check check (display_order between 0 and 10000),
  constraint mock_tests_id_pair_unique unique (id, slug)
);

create table public.mock_test_versions (
  id uuid primary key default gen_random_uuid(),
  mock_test_id uuid not null references public.mock_tests (id) on delete restrict,
  version smallint not null,
  title text not null,
  description text not null,
  test_type text not null,
  difficulty text not null,
  estimated_minutes integer not null,
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mock_test_versions_test_version_unique unique (mock_test_id, version),
  constraint mock_test_versions_test_id_unique unique (mock_test_id, id),
  constraint mock_test_versions_version_check check (version between 1 and 32767),
  constraint mock_test_versions_title_check check (btrim(title) <> '' and char_length(title) <= 180),
  constraint mock_test_versions_description_check check (btrim(description) <> '' and char_length(description) <= 2000),
  constraint mock_test_versions_test_type_check check (test_type in ('academic', 'general_training', 'both')),
  constraint mock_test_versions_difficulty_check check (difficulty in ('beginner', 'intermediate', 'advanced')),
  constraint mock_test_versions_minutes_check check (estimated_minutes between 1 and 600),
  constraint mock_test_versions_status_check check (status in ('draft', 'published', 'archived')),
  constraint mock_test_versions_publication_check check (
    (status = 'draft' and published_at is null)
    or (status in ('published', 'archived') and published_at is not null)
  )
);

create unique index mock_test_versions_one_published_idx
on public.mock_test_versions (mock_test_id) where status = 'published';
create index mock_test_versions_catalog_idx
on public.mock_test_versions (status, test_type, mock_test_id, version desc);

create table public.mock_test_sections (
  id uuid primary key default gen_random_uuid(),
  mock_test_version_id uuid not null references public.mock_test_versions (id) on delete restrict,
  section_type text not null,
  section_order smallint not null,
  time_limit_seconds integer not null,
  required boolean not null default true,
  exercise_set_version_id uuid references public.exercise_set_versions (id) on delete restrict,
  writing_task_version_id uuid references public.writing_task_versions (id) on delete restrict,
  speaking_set_version_id uuid references public.speaking_set_versions (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mock_test_sections_version_order_unique unique (mock_test_version_id, section_order),
  constraint mock_test_sections_version_type_unique unique (mock_test_version_id, section_type),
  constraint mock_test_sections_version_id_unique unique (mock_test_version_id, id),
  constraint mock_test_sections_type_check check (section_type in ('reading', 'listening', 'writing', 'speaking')),
  constraint mock_test_sections_order_check check (section_order between 1 and 20),
  constraint mock_test_sections_time_check check (time_limit_seconds between 60 and 7200),
  constraint mock_test_sections_link_check check (
    (section_type in ('reading', 'listening') and exercise_set_version_id is not null
      and writing_task_version_id is null and speaking_set_version_id is null)
    or (section_type = 'writing' and exercise_set_version_id is null
      and writing_task_version_id is not null and speaking_set_version_id is null)
    or (section_type = 'speaking' and exercise_set_version_id is null
      and writing_task_version_id is null and speaking_set_version_id is not null)
  )
);

create index mock_test_sections_exercise_version_idx
on public.mock_test_sections (exercise_set_version_id) where exercise_set_version_id is not null;
create index mock_test_sections_writing_version_idx
on public.mock_test_sections (writing_task_version_id) where writing_task_version_id is not null;
create index mock_test_sections_speaking_version_idx
on public.mock_test_sections (speaking_set_version_id) where speaking_set_version_id is not null;

create table public.mock_test_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mock_test_id uuid not null references public.mock_tests (id) on delete restrict,
  mock_test_version_id uuid not null,
  status text not null default 'in_progress',
  current_section_order smallint,
  start_idempotency_key text not null,
  submit_idempotency_key text,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mock_test_sessions_test_version_fkey foreign key (mock_test_id, mock_test_version_id)
    references public.mock_test_versions (mock_test_id, id) on delete restrict,
  constraint mock_test_sessions_id_user_unique unique (id, user_id),
  constraint mock_test_sessions_id_version_unique unique (id, mock_test_version_id),
  constraint mock_test_sessions_status_check check (status in ('in_progress', 'submitted', 'completed', 'abandoned')),
  constraint mock_test_sessions_current_order_check check (current_section_order is null or current_section_order between 1 and 20),
  constraint mock_test_sessions_start_key_check check (btrim(start_idempotency_key) <> '' and char_length(start_idempotency_key) <= 200),
  constraint mock_test_sessions_submit_key_check check (
    submit_idempotency_key is null or (btrim(submit_idempotency_key) <> '' and char_length(submit_idempotency_key) <= 200)
  ),
  constraint mock_test_sessions_user_start_key_unique unique (user_id, start_idempotency_key),
  constraint mock_test_sessions_user_submit_key_unique unique (user_id, submit_idempotency_key),
  constraint mock_test_sessions_state_check check (
    (status = 'in_progress' and submitted_at is null and completed_at is null)
    or (status = 'submitted' and submitted_at is not null and completed_at is null and submit_idempotency_key is not null)
    or (status = 'completed' and submitted_at is not null and completed_at is not null and submit_idempotency_key is not null)
    or (status = 'abandoned' and completed_at is null)
  )
);

create unique index mock_test_sessions_one_active_test_idx
on public.mock_test_sessions (user_id, mock_test_id) where status in ('in_progress', 'submitted');
create index mock_test_sessions_user_recent_idx
on public.mock_test_sessions (user_id, status, coalesce(completed_at, submitted_at, started_at) desc);
create index mock_test_sessions_version_idx on public.mock_test_sessions (mock_test_version_id);

create table public.mock_test_section_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  mock_test_version_id uuid not null,
  mock_test_section_id uuid not null,
  section_type text not null,
  status text not null default 'in_progress',
  start_idempotency_key text not null,
  submit_idempotency_key text,
  learner_attempt_id uuid references public.learner_attempts (id) on delete restrict,
  writing_submission_id uuid references public.writing_submissions (id) on delete restrict,
  speaking_attempt_id uuid references public.speaking_attempts (id) on delete restrict,
  started_at timestamptz not null,
  expires_at timestamptz not null,
  submitted_at timestamptz,
  submitted_after_time_limit boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mock_test_section_attempts_session_owner_fkey foreign key (session_id, user_id)
    references public.mock_test_sessions (id, user_id) on delete restrict,
  constraint mock_test_section_attempts_session_version_fkey foreign key (session_id, mock_test_version_id)
    references public.mock_test_sessions (id, mock_test_version_id) on delete restrict,
  constraint mock_test_section_attempts_section_version_fkey foreign key (mock_test_version_id, mock_test_section_id)
    references public.mock_test_sections (mock_test_version_id, id) on delete restrict,
  constraint mock_test_section_attempts_session_section_unique unique (session_id, mock_test_section_id),
  constraint mock_test_section_attempts_user_start_key_unique unique (user_id, start_idempotency_key),
  constraint mock_test_section_attempts_user_submit_key_unique unique (user_id, submit_idempotency_key),
  constraint mock_test_section_attempts_learner_attempt_unique unique (learner_attempt_id),
  constraint mock_test_section_attempts_writing_submission_unique unique (writing_submission_id),
  constraint mock_test_section_attempts_speaking_attempt_unique unique (speaking_attempt_id),
  constraint mock_test_section_attempts_type_check check (section_type in ('reading', 'listening', 'writing', 'speaking')),
  constraint mock_test_section_attempts_status_check check (status in ('in_progress', 'submitted', 'skipped')),
  constraint mock_test_section_attempts_start_key_check check (btrim(start_idempotency_key) <> '' and char_length(start_idempotency_key) <= 200),
  constraint mock_test_section_attempts_submit_key_check check (
    submit_idempotency_key is null or (btrim(submit_idempotency_key) <> '' and char_length(submit_idempotency_key) <= 200)
  ),
  constraint mock_test_section_attempts_time_check check (expires_at > started_at),
  constraint mock_test_section_attempts_link_check check (
    (status = 'skipped' and learner_attempt_id is null and writing_submission_id is null and speaking_attempt_id is null)
    or (section_type in ('reading', 'listening') and learner_attempt_id is not null
      and writing_submission_id is null and speaking_attempt_id is null)
    or (section_type = 'writing' and learner_attempt_id is null
      and writing_submission_id is not null and speaking_attempt_id is null)
    or (section_type = 'speaking' and learner_attempt_id is null
      and writing_submission_id is null and speaking_attempt_id is not null)
  ),
  constraint mock_test_section_attempts_state_check check (
    (status = 'in_progress' and submitted_at is null and submit_idempotency_key is null and submitted_after_time_limit is null)
    or (status = 'submitted' and submitted_at is not null and submit_idempotency_key is not null and submitted_after_time_limit is not null)
    or (status = 'skipped' and submitted_at is not null and submit_idempotency_key is not null and submitted_after_time_limit is not null)
  )
);

create index mock_test_section_attempts_user_recent_idx
on public.mock_test_section_attempts (user_id, status, started_at desc);
create index mock_test_section_attempts_session_order_idx
on public.mock_test_section_attempts (session_id, mock_test_section_id);

create table public.mock_test_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique,
  user_id uuid not null,
  mock_test_version_id uuid not null,
  reading_score smallint,
  reading_max_score smallint,
  listening_score smallint,
  listening_max_score smallint,
  writing_submission_id uuid references public.writing_submissions (id) on delete restrict,
  speaking_attempt_id uuid references public.speaking_attempts (id) on delete restrict,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint mock_test_results_session_owner_fkey foreign key (session_id, user_id)
    references public.mock_test_sessions (id, user_id) on delete restrict,
  constraint mock_test_results_session_version_fkey foreign key (session_id, mock_test_version_id)
    references public.mock_test_sessions (id, mock_test_version_id) on delete restrict,
  constraint mock_test_results_reading_score_check check (
    (reading_score is null and reading_max_score is null)
    or (reading_score between 0 and reading_max_score and reading_max_score > 0)
  ),
  constraint mock_test_results_listening_score_check check (
    (listening_score is null and listening_max_score is null)
    or (listening_score between 0 and listening_max_score and listening_max_score > 0)
  )
);

create index mock_test_results_user_recent_idx on public.mock_test_results (user_id, generated_at desc);
create index mock_test_results_version_idx on public.mock_test_results (mock_test_version_id);

create trigger mock_tests_set_updated_at before update on public.mock_tests
for each row execute function public.set_profile_updated_at();
create trigger mock_test_versions_set_updated_at before update on public.mock_test_versions
for each row execute function public.set_profile_updated_at();
create trigger mock_test_sections_set_updated_at before update on public.mock_test_sections
for each row execute function public.set_profile_updated_at();
create trigger mock_test_sessions_set_updated_at before update on public.mock_test_sessions
for each row execute function public.set_profile_updated_at();
create trigger mock_test_section_attempts_set_updated_at before update on public.mock_test_section_attempts
for each row execute function public.set_profile_updated_at();

create function public.validate_mock_test_version_publication()
returns trigger language plpgsql set search_path = '' as $$
declare
  section_count integer;
  invalid_count integer;
  total_seconds integer;
begin
  if new.status <> 'published' or (tg_op = 'UPDATE' and old.status = 'published') then return new; end if;

  select count(*), coalesce(sum(sections.time_limit_seconds), 0)
  into section_count, total_seconds
  from public.mock_test_sections sections
  where sections.mock_test_version_id = new.id;
  if section_count <> 4 then raise exception 'Published mock test requires exactly four sections'; end if;
  if exists (
    select 1 from generate_series(1, 4) expected(position)
    where not exists (
      select 1 from public.mock_test_sections sections
      where sections.mock_test_version_id = new.id and sections.section_order = expected.position
    )
  ) then raise exception 'Mock test section ordering must be contiguous'; end if;
  if exists (
    select 1 from (values ('reading'), ('listening'), ('writing'), ('speaking')) required_types(section_type)
    where not exists (
      select 1 from public.mock_test_sections sections
      where sections.mock_test_version_id = new.id and sections.section_type = required_types.section_type
        and sections.required
    )
  ) then raise exception 'Published mock test requires all four required skill sections'; end if;

  select count(*) into invalid_count
  from public.mock_test_sections sections
  left join public.exercise_set_versions exercise_versions on exercise_versions.id = sections.exercise_set_version_id
  left join public.exercise_sets exercise_sets on exercise_sets.id = exercise_versions.exercise_set_id
  left join public.reading_practice_versions reading on reading.exercise_set_version_id = sections.exercise_set_version_id
  left join public.reading_passage_versions passages on passages.id = reading.reading_passage_version_id
  left join public.reading_passages passage_roots on passage_roots.id = passages.reading_passage_id
  left join public.listening_practice_versions listening on listening.exercise_set_version_id = sections.exercise_set_version_id
  left join public.writing_task_versions writing on writing.id = sections.writing_task_version_id
  left join public.speaking_set_versions speaking on speaking.id = sections.speaking_set_version_id
  where sections.mock_test_version_id = new.id and (
    (sections.section_type = 'reading' and (
      exercise_sets.domain is distinct from 'reading' or exercise_versions.status is distinct from 'published'
      or passages.status is distinct from 'published' or sections.time_limit_seconds is distinct from reading.time_limit_seconds
      or (new.test_type <> 'both' and passage_roots.test_type not in (new.test_type, 'both'))
    ))
    or (sections.section_type = 'listening' and (
      exercise_sets.domain is distinct from 'listening' or exercise_versions.status is distinct from 'published'
      or sections.time_limit_seconds is distinct from listening.time_limit_seconds
      or (new.test_type <> 'both' and listening.test_type not in (new.test_type, 'both'))
    ))
    or (sections.section_type = 'writing' and (
      writing.status is distinct from 'published' or sections.time_limit_seconds is distinct from writing.time_limit_seconds
      or (new.test_type <> 'both' and writing.test_type not in (new.test_type, 'both'))
    ))
    or (sections.section_type = 'speaking' and (
      speaking.status is distinct from 'published'
      or (new.test_type <> 'both' and speaking.test_type not in (new.test_type, 'both'))
    ))
  );
  if invalid_count > 0 then raise exception 'Mock test contains an invalid or incompatible section link'; end if;
  if new.estimated_minutes <> ceil(total_seconds / 60.0)::integer then
    raise exception 'Mock test estimated minutes must equal section time total';
  end if;
  return new;
end; $$;

create trigger validate_mock_test_version_publication
before insert or update of status on public.mock_test_versions
for each row execute function public.validate_mock_test_version_publication();

create function public.protect_mock_test_content()
returns trigger language plpgsql set search_path = '' as $$
declare parent_status text;
begin
  if tg_table_name = 'mock_test_versions' then
    if tg_op = 'DELETE' and old.status in ('published', 'archived') then raise exception 'Published mock test versions cannot be deleted'; end if;
    if tg_op = 'UPDATE' and old.status in ('published', 'archived') then
      if old.mock_test_id is distinct from new.mock_test_id or old.version is distinct from new.version
        or old.title is distinct from new.title or old.description is distinct from new.description
        or old.test_type is distinct from new.test_type or old.difficulty is distinct from new.difficulty
        or old.estimated_minutes is distinct from new.estimated_minutes or old.published_at is distinct from new.published_at
        or not (old.status = 'published' and new.status = 'archived') then
        raise exception 'Published mock test versions are immutable';
      end if;
    end if;
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  select versions.status into parent_status from public.mock_test_versions versions
  where versions.id = coalesce(new.mock_test_version_id, old.mock_test_version_id);
  if parent_status in ('published', 'archived') then raise exception 'Published mock test sections are immutable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;

create trigger protect_mock_test_version before update or delete on public.mock_test_versions
for each row execute function public.protect_mock_test_content();
create trigger protect_mock_test_section before insert or update or delete on public.mock_test_sections
for each row execute function public.protect_mock_test_content();

create function private.mock_test_version_is_accessible(target_version_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.mock_test_versions versions
    join public.learner_profiles learners on learners.user_id = (select auth.uid())
    where versions.id = target_version_id
      and learners.onboarding_completed_at is not null
      and (
        (versions.status = 'published' and versions.published_at <= now()
          and (versions.test_type = 'both' or versions.test_type = learners.test_type))
        or exists (
          select 1 from public.mock_test_sessions sessions
          where sessions.mock_test_version_id = versions.id and sessions.user_id = (select auth.uid())
        )
      )
  );
$$;

create function private.mock_test_is_accessible(target_test_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.mock_test_versions versions
    where versions.mock_test_id = target_test_id
      and (select private.mock_test_version_is_accessible(versions.id))
  );
$$;

alter table public.mock_tests enable row level security;
alter table public.mock_test_versions enable row level security;
alter table public.mock_test_sections enable row level security;
alter table public.mock_test_sessions enable row level security;
alter table public.mock_test_section_attempts enable row level security;
alter table public.mock_test_results enable row level security;

revoke all on table public.mock_tests, public.mock_test_versions, public.mock_test_sections,
  public.mock_test_sessions, public.mock_test_section_attempts, public.mock_test_results
from public, anon, authenticated;
grant select on table public.mock_tests, public.mock_test_versions, public.mock_test_sections,
  public.mock_test_sessions, public.mock_test_section_attempts, public.mock_test_results
to authenticated;

create policy "Learners can read accessible mock tests" on public.mock_tests
for select to authenticated using ((select private.mock_test_is_accessible(id)));
create policy "Learners can read accessible mock test versions" on public.mock_test_versions
for select to authenticated using ((select private.mock_test_version_is_accessible(id)));
create policy "Learners can read accessible mock test sections" on public.mock_test_sections
for select to authenticated using ((select private.mock_test_version_is_accessible(mock_test_version_id)));
create policy "Learners can read their mock test sessions" on public.mock_test_sessions
for select to authenticated using (user_id = (select auth.uid()));
create policy "Learners can read their mock section attempts" on public.mock_test_section_attempts
for select to authenticated using (user_id = (select auth.uid()));
create policy "Learners can read their mock test results" on public.mock_test_results
for select to authenticated using (user_id = (select auth.uid()));

create function public.start_mock_test(p_mock_test_slug text, p_idempotency_key text)
returns public.mock_test_sessions language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_test public.mock_tests; target_version public.mock_test_versions;
  first_section smallint; result public.mock_test_sessions;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  if p_mock_test_slug is null or p_mock_test_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'invalid mock test slug';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  select versions.* into target_version
  from public.mock_tests tests
  join public.mock_test_versions versions on versions.mock_test_id = tests.id
  join public.learner_profiles learners on learners.user_id = actor_id
  where tests.slug = p_mock_test_slug and versions.status = 'published' and versions.published_at <= now()
    and learners.onboarding_completed_at is not null
    and (versions.test_type = 'both' or versions.test_type = learners.test_type)
  order by versions.version desc limit 1;
  if target_version.id is null then raise exception using errcode = 'P0002', message = 'mock test not found'; end if;
  select * into target_test from public.mock_tests where id = target_version.mock_test_id;
  select min(section_order) into first_section from public.mock_test_sections where mock_test_version_id = target_version.id;

  select sessions.* into result from public.mock_test_sessions sessions
  where sessions.user_id = actor_id and sessions.start_idempotency_key = p_idempotency_key;
  if found then
    if result.mock_test_id <> target_test.id then raise exception using errcode = '23505', message = 'idempotency key conflict'; end if;
    return result;
  end if;
  select sessions.* into result from public.mock_test_sessions sessions
  where sessions.user_id = actor_id and sessions.mock_test_id = target_test.id
    and sessions.status in ('in_progress', 'submitted') for update;
  if found then return result; end if;
  insert into public.mock_test_sessions (
    user_id, mock_test_id, mock_test_version_id, current_section_order, start_idempotency_key
  ) values (actor_id, target_test.id, target_version.id, first_section, p_idempotency_key)
  returning * into result;
  return result;
end; $$;

create function public.start_mock_test_section(
  p_session_id uuid, p_section_id uuid, p_idempotency_key text
)
returns public.mock_test_section_attempts language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_session public.mock_test_sessions; target_section public.mock_test_sections;
  result public.mock_test_section_attempts; attempt public.learner_attempts;
  submission public.writing_submissions; speaking public.speaking_attempts;
  target_set_id uuid; target_task_id uuid; target_speaking_set_id uuid; target_domain text;
  section_started_at timestamptz := now(); section_expires_at timestamptz;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  select * into target_session from public.mock_test_sessions
  where id = p_session_id and user_id = actor_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'mock session not found'; end if;
  if target_session.status <> 'in_progress' then raise exception using errcode = 'P0001', message = 'mock session is not editable'; end if;
  select * into target_section from public.mock_test_sections
  where id = p_section_id and mock_test_version_id = target_session.mock_test_version_id;
  if not found then raise exception using errcode = 'P0002', message = 'mock section not found'; end if;
  if target_session.current_section_order is distinct from target_section.section_order then
    raise exception using errcode = 'P0001', message = 'mock sections must be completed in order';
  end if;
  select * into result from public.mock_test_section_attempts
  where session_id = target_session.id and mock_test_section_id = target_section.id;
  if found then return result; end if;
  select * into result from public.mock_test_section_attempts
  where user_id = actor_id and start_idempotency_key = p_idempotency_key;
  if found then raise exception using errcode = '23505', message = 'idempotency key conflict'; end if;

  section_expires_at := section_started_at + make_interval(secs => target_section.time_limit_seconds);
  if target_section.section_type in ('reading', 'listening') then
    select versions.exercise_set_id, sets.domain into target_set_id, target_domain
    from public.exercise_set_versions versions join public.exercise_sets sets on sets.id = versions.exercise_set_id
    where versions.id = target_section.exercise_set_version_id;
    select * into attempt from public.learner_attempts
    where user_id = actor_id and exercise_set_id = target_set_id and status = 'in_progress' for update;
    if found and attempt.exercise_set_version_id <> target_section.exercise_set_version_id then
      raise exception using errcode = 'P0001', message = 'finish the existing practice attempt before starting this mock section';
    end if;
    if not found then
      insert into public.learner_attempts (
        user_id, exercise_set_id, exercise_set_version_id, start_idempotency_key,
        started_at, time_limit_seconds, reading_time_limit_seconds, expires_at
      ) values (
        actor_id, target_set_id, target_section.exercise_set_version_id, p_idempotency_key,
        section_started_at, target_section.time_limit_seconds,
        case when target_domain = 'reading' then target_section.time_limit_seconds else null end,
        section_expires_at
      ) returning * into attempt;
    else
      section_started_at := attempt.started_at;
      section_expires_at := attempt.expires_at;
    end if;
  elsif target_section.section_type = 'writing' then
    select writing_task_id into target_task_id from public.writing_task_versions where id = target_section.writing_task_version_id;
    select * into submission from public.writing_submissions
    where user_id = actor_id and writing_task_id = target_task_id and status = 'draft' for update;
    if found and submission.writing_task_version_id <> target_section.writing_task_version_id then
      raise exception using errcode = 'P0001', message = 'finish the existing writing draft before starting this mock section';
    end if;
    if not found then
      insert into public.writing_submissions (
        user_id, writing_task_id, writing_task_version_id, start_idempotency_key,
        started_at, last_saved_at, expires_at
      ) values (
        actor_id, target_task_id, target_section.writing_task_version_id, p_idempotency_key,
        section_started_at, section_started_at, section_expires_at
      ) returning * into submission;
    else
      section_started_at := submission.started_at;
      section_expires_at := submission.expires_at;
    end if;
  else
    select speaking_set_id into target_speaking_set_id from public.speaking_set_versions where id = target_section.speaking_set_version_id;
    select * into speaking from public.speaking_attempts
    where user_id = actor_id and speaking_set_id = target_speaking_set_id and status = 'in_progress' for update;
    if found and speaking.speaking_set_version_id <> target_section.speaking_set_version_id then
      raise exception using errcode = 'P0001', message = 'finish the existing speaking attempt before starting this mock section';
    end if;
    if not found then
      insert into public.speaking_attempts (
        user_id, speaking_set_id, speaking_set_version_id, start_idempotency_key, started_at
      ) values (
        actor_id, target_speaking_set_id, target_section.speaking_set_version_id, p_idempotency_key, section_started_at
      ) returning * into speaking;
    else section_started_at := speaking.started_at; end if;
  end if;

  insert into public.mock_test_section_attempts (
    user_id, session_id, mock_test_version_id, mock_test_section_id, section_type,
    start_idempotency_key, learner_attempt_id, writing_submission_id, speaking_attempt_id,
    started_at, expires_at
  ) values (
    actor_id, target_session.id, target_session.mock_test_version_id, target_section.id, target_section.section_type,
    p_idempotency_key, attempt.id, submission.id, speaking.id, section_started_at, section_expires_at
  ) returning * into result;
  return result;
end; $$;

create function public.submit_mock_test_section(p_section_attempt_id uuid, p_idempotency_key text)
returns public.mock_test_section_attempts language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target public.mock_test_section_attempts; target_session public.mock_test_sessions;
  next_order smallint; submitted_time timestamptz := now(); result public.mock_test_section_attempts;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  select * into target from public.mock_test_section_attempts
  where id = p_section_attempt_id and user_id = actor_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'mock section attempt not found'; end if;
  if target.status = 'submitted' then return target; end if;
  select * into target_session from public.mock_test_sessions
  where id = target.session_id and user_id = actor_id for update;
  if target_session.status <> 'in_progress' then raise exception using errcode = 'P0001', message = 'mock session is not editable'; end if;

  if target.section_type in ('reading', 'listening') then
    perform public.submit_exercise_attempt(target.learner_attempt_id);
  elsif target.section_type = 'writing' then
    perform public.submit_writing_submission(target.writing_submission_id, p_idempotency_key);
  else
    perform public.submit_speaking_attempt(target.speaking_attempt_id, p_idempotency_key);
  end if;
  update public.mock_test_section_attempts set
    status = 'submitted', submit_idempotency_key = p_idempotency_key,
    submitted_at = submitted_time, submitted_after_time_limit = submitted_time > expires_at
  where id = target.id returning * into result;
  select min(sections.section_order) into next_order
  from public.mock_test_sections sections
  where sections.mock_test_version_id = target.mock_test_version_id
    and sections.section_order > target_session.current_section_order;
  update public.mock_test_sessions set current_section_order = next_order where id = target_session.id;
  return result;
end; $$;

create function public.skip_mock_test_section(p_session_id uuid, p_section_id uuid, p_idempotency_key text)
returns public.mock_test_section_attempts language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_session public.mock_test_sessions; target_section public.mock_test_sections;
  next_order smallint; result public.mock_test_section_attempts;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  select * into target_session from public.mock_test_sessions where id = p_session_id and user_id = actor_id for update;
  if not found or target_session.status <> 'in_progress' then raise exception using errcode = 'P0001', message = 'mock session is not editable'; end if;
  select * into target_section from public.mock_test_sections
  where id = p_section_id and mock_test_version_id = target_session.mock_test_version_id;
  if not found or target_section.required or target_session.current_section_order is distinct from target_section.section_order then
    raise exception using errcode = 'P0001', message = 'mock section cannot be skipped';
  end if;
  insert into public.mock_test_section_attempts (
    user_id, session_id, mock_test_version_id, mock_test_section_id, section_type, status,
    start_idempotency_key, submit_idempotency_key, started_at, expires_at, submitted_at, submitted_after_time_limit
  ) values (
    actor_id, target_session.id, target_session.mock_test_version_id, target_section.id, target_section.section_type, 'skipped',
    p_idempotency_key, p_idempotency_key, now(), now() + make_interval(secs => target_section.time_limit_seconds), now(), false
  ) on conflict (session_id, mock_test_section_id) do update set updated_at = now()
  returning * into result;
  select min(section_order) into next_order from public.mock_test_sections
  where mock_test_version_id = target_session.mock_test_version_id and section_order > target_section.section_order;
  update public.mock_test_sessions set current_section_order = next_order where id = target_session.id;
  return result;
end; $$;

create function public.get_mock_test_section_clock(p_section_attempt_id uuid)
returns table (section_attempt_id uuid, started_at timestamptz, expires_at timestamptz, server_now timestamptz, submitted_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select attempts.id, attempts.started_at, attempts.expires_at, now(), attempts.submitted_at
  from public.mock_test_section_attempts attempts
  where attempts.id = p_section_attempt_id and attempts.user_id = (select auth.uid());
$$;

create function public.submit_mock_test(p_session_id uuid, p_idempotency_key text)
returns public.mock_test_sessions language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target public.mock_test_sessions; result public.mock_test_sessions;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  select * into target from public.mock_test_sessions where id = p_session_id and user_id = actor_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'mock session not found'; end if;
  if target.status in ('submitted', 'completed') then return target; end if;
  if target.status <> 'in_progress' then raise exception using errcode = 'P0001', message = 'mock session cannot be submitted'; end if;
  if exists (
    select 1 from public.mock_test_sections sections
    where sections.mock_test_version_id = target.mock_test_version_id and sections.required
      and not exists (
        select 1 from public.mock_test_section_attempts attempts
        where attempts.session_id = target.id and attempts.mock_test_section_id = sections.id and attempts.status = 'submitted'
      )
  ) then raise exception using errcode = 'P0001', message = 'all required mock sections must be submitted'; end if;
  update public.mock_test_sessions set status = 'submitted', submit_idempotency_key = p_idempotency_key,
    submitted_at = now(), current_section_order = null
  where id = target.id returning * into result;
  return result;
end; $$;

create function public.complete_mock_test(p_session_id uuid)
returns public.mock_test_results language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target public.mock_test_sessions; result public.mock_test_results;
  reading_attempt public.learner_attempts; listening_attempt public.learner_attempts;
  writing_id uuid; speaking_id uuid;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  select * into target from public.mock_test_sessions where id = p_session_id and user_id = actor_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'mock session not found'; end if;
  select * into result from public.mock_test_results where session_id = target.id;
  if found then return result; end if;
  if target.status <> 'submitted' then raise exception using errcode = 'P0001', message = 'mock session must be submitted first'; end if;
  select attempts.* into reading_attempt
  from public.mock_test_section_attempts sections join public.learner_attempts attempts on attempts.id = sections.learner_attempt_id
  where sections.session_id = target.id and sections.section_type = 'reading' and sections.status = 'submitted';
  select attempts.* into listening_attempt
  from public.mock_test_section_attempts sections join public.learner_attempts attempts on attempts.id = sections.learner_attempt_id
  where sections.session_id = target.id and sections.section_type = 'listening' and sections.status = 'submitted';
  select sections.writing_submission_id into writing_id from public.mock_test_section_attempts sections
  where sections.session_id = target.id and sections.section_type = 'writing' and sections.status = 'submitted';
  select sections.speaking_attempt_id into speaking_id from public.mock_test_section_attempts sections
  where sections.session_id = target.id and sections.section_type = 'speaking' and sections.status = 'submitted';
  if reading_attempt.status <> 'scored' or listening_attempt.status <> 'scored' or writing_id is null or speaking_id is null then
    raise exception using errcode = 'P0001', message = 'mock section results are not ready';
  end if;
  insert into public.mock_test_results (
    session_id, user_id, mock_test_version_id, reading_score, reading_max_score,
    listening_score, listening_max_score, writing_submission_id, speaking_attempt_id
  ) values (
    target.id, actor_id, target.mock_test_version_id, reading_attempt.score, reading_attempt.max_score,
    listening_attempt.score, listening_attempt.max_score, writing_id, speaking_id
  ) returning * into result;
  update public.mock_test_sessions set status = 'completed', completed_at = now() where id = target.id;
  return result;
end; $$;

revoke all on function public.validate_mock_test_version_publication() from public, anon, authenticated;
revoke all on function public.protect_mock_test_content() from public, anon, authenticated;
revoke all on function private.mock_test_version_is_accessible(uuid) from public, anon, authenticated;
revoke all on function private.mock_test_is_accessible(uuid) from public, anon, authenticated;
grant execute on function private.mock_test_version_is_accessible(uuid) to authenticated;
grant execute on function private.mock_test_is_accessible(uuid) to authenticated;

revoke all on function public.start_mock_test(text, text) from public, anon, authenticated;
revoke all on function public.start_mock_test_section(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.submit_mock_test_section(uuid, text) from public, anon, authenticated;
revoke all on function public.skip_mock_test_section(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.get_mock_test_section_clock(uuid) from public, anon, authenticated;
revoke all on function public.submit_mock_test(uuid, text) from public, anon, authenticated;
revoke all on function public.complete_mock_test(uuid) from public, anon, authenticated;
grant execute on function public.start_mock_test(text, text) to authenticated;
grant execute on function public.start_mock_test_section(uuid, uuid, text) to authenticated;
grant execute on function public.submit_mock_test_section(uuid, text) to authenticated;
grant execute on function public.skip_mock_test_section(uuid, uuid, text) to authenticated;
grant execute on function public.get_mock_test_section_clock(uuid) to authenticated;
grant execute on function public.submit_mock_test(uuid, text) to authenticated;
grant execute on function public.complete_mock_test(uuid) to authenticated;

comment on table public.mock_test_results is
  'Immutable raw-score and submission reference snapshot. Phase 10A deliberately stores no aggregate or official IELTS band.';

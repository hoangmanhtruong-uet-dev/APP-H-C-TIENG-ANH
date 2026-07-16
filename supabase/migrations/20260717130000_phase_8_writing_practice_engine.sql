create table public.writing_tasks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint writing_tasks_slug_check check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 120
  ),
  constraint writing_tasks_display_order_check check (display_order between 1 and 10000)
);

create table public.writing_task_versions (
  id uuid primary key default gen_random_uuid(),
  writing_task_id uuid not null references public.writing_tasks (id) on delete restrict,
  version smallint not null,
  task_type text not null,
  test_type text not null,
  title text not null,
  description text not null,
  prompt_text text not null,
  instructions text not null,
  difficulty text not null,
  word_target integer not null,
  minimum_words integer not null,
  maximum_words integer not null,
  time_limit_seconds integer not null,
  status text not null default 'draft',
  source_name text not null,
  licence text not null,
  content_checksum text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint writing_task_versions_task_version_unique unique (writing_task_id, version),
  constraint writing_task_versions_task_id_id_unique unique (writing_task_id, id),
  constraint writing_task_versions_version_check check (version between 1 and 32767),
  constraint writing_task_versions_task_type_check check (task_type in ('task_1', 'task_2')),
  constraint writing_task_versions_test_type_check check (
    test_type in ('academic', 'general_training', 'both')
  ),
  constraint writing_task_versions_title_check check (
    btrim(title) <> '' and char_length(title) <= 180
  ),
  constraint writing_task_versions_description_check check (
    btrim(description) <> '' and char_length(description) <= 1000
  ),
  constraint writing_task_versions_prompt_check check (
    btrim(prompt_text) <> '' and char_length(prompt_text) <= 8000
  ),
  constraint writing_task_versions_instructions_check check (
    btrim(instructions) <> '' and char_length(instructions) <= 4000
  ),
  constraint writing_task_versions_difficulty_check check (
    difficulty in ('beginner', 'intermediate', 'advanced')
  ),
  constraint writing_task_versions_words_check check (
    minimum_words between 1 and 2000
    and word_target between minimum_words and 2000
    and maximum_words between word_target and 2000
  ),
  constraint writing_task_versions_time_limit_check check (
    time_limit_seconds between 300 and 10800
  ),
  constraint writing_task_versions_status_check check (
    status in ('draft', 'published', 'archived')
  ),
  constraint writing_task_versions_publication_check check (
    (status = 'draft' and published_at is null)
    or (status in ('published', 'archived') and published_at is not null)
  ),
  constraint writing_task_versions_source_check check (
    btrim(source_name) <> '' and char_length(source_name) <= 200
  ),
  constraint writing_task_versions_licence_check check (
    btrim(licence) <> '' and char_length(licence) <= 200
  ),
  constraint writing_task_versions_checksum_check check (
    content_checksum ~ '^[0-9a-f]{64}$'
  )
);

create unique index writing_task_versions_one_published_idx
on public.writing_task_versions (writing_task_id)
where status = 'published';

create index writing_task_versions_catalog_idx
on public.writing_task_versions (status, test_type, writing_task_id, version desc);

create table public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  writing_task_id uuid not null references public.writing_tasks (id) on delete restrict,
  writing_task_version_id uuid not null,
  status text not null default 'draft',
  draft_text text not null default '',
  submitted_text text,
  server_revision integer not null default 0,
  word_count integer not null default 0,
  minimum_words_met boolean not null default false,
  start_idempotency_key text not null,
  submit_idempotency_key text,
  content_checksum text,
  started_at timestamptz not null default now(),
  last_saved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  submitted_after_time_limit boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint writing_submissions_task_version_fkey foreign key (
    writing_task_id,
    writing_task_version_id
  ) references public.writing_task_versions (writing_task_id, id) on delete restrict,
  constraint writing_submissions_id_task_version_unique unique (
    id,
    writing_task_version_id
  ),
  constraint writing_submissions_id_user_unique unique (id, user_id),
  constraint writing_submissions_status_check check (status in ('draft', 'submitted')),
  constraint writing_submissions_revision_check check (
    server_revision between 0 and 2147483647
  ),
  constraint writing_submissions_word_count_check check (word_count between 0 and 2000),
  constraint writing_submissions_text_size_check check (
    char_length(draft_text) <= 20000
    and (submitted_text is null or char_length(submitted_text) <= 20000)
  ),
  constraint writing_submissions_start_key_check check (
    btrim(start_idempotency_key) <> '' and char_length(start_idempotency_key) <= 200
  ),
  constraint writing_submissions_submit_key_check check (
    submit_idempotency_key is null
    or (btrim(submit_idempotency_key) <> '' and char_length(submit_idempotency_key) <= 200)
  ),
  constraint writing_submissions_checksum_check check (
    content_checksum is null or content_checksum ~ '^[0-9a-f]{64}$'
  ),
  constraint writing_submissions_time_check check (
    expires_at > started_at and last_saved_at >= started_at
  ),
  constraint writing_submissions_state_check check (
    (
      status = 'draft'
      and submitted_text is null
      and submit_idempotency_key is null
      and content_checksum is null
      and submitted_at is null
      and submitted_after_time_limit is null
    )
    or (
      status = 'submitted'
      and submitted_text is not null
      and btrim(submitted_text) <> ''
      and submitted_text = draft_text
      and submit_idempotency_key is not null
      and content_checksum is not null
      and submitted_at is not null
      and submitted_after_time_limit is not null
      and word_count > 0
    )
  ),
  constraint writing_submissions_user_start_key_unique unique (user_id, start_idempotency_key),
  constraint writing_submissions_user_submit_key_unique unique (user_id, submit_idempotency_key)
);

create unique index writing_submissions_one_active_task_idx
on public.writing_submissions (user_id, writing_task_id)
where status = 'draft';

create index writing_submissions_user_status_recent_idx
on public.writing_submissions (user_id, status, coalesce(submitted_at, last_saved_at) desc);

create index writing_submissions_task_version_idx
on public.writing_submissions (writing_task_version_id);

create table public.writing_feedback_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  submission_id uuid not null,
  status text not null default 'pending',
  request_idempotency_key text not null,
  request_hash text not null,
  provider text,
  model_label text,
  prompt_version text not null default 'writing-task-2-v1',
  rubric_version text not null default 'ielts-writing-task-2-v1',
  output_schema_version text not null default 'writing-feedback-v1',
  input_checksum text not null,
  consent_version text not null,
  attempt_number smallint not null,
  finalize_nonce uuid not null default gen_random_uuid(),
  requested_at timestamptz not null default now(),
  provider_started_at timestamptz,
  lease_expires_at timestamptz not null,
  completed_at timestamptz,
  error_code text,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint writing_feedback_runs_submission_owner_fkey foreign key (
    submission_id,
    user_id
  ) references public.writing_submissions (id, user_id) on delete restrict,
  constraint writing_feedback_runs_id_submission_user_unique unique (
    id,
    submission_id,
    user_id
  ),
  constraint writing_feedback_runs_status_check check (status in ('pending', 'ready', 'failed')),
  constraint writing_feedback_runs_request_key_check check (
    btrim(request_idempotency_key) <> '' and char_length(request_idempotency_key) <= 200
  ),
  constraint writing_feedback_runs_hash_check check (
    request_hash ~ '^[0-9a-f]{64}$' and input_checksum ~ '^[0-9a-f]{64}$'
  ),
  constraint writing_feedback_runs_version_check check (
    btrim(prompt_version) <> '' and char_length(prompt_version) <= 100
    and btrim(rubric_version) <> '' and char_length(rubric_version) <= 100
    and btrim(output_schema_version) <> '' and char_length(output_schema_version) <= 100
  ),
  constraint writing_feedback_runs_consent_check check (
    consent_version = 'writing-ai-v1'
  ),
  constraint writing_feedback_runs_attempt_check check (attempt_number between 1 and 2),
  constraint writing_feedback_runs_state_check check (
    (
      status = 'pending'
      and completed_at is null
      and error_code is null
    )
    or (
      status = 'ready'
      and provider = 'openai'
      and model_label is not null
      and completed_at is not null
      and error_code is null
    )
    or (
      status = 'failed'
      and completed_at is not null
      and error_code is not null
    )
  ),
  constraint writing_feedback_runs_usage_check check (
    (input_tokens is null or input_tokens >= 0)
    and (output_tokens is null or output_tokens >= 0)
    and (latency_ms is null or latency_ms >= 0)
  ),
  constraint writing_feedback_runs_lease_check check (lease_expires_at > requested_at),
  constraint writing_feedback_runs_user_request_unique unique (user_id, request_idempotency_key)
);

create unique index writing_feedback_runs_one_pending_idx
on public.writing_feedback_runs (submission_id)
where status = 'pending';

create unique index writing_feedback_runs_one_ready_idx
on public.writing_feedback_runs (submission_id)
where status = 'ready';

create index writing_feedback_runs_user_recent_idx
on public.writing_feedback_runs (user_id, requested_at desc);

create index writing_feedback_runs_status_lease_idx
on public.writing_feedback_runs (status, lease_expires_at)
where status = 'pending';

create table public.writing_feedback (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique,
  submission_id uuid not null,
  user_id uuid not null,
  overall_band_estimate numeric(2, 1) not null,
  task_response_band numeric(2, 1) not null,
  coherence_cohesion_band numeric(2, 1) not null,
  lexical_resource_band numeric(2, 1) not null,
  grammatical_range_accuracy_band numeric(2, 1) not null,
  confidence text not null,
  summary text not null,
  criteria jsonb not null,
  strengths jsonb not null,
  priority_issues jsonb not null,
  revision_plan jsonb not null,
  corrected_examples jsonb not null,
  created_at timestamptz not null default now(),
  constraint writing_feedback_run_scope_fkey foreign key (
    run_id,
    submission_id,
    user_id
  ) references public.writing_feedback_runs (id, submission_id, user_id) on delete restrict,
  constraint writing_feedback_band_check check (
    overall_band_estimate between 0 and 9 and mod(overall_band_estimate * 2, 1) = 0
    and task_response_band between 0 and 9 and mod(task_response_band * 2, 1) = 0
    and coherence_cohesion_band between 0 and 9 and mod(coherence_cohesion_band * 2, 1) = 0
    and lexical_resource_band between 0 and 9 and mod(lexical_resource_band * 2, 1) = 0
    and grammatical_range_accuracy_band between 0 and 9
    and mod(grammatical_range_accuracy_band * 2, 1) = 0
  ),
  constraint writing_feedback_confidence_check check (confidence in ('low', 'medium', 'high')),
  constraint writing_feedback_summary_check check (
    btrim(summary) <> '' and char_length(summary) <= 2000
  ),
  constraint writing_feedback_json_types_check check (
    jsonb_typeof(criteria) = 'object'
    and jsonb_typeof(strengths) = 'array'
    and jsonb_typeof(priority_issues) = 'array'
    and jsonb_typeof(revision_plan) = 'array'
    and jsonb_typeof(corrected_examples) = 'array'
  ),
  constraint writing_feedback_collection_sizes_check check (
    jsonb_array_length(strengths) between 1 and 5
    and jsonb_array_length(priority_issues) between 3 and 5
    and jsonb_array_length(revision_plan) between 3 and 5
    and jsonb_array_length(corrected_examples) between 0 and 5
  )
);

create index writing_feedback_submission_idx
on public.writing_feedback (submission_id);

create index writing_feedback_user_recent_idx
on public.writing_feedback (user_id, created_at desc);

create trigger writing_tasks_set_updated_at before update on public.writing_tasks
for each row execute function public.set_profile_updated_at();
create trigger writing_task_versions_set_updated_at before update on public.writing_task_versions
for each row execute function public.set_profile_updated_at();
create trigger writing_submissions_set_updated_at before update on public.writing_submissions
for each row execute function public.set_profile_updated_at();
create trigger writing_feedback_runs_set_updated_at before update on public.writing_feedback_runs
for each row execute function public.set_profile_updated_at();

create function private.count_writing_words(input_text text)
returns integer
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when btrim(input_text) = '' then 0
    else cardinality(regexp_split_to_array(btrim(input_text), '\s+'))
  end;
$$;

create function public.protect_writing_task_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.status in ('published', 'archived') then
    raise exception using errcode = '55000', message = 'published writing content is immutable';
  end if;
  if tg_op = 'UPDATE' and old.status in ('published', 'archived') then
    if old.writing_task_id is distinct from new.writing_task_id
      or old.version is distinct from new.version
      or old.task_type is distinct from new.task_type
      or old.test_type is distinct from new.test_type
      or old.title is distinct from new.title
      or old.description is distinct from new.description
      or old.prompt_text is distinct from new.prompt_text
      or old.instructions is distinct from new.instructions
      or old.difficulty is distinct from new.difficulty
      or old.word_target is distinct from new.word_target
      or old.minimum_words is distinct from new.minimum_words
      or old.maximum_words is distinct from new.maximum_words
      or old.time_limit_seconds is distinct from new.time_limit_seconds
      or old.source_name is distinct from new.source_name
      or old.licence is distinct from new.licence
      or old.content_checksum is distinct from new.content_checksum
      or old.published_at is distinct from new.published_at
      or old.status = 'archived'
      or new.status not in ('published', 'archived') then
      raise exception using errcode = '55000', message = 'published writing content is immutable';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger protect_writing_task_version
before update or delete on public.writing_task_versions
for each row execute function public.protect_writing_task_version();

create function public.protect_writing_submission()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'submitted' then
    raise exception using errcode = '55000', message = 'submitted writing is immutable';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if old.user_id is distinct from new.user_id
    or old.writing_task_id is distinct from new.writing_task_id
    or old.writing_task_version_id is distinct from new.writing_task_version_id
    or old.started_at is distinct from new.started_at
    or old.expires_at is distinct from new.expires_at
    or old.start_idempotency_key is distinct from new.start_idempotency_key then
    raise exception using errcode = '55000', message = 'writing submission identity is immutable';
  end if;
  return new;
end;
$$;

create trigger protect_writing_submission
before update or delete on public.writing_submissions
for each row execute function public.protect_writing_submission();

create function public.protect_writing_feedback()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = 'writing feedback is immutable';
end;
$$;

create trigger protect_writing_feedback
before update or delete on public.writing_feedback
for each row execute function public.protect_writing_feedback();

create function private.writing_task_version_is_accessible(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.writing_task_versions as versions
    join public.learner_profiles as learners
      on learners.user_id = (select auth.uid())
    where versions.id = target_version_id
      and versions.status = 'published'
      and versions.published_at <= now()
      and learners.onboarding_completed_at is not null
      and (versions.test_type = 'both' or versions.test_type = learners.test_type)
  );
$$;

create function private.writing_task_is_accessible(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.writing_task_versions as versions
    where versions.writing_task_id = target_task_id
      and (select private.writing_task_version_is_accessible(versions.id))
  );
$$;

alter table public.writing_tasks enable row level security;
alter table public.writing_task_versions enable row level security;
alter table public.writing_submissions enable row level security;
alter table public.writing_feedback_runs enable row level security;
alter table public.writing_feedback enable row level security;

revoke all on table public.writing_tasks from anon, authenticated;
revoke all on table public.writing_task_versions from anon, authenticated;
revoke all on table public.writing_submissions from anon, authenticated;
revoke all on table public.writing_feedback_runs from anon, authenticated;
revoke all on table public.writing_feedback from anon, authenticated;

grant select on table public.writing_tasks to authenticated;
grant select on table public.writing_task_versions to authenticated;
grant select on table public.writing_submissions to authenticated;
grant select on table public.writing_feedback_runs to authenticated;
grant select on table public.writing_feedback to authenticated;

create policy "Learners can read accessible writing tasks"
on public.writing_tasks for select to authenticated
using ((select private.writing_task_is_accessible(id)));

create policy "Learners can read accessible or pinned writing versions"
on public.writing_task_versions for select to authenticated
using (
  (select private.writing_task_version_is_accessible(id))
  or exists (
    select 1 from public.writing_submissions as submissions
    where submissions.writing_task_version_id = writing_task_versions.id
      and submissions.user_id = (select auth.uid())
  )
);

create policy "Learners can read their own writing submissions"
on public.writing_submissions for select to authenticated
using (user_id = (select auth.uid()));

create policy "Learners can read their own writing feedback runs"
on public.writing_feedback_runs for select to authenticated
using (user_id = (select auth.uid()));

create policy "Learners can read their own validated writing feedback"
on public.writing_feedback for select to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.writing_feedback_runs as runs
    where runs.id = writing_feedback.run_id
      and runs.status = 'ready'
      and runs.user_id = (select auth.uid())
  )
);

create function public.start_writing_submission(
  p_task_slug text,
  p_idempotency_key text
)
returns public.writing_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_task_id uuid;
  target_version public.writing_task_versions;
  result public.writing_submissions;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_task_slug is null or p_task_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'invalid writing task slug';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = ''
    or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  if not (select private.completed_learner_exists()) then
    raise exception using errcode = '42501', message = 'completed onboarding required';
  end if;

  select versions.* into target_version
  from public.writing_tasks as tasks
  join public.writing_task_versions as versions on versions.writing_task_id = tasks.id
  join public.learner_profiles as learners on learners.user_id = actor_id
  where tasks.slug = p_task_slug
    and versions.status = 'published'
    and versions.published_at <= now()
    and (versions.test_type = 'both' or versions.test_type = learners.test_type)
  order by versions.version desc
  limit 1;
  if target_version.id is null then
    raise exception using errcode = 'P0002', message = 'writing task not found';
  end if;
  target_task_id := target_version.writing_task_id;

  select submissions.* into result
  from public.writing_submissions as submissions
  where submissions.user_id = actor_id
    and submissions.start_idempotency_key = p_idempotency_key;
  if found then
    if result.writing_task_id <> target_task_id then
      raise exception using errcode = '23505', message = 'idempotency key belongs to another writing task';
    end if;
    return result;
  end if;

  select submissions.* into result
  from public.writing_submissions as submissions
  where submissions.user_id = actor_id
    and submissions.writing_task_id = target_task_id
    and submissions.status = 'draft';
  if found then return result; end if;

  insert into public.writing_submissions (
    user_id,
    writing_task_id,
    writing_task_version_id,
    start_idempotency_key,
    expires_at
  ) values (
    actor_id,
    target_task_id,
    target_version.id,
    p_idempotency_key,
    now() + make_interval(secs => target_version.time_limit_seconds)
  )
  on conflict (user_id, writing_task_id) where status = 'draft' do nothing
  returning * into result;

  if result.id is null then
    select submissions.* into result
    from public.writing_submissions as submissions
    where submissions.user_id = actor_id
      and submissions.writing_task_id = target_task_id
      and submissions.status = 'draft';
  end if;
  return result;
end;
$$;

create function public.save_writing_draft(
  p_submission_id uuid,
  p_draft_text text,
  p_expected_revision integer
)
returns public.writing_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target public.writing_submissions;
  target_minimum integer;
  calculated_word_count integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_submission_id is null or p_expected_revision is null or p_expected_revision < 0 then
    raise exception using errcode = '22023', message = 'invalid draft save input';
  end if;
  if p_draft_text is null or char_length(p_draft_text) > 20000 then
    raise exception using errcode = '22023', message = 'writing draft is too large';
  end if;

  select submissions.* into target
  from public.writing_submissions as submissions
  where submissions.id = p_submission_id and submissions.user_id = actor_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'writing submission not found';
  end if;
  if target.status <> 'draft' then
    raise exception using errcode = '55000', message = 'submitted writing is immutable';
  end if;

  select versions.minimum_words into target_minimum
  from public.writing_task_versions as versions
  where versions.id = target.writing_task_version_id;

  if p_expected_revision <> target.server_revision then
    if p_expected_revision < target.server_revision and p_draft_text = target.draft_text then
      return target;
    end if;
    raise exception using errcode = '40001', message = 'stale or conflicting writing revision';
  end if;
  if p_draft_text = target.draft_text then return target; end if;

  calculated_word_count := private.count_writing_words(p_draft_text);
  update public.writing_submissions set
    draft_text = p_draft_text,
    server_revision = server_revision + 1,
    word_count = calculated_word_count,
    minimum_words_met = calculated_word_count >= target_minimum,
    last_saved_at = now()
  where id = target.id
  returning * into target;
  return target;
end;
$$;

create function public.submit_writing_submission(
  p_submission_id uuid,
  p_idempotency_key text
)
returns public.writing_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target public.writing_submissions;
  target_version public.writing_task_versions;
  calculated_word_count integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = ''
    or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;

  select submissions.* into target
  from public.writing_submissions as submissions
  where submissions.id = p_submission_id and submissions.user_id = actor_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'writing submission not found';
  end if;
  if target.status = 'submitted' then return target; end if;

  select versions.* into target_version
  from public.writing_task_versions as versions
  where versions.id = target.writing_task_version_id;
  if target_version.status not in ('published', 'archived') or target_version.published_at is null then
    raise exception using errcode = '55000', message = 'writing task was not published';
  end if;
  if btrim(target.draft_text) = '' then
    raise exception using errcode = '22023', message = 'writing submission cannot be empty';
  end if;

  calculated_word_count := private.count_writing_words(target.draft_text);
  update public.writing_submissions set
    status = 'submitted',
    submitted_text = draft_text,
    word_count = calculated_word_count,
    minimum_words_met = calculated_word_count >= target_version.minimum_words,
    submit_idempotency_key = p_idempotency_key,
    content_checksum = encode(extensions.digest(convert_to(draft_text, 'UTF8'), 'sha256'), 'hex'),
    submitted_at = now(),
    submitted_after_time_limit = now() > expires_at,
    last_saved_at = now()
  where id = target.id
  returning * into target;
  return target;
end;
$$;

create function public.get_writing_submission_clock(p_submission_id uuid)
returns table (
  started_at timestamptz,
  expires_at timestamptz,
  server_now timestamptz,
  submitted_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select submissions.started_at, submissions.expires_at, now(), submissions.submitted_at
  from public.writing_submissions as submissions
  where submissions.id = p_submission_id
    and submissions.user_id = (select auth.uid());
$$;

create function private.writing_signing_secret()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'writing_feedback_signing_secret'
  limit 1;
$$;

create function public.get_writing_ai_configuration_state()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and nullif((select private.writing_signing_secret()), '') is not null;
$$;

create function public.start_writing_feedback_request(
  p_submission_id uuid,
  p_idempotency_key text,
  p_consent_version text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_submission public.writing_submissions;
  target_version public.writing_task_versions;
  target_run public.writing_feedback_runs;
  attempts_used integer;
  weekly_used integer;
  burst_used integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if nullif((select private.writing_signing_secret()), '') is null then
    raise exception using errcode = '55000', message = 'writing feedback signing is not configured';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = ''
    or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  if p_consent_version <> 'writing-ai-v1' then
    raise exception using errcode = '22023', message = 'writing AI consent is required';
  end if;

  select submissions.* into target_submission
  from public.writing_submissions as submissions
  where submissions.id = p_submission_id and submissions.user_id = actor_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'writing submission not found';
  end if;
  if target_submission.status <> 'submitted' then
    raise exception using errcode = '55000', message = 'feedback requires a submitted writing';
  end if;
  if target_submission.word_count < 50 or target_submission.word_count > 1000 then
    raise exception using errcode = '22023', message = 'writing length is outside feedback limits';
  end if;

  update public.writing_feedback_runs as runs set
    status = 'failed',
    error_code = 'provider_timeout',
    completed_at = now()
  where runs.submission_id = target_submission.id
    and runs.user_id = actor_id
    and runs.status = 'pending'
    and runs.lease_expires_at <= now();

  select versions.* into target_version
  from public.writing_task_versions as versions
  where versions.id = target_submission.writing_task_version_id;

  select runs.* into target_run
  from public.writing_feedback_runs as runs
  where runs.user_id = actor_id and runs.request_idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'runId', target_run.id,
      'status', target_run.status,
      'shouldCallProvider', false
    );
  end if;

  select runs.* into target_run
  from public.writing_feedback_runs as runs
  where runs.submission_id = target_submission.id and runs.status in ('pending', 'ready')
  order by runs.requested_at desc
  limit 1;
  if found then
    return jsonb_build_object(
      'runId', target_run.id,
      'status', target_run.status,
      'shouldCallProvider', false
    );
  end if;

  select count(*)::integer into attempts_used
  from public.writing_feedback_runs as runs
  where runs.submission_id = target_submission.id;
  if attempts_used >= 2 then
    raise exception using errcode = '22023', message = 'feedback retry limit reached';
  end if;
  select count(*)::integer into weekly_used
  from public.writing_feedback_runs as runs
  where runs.user_id = actor_id and runs.requested_at >= now() - interval '7 days';
  if weekly_used >= 5 then
    raise exception using errcode = 'P0001', message = 'writing feedback weekly quota reached';
  end if;
  select count(*)::integer into burst_used
  from public.writing_feedback_runs as runs
  where runs.user_id = actor_id and runs.requested_at >= now() - interval '1 minute';
  if burst_used >= 2 then
    raise exception using errcode = 'P0001', message = 'writing feedback rate limit reached';
  end if;

  insert into public.writing_feedback_runs (
    user_id,
    submission_id,
    request_idempotency_key,
    request_hash,
    input_checksum,
    consent_version,
    attempt_number,
    provider_started_at,
    lease_expires_at
  ) values (
    actor_id,
    target_submission.id,
    p_idempotency_key,
    encode(extensions.digest(convert_to(
      target_submission.content_checksum || ':writing-task-2-v1:ielts-writing-task-2-v1',
      'UTF8'
    ), 'sha256'), 'hex'),
    target_submission.content_checksum,
    p_consent_version,
    attempts_used + 1,
    now(),
    now() + interval '30 seconds'
  )
  returning * into target_run;

  return jsonb_build_object(
    'runId', target_run.id,
    'status', target_run.status,
    'shouldCallProvider', true,
    'finalizeNonce', target_run.finalize_nonce,
    'taskType', target_version.task_type,
    'taskTitle', target_version.title,
    'taskPrompt', target_version.prompt_text,
    'instructions', target_version.instructions,
    'minimumWords', target_version.minimum_words,
    'wordTarget', target_version.word_target,
    'essay', target_submission.submitted_text
  );
end;
$$;

create function private.valid_writing_band(value numeric)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value between 0 and 9 and mod(value * 2, 1) = 0;
$$;

create function private.writing_feedback_evidence_is_valid(
  feedback_payload jsonb,
  essay text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    not exists (
      select 1
      from jsonb_each(feedback_payload -> 'criteria') as criterion(key, value)
      cross join lateral jsonb_array_elements_text(criterion.value -> 'evidence') as evidence(value)
      where btrim(evidence.value) = '' or position(evidence.value in essay) = 0
    )
    and not exists (
      select 1
      from jsonb_array_elements(feedback_payload -> 'priorityIssues') as issue(value)
      where btrim(issue.value ->> 'evidence') = ''
        or strpos(essay, issue.value ->> 'evidence') = 0
    )
    and not exists (
      select 1
      from jsonb_array_elements(feedback_payload -> 'correctedExamples') as example(value)
      where btrim(example.value ->> 'source') = ''
        or strpos(essay, example.value ->> 'source') = 0
    );
$$;

create function public.finalize_writing_feedback(
  p_run_id uuid,
  p_feedback_payload text,
  p_expires_at timestamptz,
  p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_run public.writing_feedback_runs;
  target_submission public.writing_submissions;
  payload jsonb;
  signing_secret text;
  signature_message text;
  expected_signature text;
  overall_band numeric;
  task_band numeric;
  coherence_band numeric;
  lexical_band numeric;
  grammar_band numeric;
  result_id uuid;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  select runs.* into target_run
  from public.writing_feedback_runs as runs
  where runs.id = p_run_id and runs.user_id = actor_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'writing feedback run not found';
  end if;
  if target_run.status = 'ready' then
    return jsonb_build_object('runId', target_run.id, 'status', 'ready');
  end if;
  if target_run.status <> 'pending' then
    raise exception using errcode = '55000', message = 'writing feedback run cannot be finalized';
  end if;
  if p_expires_at < now() or p_expires_at > now() + interval '5 minutes' then
    raise exception using errcode = '42501', message = 'writing feedback signature expired';
  end if;
  if p_feedback_payload is null or char_length(p_feedback_payload) > 30000 then
    raise exception using errcode = '22023', message = 'invalid writing feedback payload';
  end if;

  signing_secret := private.writing_signing_secret();
  if nullif(signing_secret, '') is null then
    raise exception using errcode = '55000', message = 'writing feedback signing is not configured';
  end if;
  signature_message := 'writing-feedback-v1:' || target_run.id::text || ':'
    || target_run.finalize_nonce::text || ':'
    || extract(epoch from p_expires_at)::bigint::text || ':' || p_feedback_payload;
  expected_signature := encode(
    extensions.hmac(convert_to(signature_message, 'UTF8'), convert_to(signing_secret, 'UTF8'), 'sha256'),
    'hex'
  );
  if p_signature is null or p_signature !~ '^[0-9a-f]{64}$'
    or expected_signature is distinct from p_signature then
    raise exception using errcode = '42501', message = 'invalid writing feedback signature';
  end if;

  begin
    payload := p_feedback_payload::jsonb;
    overall_band := (payload ->> 'overallBandEstimate')::numeric;
    task_band := (payload #>> '{criteria,taskResponse,band}')::numeric;
    coherence_band := (payload #>> '{criteria,coherenceCohesion,band}')::numeric;
    lexical_band := (payload #>> '{criteria,lexicalResource,band}')::numeric;
    grammar_band := (payload #>> '{criteria,grammaticalRangeAccuracy,band}')::numeric;
  exception when others then
    raise exception using errcode = '22023', message = 'invalid writing feedback schema';
  end;

  if jsonb_typeof(payload -> 'criteria') is distinct from 'object'
    or jsonb_typeof(payload -> 'strengths') is distinct from 'array'
    or jsonb_typeof(payload -> 'priorityIssues') is distinct from 'array'
    or jsonb_typeof(payload -> 'revisionPlan') is distinct from 'array'
    or jsonb_typeof(payload -> 'correctedExamples') is distinct from 'array'
    or jsonb_typeof(payload -> 'meta') is distinct from 'object' then
    raise exception using errcode = '22023', message = 'invalid writing feedback schema';
  end if;

  if not private.valid_writing_band(overall_band)
    or not private.valid_writing_band(task_band)
    or not private.valid_writing_band(coherence_band)
    or not private.valid_writing_band(lexical_band)
    or not private.valid_writing_band(grammar_band)
    or payload ->> 'confidence' not in ('low', 'medium', 'high')
    or (select count(*) from jsonb_object_keys(payload -> 'criteria')) <> 4
    or jsonb_array_length(payload -> 'strengths') not between 1 and 5
    or jsonb_array_length(payload -> 'priorityIssues') not between 3 and 5
    or jsonb_array_length(payload -> 'revisionPlan') not between 3 and 5
    or jsonb_array_length(payload -> 'correctedExamples') not between 0 and 5
    or btrim(coalesce(payload ->> 'summary', '')) = ''
    or char_length(payload ->> 'summary') > 2000
    or coalesce(payload #>> '{meta,provider}', '') <> 'openai'
    or btrim(coalesce(payload #>> '{meta,modelLabel}', '')) = '' then
    raise exception using errcode = '22023', message = 'invalid writing feedback schema';
  end if;

  select submissions.* into target_submission
  from public.writing_submissions as submissions
  where submissions.id = target_run.submission_id and submissions.user_id = actor_id;
  if not private.writing_feedback_evidence_is_valid(payload, target_submission.submitted_text) then
    raise exception using errcode = '22023', message = 'writing feedback evidence is invalid';
  end if;

  insert into public.writing_feedback (
    run_id,
    submission_id,
    user_id,
    overall_band_estimate,
    task_response_band,
    coherence_cohesion_band,
    lexical_resource_band,
    grammatical_range_accuracy_band,
    confidence,
    summary,
    criteria,
    strengths,
    priority_issues,
    revision_plan,
    corrected_examples
  ) values (
    target_run.id,
    target_run.submission_id,
    actor_id,
    overall_band,
    task_band,
    coherence_band,
    lexical_band,
    grammar_band,
    payload ->> 'confidence',
    payload ->> 'summary',
    payload -> 'criteria',
    payload -> 'strengths',
    payload -> 'priorityIssues',
    payload -> 'revisionPlan',
    payload -> 'correctedExamples'
  ) returning id into result_id;

  update public.writing_feedback_runs set
    status = 'ready',
    provider = 'openai',
    model_label = left(payload #>> '{meta,modelLabel}', 120),
    input_tokens = greatest(0, coalesce((payload #>> '{meta,inputTokens}')::integer, 0)),
    output_tokens = greatest(0, coalesce((payload #>> '{meta,outputTokens}')::integer, 0)),
    latency_ms = greatest(0, coalesce((payload #>> '{meta,latencyMs}')::integer, 0)),
    completed_at = now()
  where id = target_run.id;

  return jsonb_build_object('runId', target_run.id, 'feedbackId', result_id, 'status', 'ready');
end;
$$;

create function public.fail_writing_feedback_run(
  p_run_id uuid,
  p_error_code text,
  p_expires_at timestamptz,
  p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_run public.writing_feedback_runs;
  signing_secret text;
  signature_message text;
  expected_signature text;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_error_code not in (
    'provider_timeout', 'provider_rate_limited', 'provider_error',
    'provider_refusal', 'invalid_provider_output', 'configuration_error'
  ) then
    raise exception using errcode = '22023', message = 'invalid writing feedback error code';
  end if;
  select runs.* into target_run
  from public.writing_feedback_runs as runs
  where runs.id = p_run_id and runs.user_id = actor_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'writing feedback run not found';
  end if;
  if target_run.status <> 'pending' then
    return jsonb_build_object('runId', target_run.id, 'status', target_run.status);
  end if;
  if p_expires_at < now() or p_expires_at > now() + interval '5 minutes' then
    raise exception using errcode = '42501', message = 'writing feedback signature expired';
  end if;
  signing_secret := private.writing_signing_secret();
  signature_message := 'writing-feedback-failure-v1:' || target_run.id::text || ':'
    || target_run.finalize_nonce::text || ':'
    || extract(epoch from p_expires_at)::bigint::text || ':' || p_error_code;
  expected_signature := encode(
    extensions.hmac(convert_to(signature_message, 'UTF8'), convert_to(signing_secret, 'UTF8'), 'sha256'),
    'hex'
  );
  if p_signature is null or p_signature !~ '^[0-9a-f]{64}$'
    or expected_signature is distinct from p_signature then
    raise exception using errcode = '42501', message = 'invalid writing feedback signature';
  end if;
  update public.writing_feedback_runs set
    status = 'failed', error_code = p_error_code, completed_at = now()
  where id = target_run.id;
  return jsonb_build_object('runId', target_run.id, 'status', 'failed');
end;
$$;

revoke all on function private.count_writing_words(text) from public, anon, authenticated;
revoke all on function public.protect_writing_task_version() from public, anon, authenticated;
revoke all on function public.protect_writing_submission() from public, anon, authenticated;
revoke all on function public.protect_writing_feedback() from public, anon, authenticated;
revoke all on function private.writing_task_version_is_accessible(uuid) from public, anon, authenticated;
revoke all on function private.writing_task_is_accessible(uuid) from public, anon, authenticated;
revoke all on function private.writing_signing_secret() from public, anon, authenticated;
revoke all on function private.valid_writing_band(numeric) from public, anon, authenticated;
revoke all on function private.writing_feedback_evidence_is_valid(jsonb, text) from public, anon, authenticated;

grant execute on function private.writing_task_version_is_accessible(uuid) to authenticated;
grant execute on function private.writing_task_is_accessible(uuid) to authenticated;

revoke all on function public.start_writing_submission(text, text) from public, anon, authenticated;
revoke all on function public.save_writing_draft(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.submit_writing_submission(uuid, text) from public, anon, authenticated;
revoke all on function public.get_writing_submission_clock(uuid) from public, anon, authenticated;
revoke all on function public.get_writing_ai_configuration_state() from public, anon, authenticated;
revoke all on function public.start_writing_feedback_request(uuid, text, text) from public, anon, authenticated;
revoke all on function public.finalize_writing_feedback(uuid, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.fail_writing_feedback_run(uuid, text, timestamptz, text) from public, anon, authenticated;

grant execute on function public.start_writing_submission(text, text) to authenticated;
grant execute on function public.save_writing_draft(uuid, text, integer) to authenticated;
grant execute on function public.submit_writing_submission(uuid, text) to authenticated;
grant execute on function public.get_writing_submission_clock(uuid) to authenticated;
grant execute on function public.get_writing_ai_configuration_state() to authenticated;
grant execute on function public.start_writing_feedback_request(uuid, text, text) to authenticated;
grant execute on function public.finalize_writing_feedback(uuid, text, timestamptz, text) to authenticated;
grant execute on function public.fail_writing_feedback_run(uuid, text, timestamptz, text) to authenticated;

comment on table public.writing_task_versions is
  'Immutable versioned Writing prompts. Learners only read published compatible versions or versions pinned to their own submissions.';
comment on table public.writing_submissions is
  'PostgreSQL-owned Writing draft and immutable submitted snapshot. All mutations use owner-scoped RPCs.';
comment on table public.writing_feedback_runs is
  'Owner-scoped optional AI feedback lifecycle with quota, idempotency, version metadata and signed finalization.';
comment on table public.writing_feedback is
  'Validated immutable Writing feedback. Raw provider responses are not stored.';
comment on function public.save_writing_draft(uuid, text, integer) is
  'Conflict-safe owner autosave. PostgreSQL calculates revision and word count; submitted text cannot be edited.';
comment on function public.finalize_writing_feedback(uuid, text, timestamptz, text) is
  'Accepts only HMAC-signed server output, validates rubric schema and essay evidence, then atomically stores immutable feedback.';

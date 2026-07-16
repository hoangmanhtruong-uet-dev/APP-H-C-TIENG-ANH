begin;

alter table public.exercise_sets
  drop constraint exercise_sets_domain_check;

alter table public.exercise_sets
  add constraint exercise_sets_domain_check check (
    domain in ('vocabulary', 'grammar', 'reading')
  );

alter table public.exercise_questions
  drop constraint exercise_questions_type_check;

alter table public.exercise_questions
  add constraint exercise_questions_type_check check (
    question_type in (
      'single_choice',
      'multiple_choice',
      'true_false',
      'short_text',
      'true_false_not_given',
      'matching_headings',
      'summary_completion'
    )
  );

create table public.reading_passages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  test_type text not null,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_passages_slug_check check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 1 and 120
  ),
  constraint reading_passages_test_type_check check (
    test_type in ('academic', 'general_training', 'both')
  ),
  constraint reading_passages_display_order_check check (
    display_order between 1 and 10000
  )
);

create table public.reading_passage_versions (
  id uuid primary key default gen_random_uuid(),
  reading_passage_id uuid not null references public.reading_passages (id) on delete restrict,
  version integer not null,
  title text not null,
  summary text not null,
  difficulty text not null,
  status text not null default 'draft',
  source_name text not null,
  source_url text,
  licence text not null,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_passage_versions_version_check check (version between 1 and 10000),
  constraint reading_passage_versions_title_check check (
    btrim(title) <> '' and char_length(title) <= 220
  ),
  constraint reading_passage_versions_summary_check check (
    btrim(summary) <> '' and char_length(summary) <= 1600
  ),
  constraint reading_passage_versions_difficulty_check check (
    difficulty in ('beginner', 'intermediate', 'advanced')
  ),
  constraint reading_passage_versions_status_check check (
    status in ('draft', 'in_review', 'published', 'archived')
  ),
  constraint reading_passage_versions_source_check check (
    btrim(source_name) <> ''
    and char_length(source_name) <= 300
    and btrim(licence) <> ''
    and char_length(licence) <= 300
    and (
      source_url is null
      or source_url ~ '^https://'
    )
  ),
  constraint reading_passage_versions_publication_check check (
    (
      status in ('draft', 'in_review')
      and published_at is null
      and archived_at is null
    )
    or (
      status = 'published'
      and published_at is not null
      and archived_at is null
    )
    or (
      status = 'archived'
      and published_at is not null
      and archived_at is not null
      and archived_at >= published_at
    )
  ),
  constraint reading_passage_versions_identity_version_unique unique (
    reading_passage_id,
    version
  ),
  constraint reading_passage_versions_identity_id_unique unique (
    reading_passage_id,
    id
  )
);

create unique index reading_passage_versions_one_published_idx
on public.reading_passage_versions (reading_passage_id)
where status = 'published';

create table public.reading_passage_sections (
  id uuid primary key default gen_random_uuid(),
  reading_passage_version_id uuid not null references public.reading_passage_versions (id) on delete restrict,
  position integer not null,
  heading text,
  body_markdown text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_passage_sections_position_check check (position between 1 and 100),
  constraint reading_passage_sections_heading_check check (
    heading is null or (btrim(heading) <> '' and char_length(heading) <= 220)
  ),
  constraint reading_passage_sections_body_check check (
    btrim(body_markdown) <> '' and char_length(body_markdown) <= 30000
  ),
  constraint reading_passage_sections_version_position_unique unique (
    reading_passage_version_id,
    position
  ),
  constraint reading_passage_sections_version_id_unique unique (
    reading_passage_version_id,
    id
  )
);

create table public.reading_practice_versions (
  exercise_set_version_id uuid primary key references public.exercise_set_versions (id) on delete restrict,
  reading_passage_version_id uuid not null unique references public.reading_passage_versions (id) on delete restrict,
  time_limit_seconds integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_practice_versions_time_limit_check check (
    time_limit_seconds between 60 and 7200
  ),
  constraint reading_practice_versions_pair_unique unique (
    exercise_set_version_id,
    reading_passage_version_id
  )
);

create table public.reading_question_groups (
  id uuid primary key default gen_random_uuid(),
  exercise_set_version_id uuid not null,
  reading_passage_version_id uuid not null,
  passage_section_id uuid,
  position integer not null,
  group_type text not null,
  title text not null,
  instructions_markdown text not null,
  max_answer_words smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_question_groups_practice_fkey foreign key (
    exercise_set_version_id,
    reading_passage_version_id
  ) references public.reading_practice_versions (
    exercise_set_version_id,
    reading_passage_version_id
  ) on delete restrict,
  constraint reading_question_groups_section_fkey foreign key (
    reading_passage_version_id,
    passage_section_id
  ) references public.reading_passage_sections (
    reading_passage_version_id,
    id
  ) on delete restrict,
  constraint reading_question_groups_position_check check (position between 1 and 100),
  constraint reading_question_groups_type_check check (
    group_type in (
      'multiple_choice',
      'true_false_not_given',
      'matching_headings',
      'summary_completion'
    )
  ),
  constraint reading_question_groups_title_check check (
    btrim(title) <> '' and char_length(title) <= 220
  ),
  constraint reading_question_groups_instructions_check check (
    btrim(instructions_markdown) <> ''
    and char_length(instructions_markdown) <= 10000
  ),
  constraint reading_question_groups_answer_words_check check (
    (
      group_type = 'summary_completion'
      and max_answer_words between 1 and 10
    )
    or (
      group_type <> 'summary_completion'
      and max_answer_words is null
    )
  ),
  constraint reading_question_groups_version_position_unique unique (
    exercise_set_version_id,
    position
  ),
  constraint reading_question_groups_version_id_unique unique (
    exercise_set_version_id,
    id
  )
);

alter table public.exercise_questions
  add column reading_question_group_id uuid;

alter table public.exercise_questions
  add constraint exercise_questions_reading_group_fkey foreign key (
    exercise_set_version_id,
    reading_question_group_id
  ) references public.reading_question_groups (
    exercise_set_version_id,
    id
  ) on delete restrict;

alter table public.learner_attempts
  add column reading_time_limit_seconds integer,
  add column expires_at timestamptz;

alter table public.learner_attempts
  add constraint learner_attempts_reading_timer_check check (
    (
      reading_time_limit_seconds is null
      and expires_at is null
    )
    or (
      reading_time_limit_seconds between 60 and 7200
      and expires_at is not null
      and expires_at > started_at
      and expires_at <= started_at + interval '2 hours'
    )
  );

create index reading_passage_versions_catalog_idx
on public.reading_passage_versions (status, difficulty, reading_passage_id, version desc);

create index reading_passage_sections_version_position_idx
on public.reading_passage_sections (reading_passage_version_id, position, id);

create index reading_practice_versions_passage_idx
on public.reading_practice_versions (reading_passage_version_id, exercise_set_version_id);

create index reading_question_groups_version_position_idx
on public.reading_question_groups (exercise_set_version_id, position, id);

create index reading_question_groups_section_idx
on public.reading_question_groups (reading_passage_version_id, passage_section_id)
where passage_section_id is not null;

create index exercise_questions_reading_group_idx
on public.exercise_questions (reading_question_group_id, position)
where reading_question_group_id is not null;

create index learner_attempts_reading_expiry_idx
on public.learner_attempts (user_id, expires_at)
where status = 'in_progress' and expires_at is not null;

create trigger set_reading_passages_updated_at
before update on public.reading_passages
for each row execute function public.set_profile_updated_at();

create trigger set_reading_passage_versions_updated_at
before update on public.reading_passage_versions
for each row execute function public.set_profile_updated_at();

create trigger set_reading_passage_sections_updated_at
before update on public.reading_passage_sections
for each row execute function public.set_profile_updated_at();

create trigger set_reading_practice_versions_updated_at
before update on public.reading_practice_versions
for each row execute function public.set_profile_updated_at();

create trigger set_reading_question_groups_updated_at
before update on public.reading_question_groups
for each row execute function public.set_profile_updated_at();

create function public.protect_reading_passage_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.status in ('published', 'archived') then
    raise exception using errcode = '55000', message = 'published reading passage versions are immutable';
  end if;
  if tg_op = 'UPDATE' and old.status = 'archived' then
    raise exception using errcode = '55000', message = 'archived reading passage versions are immutable';
  end if;
  if tg_op = 'UPDATE' and old.status = 'published' then
    if new.status = 'archived'
      and to_jsonb(new) - array['status', 'archived_at', 'updated_at']
        is not distinct from to_jsonb(old) - array['status', 'archived_at', 'updated_at']
      and new.archived_at is not null then
      return new;
    end if;
    raise exception using errcode = '55000', message = 'published reading passage versions are immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.protect_reading_passage_version()
from public, anon, authenticated;

create trigger protect_reading_passage_versions
before update or delete on public.reading_passage_versions
for each row execute function public.protect_reading_passage_version();

create function public.protect_reading_child_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  passage_version_id uuid;
  exercise_version_id uuid;
  passage_status text;
  exercise_status text;
begin
  if tg_table_name = 'reading_passage_sections' then
    passage_version_id := case when tg_op = 'DELETE'
      then old.reading_passage_version_id else new.reading_passage_version_id end;
  elsif tg_table_name = 'reading_practice_versions' then
    passage_version_id := case when tg_op = 'DELETE'
      then old.reading_passage_version_id else new.reading_passage_version_id end;
    exercise_version_id := case when tg_op = 'DELETE'
      then old.exercise_set_version_id else new.exercise_set_version_id end;
  elsif tg_table_name = 'reading_question_groups' then
    passage_version_id := case when tg_op = 'DELETE'
      then old.reading_passage_version_id else new.reading_passage_version_id end;
    exercise_version_id := case when tg_op = 'DELETE'
      then old.exercise_set_version_id else new.exercise_set_version_id end;
  else
    raise exception using errcode = 'P0001', message = 'unsupported reading content table';
  end if;

  select versions.status into passage_status
  from public.reading_passage_versions as versions
  where versions.id = passage_version_id;

  if exercise_version_id is not null then
    select versions.status into exercise_status
    from public.exercise_set_versions as versions
    where versions.id = exercise_version_id;
  end if;

  if passage_status in ('published', 'archived')
    or exercise_status in ('published', 'archived') then
    raise exception using errcode = '55000', message = 'published reading content is immutable';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.protect_reading_child_content()
from public, anon, authenticated;

create trigger protect_reading_passage_sections
before insert or update or delete on public.reading_passage_sections
for each row execute function public.protect_reading_child_content();

create trigger protect_reading_practice_versions
before insert or update or delete on public.reading_practice_versions
for each row execute function public.protect_reading_child_content();

create trigger protect_reading_question_groups
before insert or update or delete on public.reading_question_groups
for each row execute function public.protect_reading_child_content();

create function public.validate_reading_passage_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  section_count integer;
begin
  if new.status <> 'published' or old.status = 'published' then
    return new;
  end if;

  select count(*)::integer into section_count
  from public.reading_passage_sections as sections
  where sections.reading_passage_version_id = new.id;

  if section_count = 0 then
    raise exception using errcode = '23514', message = 'a published reading passage requires at least one section';
  end if;

  if (
    select min(sections.position) <> 1 or max(sections.position) <> count(*)
    from public.reading_passage_sections as sections
    where sections.reading_passage_version_id = new.id
  ) then
    raise exception using errcode = '23514', message = 'published reading section positions must be contiguous';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_reading_passage_publication()
from public, anon, authenticated;

create trigger validate_reading_passage_before_publish
before update on public.reading_passage_versions
for each row execute function public.validate_reading_passage_publication();

create function private.reading_passage_version_is_accessible(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.reading_passage_versions as versions
    join public.reading_passages as passages
      on passages.id = versions.reading_passage_id
    join public.learner_profiles as learners
      on learners.user_id = (select auth.uid())
    where versions.id = target_version_id
      and versions.status = 'published'
      and versions.published_at <= now()
      and learners.onboarding_completed_at is not null
      and (
        passages.test_type = 'both'
        or passages.test_type = learners.test_type
      )
  ) or exists (
    select 1
    from public.learner_attempts as attempts
    join public.reading_practice_versions as practice
      on practice.exercise_set_version_id = attempts.exercise_set_version_id
    where attempts.user_id = (select auth.uid())
      and practice.reading_passage_version_id = target_version_id
  );
$$;

create function private.reading_passage_is_accessible(target_passage_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.reading_passage_versions as versions
    where versions.reading_passage_id = target_passage_id
      and (select private.reading_passage_version_is_accessible(versions.id))
  );
$$;

create function private.reading_section_is_accessible(target_section_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.reading_passage_sections as sections
    where sections.id = target_section_id
      and (select private.reading_passage_version_is_accessible(sections.reading_passage_version_id))
  );
$$;

create function private.reading_practice_version_is_accessible(target_exercise_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.reading_practice_versions as practice
    join public.exercise_set_versions as versions
      on versions.id = practice.exercise_set_version_id
    where practice.exercise_set_version_id = target_exercise_version_id
      and (
        (
          versions.status = 'published'
          and versions.published_at <= now()
          and (select private.reading_passage_version_is_accessible(practice.reading_passage_version_id))
        )
        or exists (
          select 1
          from public.learner_attempts as attempts
          where attempts.user_id = (select auth.uid())
            and attempts.exercise_set_version_id = target_exercise_version_id
        )
      )
  );
$$;

create function private.reading_question_group_is_accessible(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.reading_question_groups as groups
    where groups.id = target_group_id
      and (select private.reading_practice_version_is_accessible(groups.exercise_set_version_id))
  );
$$;

revoke all on function private.reading_passage_version_is_accessible(uuid)
from public, anon, authenticated;
revoke all on function private.reading_passage_is_accessible(uuid)
from public, anon, authenticated;
revoke all on function private.reading_section_is_accessible(uuid)
from public, anon, authenticated;
revoke all on function private.reading_practice_version_is_accessible(uuid)
from public, anon, authenticated;
revoke all on function private.reading_question_group_is_accessible(uuid)
from public, anon, authenticated;

grant execute on function private.reading_passage_version_is_accessible(uuid) to authenticated;
grant execute on function private.reading_passage_is_accessible(uuid) to authenticated;
grant execute on function private.reading_section_is_accessible(uuid) to authenticated;
grant execute on function private.reading_practice_version_is_accessible(uuid) to authenticated;
grant execute on function private.reading_question_group_is_accessible(uuid) to authenticated;

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
        sets.domain <> 'reading'
        or (select private.reading_practice_version_is_accessible(versions.id))
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

alter table public.reading_passages enable row level security;
alter table public.reading_passage_versions enable row level security;
alter table public.reading_passage_sections enable row level security;
alter table public.reading_practice_versions enable row level security;
alter table public.reading_question_groups enable row level security;

revoke all on table public.reading_passages from anon, authenticated;
revoke all on table public.reading_passage_versions from anon, authenticated;
revoke all on table public.reading_passage_sections from anon, authenticated;
revoke all on table public.reading_practice_versions from anon, authenticated;
revoke all on table public.reading_question_groups from anon, authenticated;

grant select on table public.reading_passages to authenticated;
grant select on table public.reading_passage_versions to authenticated;
grant select on table public.reading_passage_sections to authenticated;
grant select on table public.reading_practice_versions to authenticated;
grant select on table public.reading_question_groups to authenticated;

create policy "Learners can read accessible reading passages"
on public.reading_passages for select to authenticated
using ((select private.reading_passage_is_accessible(id)));

create policy "Learners can read accessible reading passage versions"
on public.reading_passage_versions for select to authenticated
using ((select private.reading_passage_version_is_accessible(id)));

create policy "Learners can read accessible reading sections"
on public.reading_passage_sections for select to authenticated
using ((select private.reading_passage_version_is_accessible(reading_passage_version_id)));

create policy "Learners can read accessible reading practice versions"
on public.reading_practice_versions for select to authenticated
using ((select private.reading_practice_version_is_accessible(exercise_set_version_id)));

create policy "Learners can read accessible reading question groups"
on public.reading_question_groups for select to authenticated
using ((select private.reading_practice_version_is_accessible(exercise_set_version_id)));

create or replace function public.validate_exercise_version_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  question_count integer;
  invalid_count integer;
  target_domain text;
  group_count integer;
begin
  if new.status <> 'published' or old.status = 'published' then
    return new;
  end if;

  select sets.domain into target_domain
  from public.exercise_sets as sets
  where sets.id = new.exercise_set_id;

  select count(*)::integer into question_count
  from public.exercise_questions as questions
  where questions.exercise_set_version_id = new.id;

  if question_count = 0 then
    raise exception using errcode = '23514', message = 'a published exercise requires at least one question';
  end if;

  select count(*)::integer into invalid_count
  from public.exercise_questions as questions
  where questions.exercise_set_version_id = new.id
    and not exists (
      select 1 from private.exercise_answer_keys as keys where keys.question_id = questions.id
    );
  if invalid_count > 0 then
    raise exception using errcode = '23514', message = 'every published question requires an answer key';
  end if;

  select count(*)::integer into invalid_count
  from public.exercise_questions as questions
  where questions.exercise_set_version_id = new.id
    and (
      (questions.question_type in (
        'single_choice', 'true_false', 'true_false_not_given', 'matching_headings'
      ) and (
        (select count(*) from public.exercise_options as options where options.question_id = questions.id) < 2
        or (select count(*) from private.exercise_correct_options as correct where correct.question_id = questions.id) <> 1
        or exists (select 1 from private.exercise_correct_text_answers as texts where texts.question_id = questions.id)
      ))
      or (questions.question_type = 'multiple_choice' and (
        (select count(*) from public.exercise_options as options where options.question_id = questions.id) < 2
        or (select count(*) from private.exercise_correct_options as correct where correct.question_id = questions.id) < 1
        or exists (select 1 from private.exercise_correct_text_answers as texts where texts.question_id = questions.id)
      ))
      or (questions.question_type in ('short_text', 'summary_completion') and (
        exists (select 1 from public.exercise_options as options where options.question_id = questions.id)
        or exists (select 1 from private.exercise_correct_options as correct where correct.question_id = questions.id)
        or not exists (select 1 from private.exercise_correct_text_answers as texts where texts.question_id = questions.id)
      ))
    );
  if invalid_count > 0 then
    raise exception using errcode = '23514', message = 'published questions have invalid answer configuration';
  end if;

  if (
    select min(questions.position) <> 1 or max(questions.position) <> count(*)
    from public.exercise_questions as questions
    where questions.exercise_set_version_id = new.id
  ) then
    raise exception using errcode = '23514', message = 'published question positions must be contiguous';
  end if;

  if target_domain = 'reading' then
    if not exists (
      select 1
      from public.reading_practice_versions as practice
      join public.reading_passage_versions as passages
        on passages.id = practice.reading_passage_version_id
      where practice.exercise_set_version_id = new.id
        and passages.status = 'published'
        and passages.published_at <= now()
    ) then
      raise exception using errcode = '23514', message = 'a published reading exercise requires a published passage snapshot';
    end if;

    select count(*)::integer into group_count
    from public.reading_question_groups as groups
    where groups.exercise_set_version_id = new.id;
    if group_count = 0 then
      raise exception using errcode = '23514', message = 'a published reading exercise requires question groups';
    end if;

    if (
      select min(groups.position) <> 1 or max(groups.position) <> count(*)
      from public.reading_question_groups as groups
      where groups.exercise_set_version_id = new.id
    ) then
      raise exception using errcode = '23514', message = 'published reading group positions must be contiguous';
    end if;

    if exists (
      select 1
      from public.exercise_questions as questions
      left join public.reading_question_groups as groups
        on groups.id = questions.reading_question_group_id
       and groups.exercise_set_version_id = questions.exercise_set_version_id
      where questions.exercise_set_version_id = new.id
        and (
          groups.id is null
          or groups.group_type <> questions.question_type
        )
    ) then
      raise exception using errcode = '23514', message = 'reading questions require a matching question group';
    end if;
  elsif exists (
    select 1
    from public.exercise_questions as questions
    where questions.exercise_set_version_id = new.id
      and questions.reading_question_group_id is not null
  ) then
    raise exception using errcode = '23514', message = 'non-reading exercises cannot use reading question groups';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_exercise_version_publication()
from public, anon, authenticated;

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
  target_time_limit integer;
  attempt_started_at timestamptz := now();
  result public.learner_attempts;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_exercise_slug is null or p_exercise_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'invalid exercise slug';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  if not (select private.completed_learner_exists()) then
    raise exception using errcode = '42501', message = 'completed onboarding required';
  end if;

  select sets.id, versions.id, practice.time_limit_seconds
  into target_set_id, target_version_id, target_time_limit
  from public.exercise_sets as sets
  join public.exercise_set_versions as versions on versions.exercise_set_id = sets.id
  left join public.reading_practice_versions as practice
    on practice.exercise_set_version_id = versions.id
  where sets.slug = p_exercise_slug
    and versions.status = 'published'
    and versions.published_at <= now()
    and (select private.exercise_version_is_accessible(versions.id));
  if target_version_id is null then
    raise exception using errcode = 'P0002', message = 'exercise not found';
  end if;

  select attempts.* into result
  from public.learner_attempts as attempts
  where attempts.user_id = actor_id
    and attempts.start_idempotency_key = p_idempotency_key;
  if found then
    if result.exercise_set_id <> target_set_id then
      raise exception using errcode = '23505', message = 'idempotency key belongs to another exercise';
    end if;
    return result;
  end if;

  insert into public.learner_attempts (
    user_id,
    exercise_set_id,
    exercise_set_version_id,
    start_idempotency_key,
    started_at,
    reading_time_limit_seconds,
    expires_at
  ) values (
    actor_id,
    target_set_id,
    target_version_id,
    p_idempotency_key,
    attempt_started_at,
    target_time_limit,
    case when target_time_limit is null then null
      else attempt_started_at + make_interval(secs => target_time_limit) end
  )
  on conflict (user_id, exercise_set_id) where status = 'in_progress'
  do update set last_saved_at = now(), updated_at = now()
  returning * into result;

  return result;
end;
$$;

create or replace function public.save_exercise_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_selected_option_ids uuid[],
  p_answer_text text,
  p_client_revision integer
)
returns public.learner_answers
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_attempt public.learner_attempts;
  target_question public.exercise_questions;
  result public.learner_answers;
  normalized_options uuid[];
  stored_options uuid[];
  input_count integer;
  distinct_count integer;
  maximum_words integer;
  answer_word_count integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_client_revision is null or p_client_revision < 0 then
    raise exception using errcode = '22023', message = 'invalid client revision';
  end if;

  select attempts.* into target_attempt
  from public.learner_attempts as attempts
  where attempts.id = p_attempt_id and attempts.user_id = actor_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'attempt not found'; end if;
  if target_attempt.status <> 'in_progress' then
    raise exception using errcode = '55000', message = 'submitted attempt is immutable';
  end if;

  select questions.* into target_question
  from public.exercise_questions as questions
  where questions.id = p_question_id
    and questions.exercise_set_version_id = target_attempt.exercise_set_version_id;
  if not found then raise exception using errcode = '22023', message = 'question is not part of attempt'; end if;

  input_count := cardinality(coalesce(p_selected_option_ids, '{}'::uuid[]));
  select count(distinct option_id)::integer,
         coalesce(array_agg(distinct option_id order by option_id), '{}'::uuid[])
  into distinct_count, normalized_options
  from unnest(coalesce(p_selected_option_ids, '{}'::uuid[])) as selected(option_id);
  if input_count <> distinct_count then
    raise exception using errcode = '22023', message = 'duplicate selected option';
  end if;
  if exists (
    select 1 from unnest(normalized_options) as selected(option_id)
    where not exists (
      select 1 from public.exercise_options as options
      where options.id = selected.option_id and options.question_id = target_question.id
    )
  ) then
    raise exception using errcode = '22023', message = 'invalid selected option';
  end if;

  if target_question.question_type in (
    'single_choice', 'true_false', 'true_false_not_given', 'matching_headings'
  ) then
    if distinct_count <> 1 or nullif(btrim(coalesce(p_answer_text, '')), '') is not null then
      raise exception using errcode = '22023', message = 'one option is required';
    end if;
  elsif target_question.question_type = 'multiple_choice' then
    if distinct_count < 1 or nullif(btrim(coalesce(p_answer_text, '')), '') is not null then
      raise exception using errcode = '22023', message = 'one or more options are required';
    end if;
  elsif target_question.question_type in ('short_text', 'summary_completion') then
    if distinct_count <> 0 or nullif(btrim(coalesce(p_answer_text, '')), '') is null then
      raise exception using errcode = '22023', message = 'a text answer is required';
    end if;
    if target_question.question_type = 'summary_completion' then
      select groups.max_answer_words into maximum_words
      from public.reading_question_groups as groups
      where groups.id = target_question.reading_question_group_id;
      answer_word_count := cardinality(
        regexp_split_to_array(btrim(p_answer_text), '[[:space:]]+')
      );
      if maximum_words is null or answer_word_count > maximum_words then
        raise exception using errcode = '22023', message = 'text answer exceeds the declared word limit';
      end if;
    end if;
  else
    raise exception using errcode = '22023', message = 'unsupported question type';
  end if;

  select answers.* into result
  from public.learner_answers as answers
  where answers.attempt_id = target_attempt.id and answers.question_id = target_question.id;
  if found and p_client_revision <= result.client_revision then
    select coalesce(array_agg(options.option_id order by options.option_id), '{}'::uuid[])
    into stored_options
    from public.learner_answer_options as options
    where options.answer_id = result.id;
    if p_client_revision = result.client_revision
      and result.answer_text is not distinct from nullif(btrim(coalesce(p_answer_text, '')), '')
      and stored_options = normalized_options then
      return result;
    end if;
    raise exception using errcode = '40001', message = 'stale or conflicting answer revision';
  end if;

  insert into public.learner_answers (
    attempt_id, exercise_set_version_id, question_id, answer_text, client_revision, saved_at
  ) values (
    target_attempt.id,
    target_attempt.exercise_set_version_id,
    target_question.id,
    nullif(btrim(coalesce(p_answer_text, '')), ''),
    p_client_revision,
    now()
  )
  on conflict (attempt_id, question_id) do update set
    answer_text = excluded.answer_text,
    client_revision = excluded.client_revision,
    saved_at = excluded.saved_at
  returning * into result;

  delete from public.learner_answer_options where answer_id = result.id;
  insert into public.learner_answer_options (answer_id, attempt_id, question_id, option_id)
  select result.id, target_attempt.id, target_question.id, option_id
  from unnest(normalized_options) as selected(option_id);

  update public.learner_attempts set
    current_question_position = target_question.position,
    last_saved_at = now()
  where id = target_attempt.id;
  return result;
end;
$$;

create or replace function public.submit_exercise_attempt(p_attempt_id uuid)
returns public.learner_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_attempt public.learner_attempts;
  answer_record record;
  correct boolean;
  awarded smallint;
  total_score integer := 0;
  total_max integer;
  selected_count integer;
  correct_count integer;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  select attempts.* into target_attempt
  from public.learner_attempts as attempts
  where attempts.id = p_attempt_id and attempts.user_id = actor_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'attempt not found'; end if;
  if target_attempt.status = 'scored' then return target_attempt; end if;
  if target_attempt.status <> 'in_progress' then
    raise exception using errcode = '55000', message = 'attempt cannot be submitted';
  end if;

  insert into public.learner_answers (
    attempt_id, exercise_set_version_id, question_id, answer_text, client_revision
  )
  select target_attempt.id, target_attempt.exercise_set_version_id, questions.id, null, 0
  from public.exercise_questions as questions
  where questions.exercise_set_version_id = target_attempt.exercise_set_version_id
  on conflict (attempt_id, question_id) do nothing;

  for answer_record in
    select answers.id as answer_id, answers.answer_text, questions.id as question_id,
      questions.question_type, questions.points, keys.case_sensitive
    from public.learner_answers as answers
    join public.exercise_questions as questions on questions.id = answers.question_id
    join private.exercise_answer_keys as keys on keys.question_id = questions.id
    where answers.attempt_id = target_attempt.id
    order by questions.position
  loop
    correct := false;
    if answer_record.question_type in (
      'single_choice', 'true_false', 'multiple_choice',
      'true_false_not_given', 'matching_headings'
    ) then
      select count(*)::integer into selected_count
      from public.learner_answer_options as selections
      where selections.answer_id = answer_record.answer_id;
      select count(*)::integer into correct_count
      from private.exercise_correct_options as expected
      where expected.question_id = answer_record.question_id;
      correct := selected_count = correct_count
        and not exists (
          select 1 from public.learner_answer_options as selections
          where selections.answer_id = answer_record.answer_id
            and not exists (
              select 1 from private.exercise_correct_options as expected
              where expected.question_id = answer_record.question_id
                and expected.option_id = selections.option_id
            )
        );
    else
      correct := exists (
        select 1 from private.exercise_correct_text_answers as expected
        where expected.question_id = answer_record.question_id
          and expected.normalized_answer = private.normalize_exact_answer(
            answer_record.answer_text,
            answer_record.case_sensitive
          )
      );
    end if;
    awarded := case when correct then answer_record.points else 0 end;
    total_score := total_score + awarded;
    update public.learner_answers set
      is_correct = correct,
      awarded_points = awarded,
      finalized_at = now()
    where id = answer_record.answer_id;
  end loop;

  select sum(questions.points)::integer into total_max
  from public.exercise_questions as questions
  where questions.exercise_set_version_id = target_attempt.exercise_set_version_id;
  if total_max is null or total_max <= 0 then
    raise exception using errcode = '23514', message = 'exercise has no scorable questions';
  end if;

  update public.learner_attempts set
    status = 'scored', score = total_score, max_score = total_max,
    submitted_at = now(), scored_at = now(), last_saved_at = now()
  where id = target_attempt.id
  returning * into target_attempt;
  return target_attempt;
end;
$$;

create or replace function public.get_exercise_attempt_result(p_attempt_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_attempt public.learner_attempts;
  review_allowed boolean;
  result jsonb;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  select attempts.* into target_attempt
  from public.learner_attempts as attempts
  where attempts.id = p_attempt_id and attempts.user_id = actor_id;
  if not found then raise exception using errcode = 'P0002', message = 'attempt not found'; end if;
  if target_attempt.status <> 'scored' then
    raise exception using errcode = '55000', message = 'result is not available before submit';
  end if;
  select versions.allow_review into review_allowed
  from public.exercise_set_versions as versions
  where versions.id = target_attempt.exercise_set_version_id;

  select jsonb_build_object(
    'attemptId', target_attempt.id,
    'exerciseSetId', target_attempt.exercise_set_id,
    'exerciseSetVersionId', target_attempt.exercise_set_version_id,
    'status', target_attempt.status,
    'score', target_attempt.score,
    'maxScore', target_attempt.max_score,
    'startedAt', target_attempt.started_at,
    'expiresAt', target_attempt.expires_at,
    'submittedAt', target_attempt.submitted_at,
    'submittedAfterTimeLimit', case
      when target_attempt.expires_at is null then false
      else target_attempt.submitted_at > target_attempt.expires_at
    end,
    'reviewAllowed', review_allowed,
    'questions', coalesce(jsonb_agg(
      jsonb_build_object(
        'questionId', questions.id,
        'position', questions.position,
        'questionType', questions.question_type,
        'promptMarkdown', questions.prompt_markdown,
        'points', questions.points,
        'answerText', answers.answer_text,
        'selectedOptionIds', coalesce((
          select jsonb_agg(selections.option_id order by selections.option_id)
          from public.learner_answer_options as selections
          where selections.answer_id = answers.id
        ), '[]'::jsonb),
        'isCorrect', answers.is_correct,
        'awardedPoints', answers.awarded_points,
        'correctOptionIds', case when review_allowed then coalesce((
          select jsonb_agg(expected.option_id order by expected.option_id)
          from private.exercise_correct_options as expected
          where expected.question_id = questions.id
        ), '[]'::jsonb) else null end,
        'acceptedTextAnswers', case when review_allowed then coalesce((
          select jsonb_agg(expected.answer_text order by expected.answer_text)
          from private.exercise_correct_text_answers as expected
          where expected.question_id = questions.id
        ), '[]'::jsonb) else null end,
        'explanationMarkdown', case when review_allowed then keys.explanation_markdown else null end
      ) order by questions.position
    ), '[]'::jsonb)
  ) into result
  from public.exercise_questions as questions
  join public.learner_answers as answers
    on answers.question_id = questions.id and answers.attempt_id = target_attempt.id
  join private.exercise_answer_keys as keys on keys.question_id = questions.id
  where questions.exercise_set_version_id = target_attempt.exercise_set_version_id;
  return result;
end;
$$;

create function public.get_reading_attempt_clock(p_attempt_id uuid)
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
    and sets.domain = 'reading';
$$;

revoke all on function public.start_exercise_attempt(text, text)
from public, anon, authenticated;
revoke all on function public.save_exercise_answer(uuid, uuid, uuid[], text, integer)
from public, anon, authenticated;
revoke all on function public.submit_exercise_attempt(uuid)
from public, anon, authenticated;
revoke all on function public.get_exercise_attempt_result(uuid)
from public, anon, authenticated;
revoke all on function public.get_reading_attempt_clock(uuid)
from public, anon, authenticated;

grant execute on function public.start_exercise_attempt(text, text) to authenticated;
grant execute on function public.save_exercise_answer(uuid, uuid, uuid[], text, integer) to authenticated;
grant execute on function public.submit_exercise_attempt(uuid) to authenticated;
grant execute on function public.get_exercise_attempt_result(uuid) to authenticated;
grant execute on function public.get_reading_attempt_clock(uuid) to authenticated;

comment on table public.reading_passages is
  'Stable Reading passage identities. Learners can select only published, test-type-compatible content through RLS.';
comment on table public.reading_passage_versions is
  'Immutable published Reading passage metadata with mandatory source and licence provenance.';
comment on table public.reading_passage_sections is
  'Ordered Markdown sections for one immutable Reading passage version. Raw HTML is not a supported content format.';
comment on table public.reading_practice_versions is
  'Pins one exercise version to one Reading passage version and a server-owned time limit.';
comment on table public.reading_question_groups is
  'Ordered Reading question-group instructions linked to the shared Phase 5 exercise engine.';
comment on column public.learner_attempts.expires_at is
  'Server-derived advisory Reading deadline. Submission timestamps remain database-owned and are never accepted from the client.';
comment on function public.get_reading_attempt_clock(uuid) is
  'Returns an owner-scoped server clock snapshot for rendering a non-authoritative client countdown.';

commit;

begin;

create schema if not exists private;
revoke all on schema private from public;

create table public.learning_modules (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  skill text not null,
  test_type text not null,
  difficulty text not null,
  display_order integer not null,
  status text not null default 'draft',
  estimated_minutes smallint not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_modules_slug_check check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 1 and 100
  ),
  constraint learning_modules_title_check check (
    btrim(title) <> '' and char_length(title) <= 160
  ),
  constraint learning_modules_description_check check (
    btrim(description) <> '' and char_length(description) <= 1200
  ),
  constraint learning_modules_skill_check check (
    skill in (
      'foundations',
      'listening',
      'reading',
      'writing',
      'speaking',
      'vocabulary',
      'grammar'
    )
  ),
  constraint learning_modules_test_type_check check (
    test_type in ('academic', 'general_training', 'both')
  ),
  constraint learning_modules_difficulty_check check (
    difficulty in ('beginner', 'intermediate', 'advanced')
  ),
  constraint learning_modules_display_order_check check (
    display_order between 1 and 10000
  ),
  constraint learning_modules_status_check check (
    status in ('draft', 'in_review', 'published', 'archived')
  ),
  constraint learning_modules_estimated_minutes_check check (
    estimated_minutes between 1 and 600
  ),
  constraint learning_modules_publication_check check (
    (
      status in ('draft', 'in_review')
      and published_at is null
    )
    or (
      status in ('published', 'archived')
      and published_at is not null
    )
  )
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.learning_modules (id) on delete restrict,
  slug text not null,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lessons_slug_check check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 1 and 100
  ),
  constraint lessons_display_order_check check (
    display_order between 1 and 10000
  ),
  constraint lessons_module_slug_unique unique (module_id, slug),
  constraint lessons_module_display_order_unique unique (module_id, display_order)
);

create table public.lesson_versions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete restrict,
  version integer not null,
  title text not null,
  summary text not null,
  difficulty text not null,
  estimated_minutes smallint not null,
  status text not null default 'draft',
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_versions_version_check check (version between 1 and 10000),
  constraint lesson_versions_title_check check (
    btrim(title) <> '' and char_length(title) <= 180
  ),
  constraint lesson_versions_summary_check check (
    btrim(summary) <> '' and char_length(summary) <= 1200
  ),
  constraint lesson_versions_difficulty_check check (
    difficulty in ('beginner', 'intermediate', 'advanced')
  ),
  constraint lesson_versions_estimated_minutes_check check (
    estimated_minutes between 1 and 240
  ),
  constraint lesson_versions_status_check check (
    status in ('draft', 'in_review', 'published', 'archived')
  ),
  constraint lesson_versions_publication_check check (
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
  constraint lesson_versions_lesson_version_unique unique (lesson_id, version),
  constraint lesson_versions_lesson_id_id_unique unique (lesson_id, id)
);

create unique index lesson_versions_one_published_per_lesson_idx
on public.lesson_versions (lesson_id)
where status = 'published';

create table public.lesson_sections (
  id uuid primary key default gen_random_uuid(),
  lesson_version_id uuid not null references public.lesson_versions (id) on delete restrict,
  section_type text not null,
  title text,
  body_markdown text not null,
  display_order integer not null,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_sections_type_check check (
    section_type in ('text', 'example', 'checklist', 'tip', 'warning', 'summary')
  ),
  constraint lesson_sections_title_check check (
    title is null or (btrim(title) <> '' and char_length(title) <= 180)
  ),
  constraint lesson_sections_body_check check (
    btrim(body_markdown) <> '' and char_length(body_markdown) <= 20000
  ),
  constraint lesson_sections_display_order_check check (
    display_order between 1 and 10000
  ),
  constraint lesson_sections_version_order_unique unique (
    lesson_version_id,
    display_order
  ),
  constraint lesson_sections_version_id_id_unique unique (
    lesson_version_id,
    id
  )
);

create table public.learner_lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete restrict,
  lesson_version_id uuid not null,
  status text not null default 'in_progress',
  current_section_id uuid,
  progress_percent numeric(5, 2) not null default 0,
  started_at timestamptz not null default now(),
  last_accessed_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id),
  constraint learner_lesson_progress_version_fkey foreign key (
    lesson_id,
    lesson_version_id
  ) references public.lesson_versions (lesson_id, id) on delete restrict,
  constraint learner_lesson_progress_current_section_fkey foreign key (
    lesson_version_id,
    current_section_id
  ) references public.lesson_sections (lesson_version_id, id) on delete restrict,
  constraint learner_lesson_progress_status_check check (
    status in ('in_progress', 'completed')
  ),
  constraint learner_lesson_progress_percent_check check (
    progress_percent between 0 and 100
  ),
  constraint learner_lesson_progress_time_check check (
    last_accessed_at >= started_at
    and (completed_at is null or completed_at >= started_at)
  ),
  constraint learner_lesson_progress_completion_check check (
    (
      status = 'in_progress'
      and progress_percent < 100
      and completed_at is null
    )
    or (
      status = 'completed'
      and progress_percent = 100
      and completed_at is not null
    )
  )
);

create table public.learner_section_progress (
  user_id uuid not null,
  lesson_id uuid not null,
  lesson_version_id uuid not null,
  section_id uuid not null,
  last_viewed_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, section_id),
  constraint learner_section_progress_lesson_fkey foreign key (
    user_id,
    lesson_id
  ) references public.learner_lesson_progress (user_id, lesson_id) on delete cascade,
  constraint learner_section_progress_version_fkey foreign key (
    lesson_id,
    lesson_version_id
  ) references public.lesson_versions (lesson_id, id) on delete restrict,
  constraint learner_section_progress_section_fkey foreign key (
    lesson_version_id,
    section_id
  ) references public.lesson_sections (lesson_version_id, id) on delete restrict,
  constraint learner_section_progress_time_check check (
    completed_at is null or completed_at >= created_at
  )
);

comment on table public.learning_modules is
  'Version-controlled learning catalog groups. Learners can only discover published modules compatible with their IELTS test type.';
comment on table public.lessons is
  'Stable lesson identities and ordering within a learning module.';
comment on table public.lesson_versions is
  'Immutable published lesson snapshots. A lesson has at most one currently published version.';
comment on table public.lesson_sections is
  'Ordered Markdown sections belonging to one immutable lesson version. Raw HTML is not supported by the application renderer.';
comment on table public.learner_lesson_progress is
  'Private learner resume and completion state. Calculated fields are writable only through hardened RPCs.';
comment on table public.learner_section_progress is
  'Private section-level evidence used to calculate required-section completion.';

create index learning_modules_published_catalog_idx
on public.learning_modules (test_type, display_order, id)
where status = 'published';

create index lesson_versions_lesson_status_version_idx
on public.lesson_versions (lesson_id, status, version desc);

create index learner_lesson_progress_user_status_accessed_idx
on public.learner_lesson_progress (
  user_id,
  status,
  last_accessed_at desc
);

create index learner_lesson_progress_version_idx
on public.learner_lesson_progress (lesson_id, lesson_version_id);

create index learner_lesson_progress_current_section_idx
on public.learner_lesson_progress (lesson_version_id, current_section_id)
where current_section_id is not null;

create index learner_section_progress_user_lesson_idx
on public.learner_section_progress (user_id, lesson_id, completed_at);

create index learner_section_progress_version_idx
on public.learner_section_progress (lesson_id, lesson_version_id);

create index learner_section_progress_section_idx
on public.learner_section_progress (lesson_version_id, section_id);

create trigger set_learning_modules_updated_at
before update on public.learning_modules
for each row execute function public.set_profile_updated_at();

create trigger set_lessons_updated_at
before update on public.lessons
for each row execute function public.set_profile_updated_at();

create trigger set_lesson_versions_updated_at
before update on public.lesson_versions
for each row execute function public.set_profile_updated_at();

create trigger set_lesson_sections_updated_at
before update on public.lesson_sections
for each row execute function public.set_profile_updated_at();

create trigger set_learner_lesson_progress_updated_at
before update on public.learner_lesson_progress
for each row execute function public.set_profile_updated_at();

create trigger set_learner_section_progress_updated_at
before update on public.learner_section_progress
for each row execute function public.set_profile_updated_at();

create function public.protect_published_lesson_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status in ('published', 'archived') then
      raise exception using
        errcode = '55000',
        message = 'published lesson versions are immutable';
    end if;
    return old;
  end if;

  if old.status = 'archived' then
    raise exception using
      errcode = '55000',
      message = 'archived lesson versions are immutable';
  end if;

  if old.status = 'published' then
    if new.status = 'archived'
      and new.lesson_id is not distinct from old.lesson_id
      and new.version is not distinct from old.version
      and new.title is not distinct from old.title
      and new.summary is not distinct from old.summary
      and new.difficulty is not distinct from old.difficulty
      and new.estimated_minutes is not distinct from old.estimated_minutes
      and new.published_at is not distinct from old.published_at
      and new.archived_at is not null then
      return new;
    end if;

    raise exception using
      errcode = '55000',
      message = 'published lesson versions are immutable';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_published_lesson_version()
from public, anon, authenticated;

create trigger protect_published_lesson_versions
before update or delete on public.lesson_versions
for each row execute function public.protect_published_lesson_version();

create function public.protect_published_lesson_section()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_version_id uuid;
  target_status text;
begin
  target_version_id := case when tg_op = 'DELETE'
    then old.lesson_version_id
    else new.lesson_version_id
  end;

  select lesson_versions.status
  into target_status
  from public.lesson_versions as lesson_versions
  where lesson_versions.id = target_version_id;

  if target_status in ('published', 'archived') then
    raise exception using
      errcode = '55000',
      message = 'sections of published lesson versions are immutable';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_published_lesson_section()
from public, anon, authenticated;

create trigger protect_published_lesson_sections
before insert or update or delete on public.lesson_sections
for each row execute function public.protect_published_lesson_section();

create function public.validate_lesson_version_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  required_section_count integer;
begin
  if new.status = 'published' and old.status <> 'published' then
    select count(*)::integer
    into required_section_count
    from public.lesson_sections as lesson_sections
    where lesson_sections.lesson_version_id = new.id
      and lesson_sections.is_required;

    if required_section_count = 0 then
      raise exception using
        errcode = '23514',
        message = 'a published lesson version requires at least one required section';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_lesson_version_publication()
from public, anon, authenticated;

create trigger validate_lesson_version_before_publish
before update on public.lesson_versions
for each row execute function public.validate_lesson_version_publication();

alter table public.learning_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_versions enable row level security;
alter table public.lesson_sections enable row level security;
alter table public.learner_lesson_progress enable row level security;
alter table public.learner_section_progress enable row level security;

revoke all on table public.learning_modules from anon, authenticated;
revoke all on table public.lessons from anon, authenticated;
revoke all on table public.lesson_versions from anon, authenticated;
revoke all on table public.lesson_sections from anon, authenticated;
revoke all on table public.learner_lesson_progress from anon, authenticated;
revoke all on table public.learner_section_progress from anon, authenticated;

grant select on table public.learning_modules to authenticated;
grant select on table public.lessons to authenticated;
grant select on table public.lesson_versions to authenticated;
grant select on table public.lesson_sections to authenticated;
grant select on table public.learner_lesson_progress to authenticated;
grant select on table public.learner_section_progress to authenticated;

create function private.module_is_accessible(target_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select
      (
        learning_modules.status = 'published'
        and learning_modules.published_at <= now()
        and exists (
          select 1
          from public.learner_profiles
          where learner_profiles.user_id = (select auth.uid())
            and learner_profiles.onboarding_completed_at is not null
            and (
              learning_modules.test_type = 'both'
              or learning_modules.test_type = learner_profiles.test_type
            )
        )
      )
      or (
        learning_modules.status = 'archived'
        and exists (
          select 1
          from public.lessons
          join public.learner_lesson_progress
            on learner_lesson_progress.lesson_id = lessons.id
          where lessons.module_id = learning_modules.id
            and learner_lesson_progress.user_id = (select auth.uid())
        )
      )
    from public.learning_modules
    where learning_modules.id = target_module_id
  ), false);
$$;

create function private.lesson_is_accessible(target_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.lessons
      join public.lesson_versions
        on lesson_versions.lesson_id = lessons.id
      where lessons.id = target_lesson_id
        and lesson_versions.status = 'published'
        and lesson_versions.published_at <= now()
        and (select private.module_is_accessible(lessons.module_id))
    )
    or exists (
      select 1
      from public.learner_lesson_progress
      where learner_lesson_progress.user_id = (select auth.uid())
        and learner_lesson_progress.lesson_id = target_lesson_id
    );
$$;

create function private.lesson_version_is_accessible(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.lesson_versions
      join public.lessons on lessons.id = lesson_versions.lesson_id
      where lesson_versions.id = target_version_id
        and lesson_versions.status = 'published'
        and lesson_versions.published_at <= now()
        and (select private.module_is_accessible(lessons.module_id))
    )
    or exists (
      select 1
      from public.learner_lesson_progress
      join public.lesson_versions
        on lesson_versions.id = learner_lesson_progress.lesson_version_id
      where learner_lesson_progress.user_id = (select auth.uid())
        and learner_lesson_progress.lesson_version_id = target_version_id
        and lesson_versions.status in ('published', 'archived')
    );
$$;

create function private.section_is_accessible(target_section_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lesson_sections
    where lesson_sections.id = target_section_id
      and (select private.lesson_version_is_accessible(
        lesson_sections.lesson_version_id
      ))
  );
$$;

revoke all on function private.module_is_accessible(uuid)
from public, anon, authenticated;
revoke all on function private.lesson_is_accessible(uuid)
from public, anon, authenticated;
revoke all on function private.lesson_version_is_accessible(uuid)
from public, anon, authenticated;
revoke all on function private.section_is_accessible(uuid)
from public, anon, authenticated;

grant usage on schema private to authenticated;
grant execute on function private.module_is_accessible(uuid) to authenticated;
grant execute on function private.lesson_is_accessible(uuid) to authenticated;
grant execute on function private.lesson_version_is_accessible(uuid) to authenticated;
grant execute on function private.section_is_accessible(uuid) to authenticated;

create policy "Learners can read accessible learning modules"
on public.learning_modules
for select
to authenticated
using ((select private.module_is_accessible(id)));

create policy "Learners can read accessible lessons"
on public.lessons
for select
to authenticated
using ((select private.lesson_is_accessible(id)));

create policy "Learners can read accessible lesson versions"
on public.lesson_versions
for select
to authenticated
using ((select private.lesson_version_is_accessible(id)));

create policy "Learners can read accessible lesson sections"
on public.lesson_sections
for select
to authenticated
using ((select private.section_is_accessible(id)));

create policy "Learners can read their own lesson progress"
on public.learner_lesson_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Learners can read their own section progress"
on public.learner_section_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

create function public.open_lesson_section(
  p_lesson_id uuid,
  p_section_id uuid default null
)
returns public.learner_lesson_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  target_version_id uuid;
  target_section_id uuid;
  lesson_progress public.learner_lesson_progress;
begin
  actor_id := (select auth.uid());
  if actor_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  perform 1
  from public.profiles
  where profiles.id = actor_id
  for update;

  select learner_lesson_progress.*
  into lesson_progress
  from public.learner_lesson_progress
  where learner_lesson_progress.user_id = actor_id
    and learner_lesson_progress.lesson_id = p_lesson_id
  for update;

  if found then
    target_version_id := lesson_progress.lesson_version_id;
  else
    select lesson_versions.id
    into target_version_id
    from public.lesson_versions
    join public.lessons on lessons.id = lesson_versions.lesson_id
    where lessons.id = p_lesson_id
      and lesson_versions.status = 'published'
      and lesson_versions.published_at <= now()
      and (select private.module_is_accessible(lessons.module_id))
    order by lesson_versions.version desc
    limit 1;

    if target_version_id is null then
      raise exception using errcode = 'P0002', message = 'lesson not found';
    end if;
  end if;

  if not (select private.lesson_version_is_accessible(target_version_id)) then
    raise exception using errcode = 'P0002', message = 'lesson not found';
  end if;

  if p_section_id is null then
    target_section_id := coalesce(lesson_progress.current_section_id, (
      select lesson_sections.id
      from public.lesson_sections
      where lesson_sections.lesson_version_id = target_version_id
      order by lesson_sections.display_order, lesson_sections.id
      limit 1
    ));
  else
    target_section_id := p_section_id;
  end if;

  if target_section_id is null or not exists (
    select 1
    from public.lesson_sections
    where lesson_sections.id = target_section_id
      and lesson_sections.lesson_version_id = target_version_id
  ) then
    raise exception using errcode = '23503', message = 'section does not belong to lesson';
  end if;

  if lesson_progress.user_id is null then
    insert into public.learner_lesson_progress (
      user_id,
      lesson_id,
      lesson_version_id,
      current_section_id
    ) values (
      actor_id,
      p_lesson_id,
      target_version_id,
      target_section_id
    )
    returning * into lesson_progress;
  else
    update public.learner_lesson_progress
    set
      current_section_id = target_section_id,
      last_accessed_at = now()
    where user_id = actor_id
      and lesson_id = p_lesson_id
    returning * into lesson_progress;
  end if;

  insert into public.learner_section_progress (
    user_id,
    lesson_id,
    lesson_version_id,
    section_id,
    last_viewed_at
  ) values (
    actor_id,
    p_lesson_id,
    target_version_id,
    target_section_id,
    now()
  )
  on conflict (user_id, section_id) do update
  set last_viewed_at = excluded.last_viewed_at;

  return lesson_progress;
end;
$$;

create function public.complete_lesson_section(
  p_lesson_id uuid,
  p_section_id uuid
)
returns public.learner_lesson_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  lesson_progress public.learner_lesson_progress;
  required_count integer;
  completed_required_count integer;
  calculated_percent numeric(5, 2);
begin
  actor_id := (select auth.uid());
  if actor_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  lesson_progress := public.open_lesson_section(p_lesson_id, p_section_id);

  insert into public.learner_section_progress (
    user_id,
    lesson_id,
    lesson_version_id,
    section_id,
    last_viewed_at,
    completed_at
  ) values (
    actor_id,
    p_lesson_id,
    lesson_progress.lesson_version_id,
    p_section_id,
    now(),
    now()
  )
  on conflict (user_id, section_id) do update
  set
    last_viewed_at = excluded.last_viewed_at,
    completed_at = coalesce(
      learner_section_progress.completed_at,
      excluded.completed_at
    );

  select
    count(*) filter (where lesson_sections.is_required)::integer,
    count(*) filter (
      where lesson_sections.is_required
        and learner_section_progress.completed_at is not null
    )::integer
  into required_count, completed_required_count
  from public.lesson_sections
  left join public.learner_section_progress
    on learner_section_progress.user_id = actor_id
    and learner_section_progress.section_id = lesson_sections.id
  where lesson_sections.lesson_version_id = lesson_progress.lesson_version_id;

  if required_count <= 0 then
    raise exception using
      errcode = '23514',
      message = 'lesson requires at least one required section';
  end if;

  calculated_percent := round(
    completed_required_count::numeric * 100 / required_count,
    2
  );

  update public.learner_lesson_progress
  set
    current_section_id = p_section_id,
    last_accessed_at = now(),
    status = case
      when completed_required_count = required_count then 'completed'
      else status
    end,
    progress_percent = case
      when status = 'completed'
        or completed_required_count = required_count then 100
      else calculated_percent
    end,
    completed_at = case
      when completed_required_count = required_count
        then coalesce(completed_at, now())
      else completed_at
    end
  where user_id = actor_id
    and lesson_id = p_lesson_id
  returning * into lesson_progress;

  return lesson_progress;
end;
$$;

revoke all on function public.open_lesson_section(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.complete_lesson_section(uuid, uuid)
from public, anon, authenticated;

grant execute on function public.open_lesson_section(uuid, uuid)
to authenticated;
grant execute on function public.complete_lesson_section(uuid, uuid)
to authenticated;

commit;

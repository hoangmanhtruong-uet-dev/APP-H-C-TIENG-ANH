begin;

create index learner_attempts_user_scored_submitted_idx
on public.learner_attempts (user_id, submitted_at desc)
where status = 'scored';

create function public.get_learner_progress_overview()
returns table (
  lesson_total integer,
  lesson_completed integer,
  lesson_in_progress integer,
  lesson_progress_percent numeric,
  active_practice integer,
  active_writing integer,
  active_speaking integer,
  active_mock_tests integer,
  completed_mock_tests integer
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  return query
  with available_lessons as (
    select lessons.id
    from public.learning_modules as modules
    join public.lessons as lessons on lessons.module_id = modules.id
    join public.lesson_versions as versions
      on versions.lesson_id = lessons.id and versions.status = 'published'
    where modules.status = 'published'
  ), lesson_stats as (
    select
      count(*)::integer as total,
      count(*) filter (where progress.status = 'completed')::integer as completed,
      count(*) filter (where progress.status = 'in_progress')::integer as in_progress,
      coalesce(avg(coalesce(progress.progress_percent, 0)), 0)::numeric(5, 2) as progress_percent
    from available_lessons
    left join public.learner_lesson_progress as progress
      on progress.lesson_id = available_lessons.id and progress.user_id = actor_id
  )
  select
    lesson_stats.total,
    lesson_stats.completed,
    lesson_stats.in_progress,
    lesson_stats.progress_percent,
    (select count(*)::integer from public.learner_attempts where user_id = actor_id and status = 'in_progress'),
    (select count(*)::integer from public.writing_submissions where user_id = actor_id and status = 'draft'),
    (select count(*)::integer from public.speaking_attempts where user_id = actor_id and status = 'in_progress'),
    (select count(*)::integer from public.mock_test_sessions where user_id = actor_id and status in ('in_progress', 'submitted')),
    (select count(*)::integer from public.mock_test_sessions where user_id = actor_id and status = 'completed')
  from lesson_stats;
end;
$$;

create function public.get_learner_skill_progress()
returns table (
  skill text,
  activity_count bigint,
  scored_count bigint,
  total_score bigint,
  total_max_score bigint,
  accuracy_percent numeric,
  latest_activity_at timestamptz,
  feedback_status text
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  return query
  with objective_skills(skill) as (
    values ('reading'::text), ('listening'::text), ('vocabulary'::text), ('grammar'::text)
  ), objective_stats as (
    select
      sets.domain as skill,
      count(*)::bigint as activity_count,
      count(*)::bigint as scored_count,
      sum(attempts.score)::bigint as total_score,
      sum(attempts.max_score)::bigint as total_max_score,
      round(100 * sum(attempts.score)::numeric / nullif(sum(attempts.max_score), 0), 1) as accuracy_percent,
      max(attempts.submitted_at) as latest_activity_at
    from public.learner_attempts as attempts
    join public.exercise_sets as sets on sets.id = attempts.exercise_set_id
    where attempts.user_id = actor_id and attempts.status = 'scored'
    group by sets.domain
  ), latest_writing as (
    select submissions.id, submissions.submitted_at
    from public.writing_submissions as submissions
    where submissions.user_id = actor_id and submissions.status = 'submitted'
    order by submissions.submitted_at desc
    limit 1
  ), writing_stats as (
    select count(*)::bigint as activity_count, max(submitted_at) as latest_activity_at
    from public.writing_submissions
    where user_id = actor_id and status = 'submitted'
  ), writing_feedback as (
    select runs.status
    from latest_writing
    join public.writing_feedback_runs as runs on runs.submission_id = latest_writing.id
    where runs.user_id = actor_id
    order by runs.requested_at desc
    limit 1
  ), latest_speaking as (
    select attempts.id, attempts.submitted_at
    from public.speaking_attempts as attempts
    where attempts.user_id = actor_id and attempts.status = 'submitted'
    order by attempts.submitted_at desc
    limit 1
  ), speaking_stats as (
    select count(*)::bigint as activity_count, max(submitted_at) as latest_activity_at
    from public.speaking_attempts
    where user_id = actor_id and status = 'submitted'
  ), speaking_feedback as (
    select runs.status
    from latest_speaking
    join public.speaking_feedback_runs as runs on runs.attempt_id = latest_speaking.id
    where runs.user_id = actor_id
    order by runs.requested_at desc
    limit 1
  )
  select
    objective_skills.skill,
    coalesce(objective_stats.activity_count, 0),
    coalesce(objective_stats.scored_count, 0),
    objective_stats.total_score,
    objective_stats.total_max_score,
    objective_stats.accuracy_percent,
    objective_stats.latest_activity_at,
    null::text
  from objective_skills
  left join objective_stats using (skill)
  union all
  select 'writing', writing_stats.activity_count, 0::bigint, null::bigint, null::bigint,
    null::numeric, writing_stats.latest_activity_at, (select status from writing_feedback)
  from writing_stats
  union all
  select 'speaking', speaking_stats.activity_count, 0::bigint, null::bigint, null::bigint,
    null::numeric, speaking_stats.latest_activity_at, (select status from speaking_feedback)
  from speaking_stats;
end;
$$;

create function public.get_learner_recent_activity(p_limit integer default 8)
returns table (
  activity_type text,
  skill text,
  entity_id uuid,
  title text,
  status text,
  occurred_at timestamptz,
  href text,
  score integer,
  max_score integer,
  feedback_status text
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_limit < 1 or p_limit > 20 then
    raise exception using errcode = '22023', message = 'p_limit must be between 1 and 20';
  end if;

  return query
  with activity as (
    select
      'lesson'::text as activity_type,
      modules.skill,
      progress.lesson_id as entity_id,
      versions.title,
      progress.status,
      progress.last_accessed_at as occurred_at,
      ('/learn/' || modules.slug || '/' || lessons.slug)::text as href,
      null::integer as score,
      null::integer as max_score,
      null::text as feedback_status
    from public.learner_lesson_progress as progress
    join public.lessons as lessons on lessons.id = progress.lesson_id
    join public.learning_modules as modules on modules.id = lessons.module_id
    join public.lesson_versions as versions on versions.id = progress.lesson_version_id
    where progress.user_id = actor_id

    union all

    select
      'practice', sets.domain, attempts.id, versions.title, attempts.status,
      coalesce(attempts.submitted_at, attempts.last_saved_at),
      case when sets.domain in ('reading', 'listening')
        then '/practice/' || sets.domain || '/' || sets.slug || case when attempts.status = 'scored' then '/result/' || attempts.id else '' end
        else '/practice/' || sets.slug || case when attempts.status = 'scored' then '/result/' || attempts.id else '' end
      end,
      attempts.score::integer, attempts.max_score::integer, null::text
    from public.learner_attempts as attempts
    join public.exercise_sets as sets on sets.id = attempts.exercise_set_id
    join public.exercise_set_versions as versions on versions.id = attempts.exercise_set_version_id
    where attempts.user_id = actor_id
      and not exists (
        select 1 from public.mock_test_section_attempts as sections
        where sections.user_id = actor_id and sections.learner_attempt_id = attempts.id
      )

    union all

    select
      'writing', 'writing', submissions.id, versions.title, submissions.status,
      coalesce(submissions.submitted_at, submissions.last_saved_at),
      case when submissions.status = 'submitted'
        then '/practice/writing/' || tasks.slug || '/submission/' || submissions.id
        else '/practice/writing/' || tasks.slug
      end,
      null::integer, null::integer, feedback.status
    from public.writing_submissions as submissions
    join public.writing_tasks as tasks on tasks.id = submissions.writing_task_id
    join public.writing_task_versions as versions on versions.id = submissions.writing_task_version_id
    left join lateral (
      select runs.status
      from public.writing_feedback_runs as runs
      where runs.user_id = actor_id and runs.submission_id = submissions.id
      order by runs.requested_at desc
      limit 1
    ) as feedback on true
    where submissions.user_id = actor_id
      and not exists (
        select 1 from public.mock_test_section_attempts as sections
        where sections.user_id = actor_id and sections.writing_submission_id = submissions.id
      )

    union all

    select
      'speaking', 'speaking', attempts.id, versions.title, attempts.status,
      coalesce(attempts.submitted_at, attempts.started_at),
      '/practice/speaking/' || sets.slug || '/attempt/' || attempts.id,
      null::integer, null::integer, feedback.status
    from public.speaking_attempts as attempts
    join public.speaking_sets as sets on sets.id = attempts.speaking_set_id
    join public.speaking_set_versions as versions on versions.id = attempts.speaking_set_version_id
    left join lateral (
      select runs.status
      from public.speaking_feedback_runs as runs
      where runs.user_id = actor_id and runs.attempt_id = attempts.id
      order by runs.requested_at desc
      limit 1
    ) as feedback on true
    where attempts.user_id = actor_id
      and not exists (
        select 1 from public.mock_test_section_attempts as sections
        where sections.user_id = actor_id and sections.speaking_attempt_id = attempts.id
      )

    union all

    select
      'mock_test', 'mock_test', sessions.id, versions.title, sessions.status,
      coalesce(sessions.completed_at, sessions.submitted_at, sessions.started_at),
      case when sessions.status = 'in_progress'
        then '/mock-tests/' || tests.slug || '/session/' || sessions.id
        else '/mock-tests/' || tests.slug || '/session/' || sessions.id || '/summary'
      end,
      null::integer, null::integer, null::text
    from public.mock_test_sessions as sessions
    join public.mock_tests as tests on tests.id = sessions.mock_test_id
    join public.mock_test_versions as versions on versions.id = sessions.mock_test_version_id
    where sessions.user_id = actor_id
  )
  select activity.activity_type, activity.skill, activity.entity_id, activity.title,
    activity.status, activity.occurred_at, activity.href, activity.score,
    activity.max_score, activity.feedback_status
  from activity
  order by activity.occurred_at desc, activity.entity_id
  limit p_limit;
end;
$$;

create function public.get_learner_mock_test_history(p_limit integer default 8)
returns table (
  session_id uuid,
  mock_test_slug text,
  title text,
  status text,
  started_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  reading_score integer,
  reading_max_score integer,
  listening_score integer,
  listening_max_score integer,
  href text
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_limit < 1 or p_limit > 20 then
    raise exception using errcode = '22023', message = 'p_limit must be between 1 and 20';
  end if;

  return query
  select
    sessions.id,
    tests.slug,
    versions.title,
    sessions.status,
    sessions.started_at,
    sessions.submitted_at,
    sessions.completed_at,
    results.reading_score::integer,
    results.reading_max_score::integer,
    results.listening_score::integer,
    results.listening_max_score::integer,
    case when sessions.status = 'in_progress'
      then '/mock-tests/' || tests.slug || '/session/' || sessions.id
      else '/mock-tests/' || tests.slug || '/session/' || sessions.id || '/summary'
    end
  from public.mock_test_sessions as sessions
  join public.mock_tests as tests on tests.id = sessions.mock_test_id
  join public.mock_test_versions as versions on versions.id = sessions.mock_test_version_id
  left join public.mock_test_results as results
    on results.session_id = sessions.id and results.user_id = actor_id
  where sessions.user_id = actor_id
  order by coalesce(sessions.completed_at, sessions.submitted_at, sessions.started_at) desc, sessions.id
  limit p_limit;
end;
$$;

revoke all on function public.get_learner_progress_overview() from public, anon;
revoke all on function public.get_learner_skill_progress() from public, anon;
revoke all on function public.get_learner_recent_activity(integer) from public, anon;
revoke all on function public.get_learner_mock_test_history(integer) from public, anon;
grant execute on function public.get_learner_progress_overview() to authenticated;
grant execute on function public.get_learner_skill_progress() to authenticated;
grant execute on function public.get_learner_recent_activity(integer) to authenticated;
grant execute on function public.get_learner_mock_test_history(integer) to authenticated;

comment on function public.get_learner_progress_overview() is
  'Owner-scoped lesson and active-work counts derived from persisted learner state.';
comment on function public.get_learner_skill_progress() is
  'Owner-scoped skill evidence. Objective accuracy uses persisted scored attempts; Writing and Speaking never synthesize scores.';
comment on function public.get_learner_recent_activity(integer) is
  'Bounded owner-scoped activity feed. It intentionally excludes answer keys, essays, transcripts and audio paths.';
comment on function public.get_learner_mock_test_history(integer) is
  'Bounded owner-scoped mock history containing only persisted session and raw section score metadata.';

commit;

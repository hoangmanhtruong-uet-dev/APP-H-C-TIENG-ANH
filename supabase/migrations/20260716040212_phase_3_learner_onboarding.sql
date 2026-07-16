begin;

create table public.learner_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  test_type text,
  current_band numeric(2, 1),
  target_band numeric(2, 1),
  target_exam_date date,
  daily_study_minutes smallint,
  study_days_per_week smallint,
  priority_skills text[] not null default array[]::text[],
  primary_goal text,
  onboarding_step smallint not null default 1,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learner_profiles_test_type_check check (
    test_type is null
    or test_type in ('academic', 'general_training')
  ),
  constraint learner_profiles_current_band_check check (
    current_band is null
    or (
      current_band between 0.0 and 9.0
      and mod(current_band * 2, 1) = 0
    )
  ),
  constraint learner_profiles_target_band_check check (
    target_band is null
    or (
      target_band between 0.0 and 9.0
      and mod(target_band * 2, 1) = 0
    )
  ),
  constraint learner_profiles_daily_study_minutes_check check (
    daily_study_minutes is null
    or daily_study_minutes in (15, 30, 45, 60, 90, 120)
  ),
  constraint learner_profiles_study_days_per_week_check check (
    study_days_per_week is null
    or study_days_per_week between 1 and 7
  ),
  constraint learner_profiles_priority_skills_allowed_values_check check (
    priority_skills <@ array[
      'listening',
      'reading',
      'writing',
      'speaking'
    ]::text[]
  ),
  constraint learner_profiles_priority_skills_unique_check check (
    cardinality(priority_skills) =
      (case when 'listening' = any(priority_skills) then 1 else 0 end)
      + (case when 'reading' = any(priority_skills) then 1 else 0 end)
      + (case when 'writing' = any(priority_skills) then 1 else 0 end)
      + (case when 'speaking' = any(priority_skills) then 1 else 0 end)
  ),
  constraint learner_profiles_primary_goal_check check (
    primary_goal is null
    or primary_goal in (
      'university',
      'graduation',
      'study_abroad',
      'work',
      'immigration',
      'personal_development',
      'other'
    )
  ),
  constraint learner_profiles_onboarding_step_check check (
    onboarding_step between 1 and 8
  ),
  constraint learner_profiles_completion_integrity_check check (
    onboarding_completed_at is null
    or (
      test_type is not null
      and target_band is not null
      and daily_study_minutes is not null
      and study_days_per_week is not null
      and cardinality(priority_skills) between 1 and 4
      and primary_goal is not null
      and onboarding_step = 8
      and onboarding_completed_at >= created_at
    )
  )
);

comment on table public.learner_profiles is
  'Private IELTS onboarding and personalization preferences owned one-to-one by a profile.';
comment on column public.learner_profiles.onboarding_step is
  'Next or current onboarding step, from 1 through the review step 8.';
comment on column public.learner_profiles.onboarding_completed_at is
  'Server-controlled completion timestamp; clients cannot write this column directly.';

alter table public.learner_profiles enable row level security;

revoke all on table public.learner_profiles from anon, authenticated;
grant select on table public.learner_profiles to authenticated;
grant insert (
  user_id,
  test_type,
  current_band,
  target_band,
  target_exam_date,
  daily_study_minutes,
  study_days_per_week,
  priority_skills,
  primary_goal,
  onboarding_step
) on table public.learner_profiles to authenticated;
grant update (
  user_id,
  test_type,
  current_band,
  target_band,
  target_exam_date,
  daily_study_minutes,
  study_days_per_week,
  priority_skills,
  primary_goal,
  onboarding_step
) on table public.learner_profiles to authenticated;

create policy "Authenticated users can read their own learner profile"
on public.learner_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Authenticated users can create their own learner profile"
on public.learner_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Authenticated users can update their own learner profile"
on public.learner_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create trigger set_learner_profiles_updated_at
before update on public.learner_profiles
for each row
execute function public.set_profile_updated_at();

create function public.validate_learner_exam_date()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  learner_today date;
begin
  if new.target_exam_date is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and new.target_exam_date is not distinct from old.target_exam_date then
    return new;
  end if;

  select (now() at time zone profiles.timezone)::date
  into learner_today
  from public.profiles as profiles
  where profiles.id = new.user_id;

  if learner_today is null then
    raise exception using
      errcode = '23503',
      message = 'learner profile requires an existing public profile';
  end if;

  if new.target_exam_date < learner_today then
    raise exception using
      errcode = '23514',
      message = 'target_exam_date must not be in the past';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_learner_exam_date()
from public, anon, authenticated;

create trigger validate_learner_profiles_exam_date
before insert or update of target_exam_date on public.learner_profiles
for each row
execute function public.validate_learner_exam_date();

create function public.complete_learner_onboarding()
returns public.learner_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  learner_profile public.learner_profiles;
  learner_today date;
begin
  actor_id := (select auth.uid());

  if actor_id is null then
    raise exception using
      errcode = '28000',
      message = 'authentication required';
  end if;

  select learner_profiles.*
  into learner_profile
  from public.learner_profiles as learner_profiles
  where learner_profiles.user_id = actor_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'learner profile not found';
  end if;

  if learner_profile.test_type is null
    or learner_profile.target_band is null
    or learner_profile.daily_study_minutes is null
    or learner_profile.study_days_per_week is null
    or cardinality(learner_profile.priority_skills) not between 1 and 4
    or learner_profile.primary_goal is null then
    raise exception using
      errcode = '23514',
      message = 'learner profile is incomplete';
  end if;

  if learner_profile.target_exam_date is not null then
    select (now() at time zone profiles.timezone)::date
    into learner_today
    from public.profiles as profiles
    where profiles.id = actor_id;

    if learner_today is null
      or learner_profile.target_exam_date < learner_today then
      raise exception using
        errcode = '23514',
        message = 'target_exam_date must not be in the past';
    end if;
  end if;

  update public.learner_profiles
  set
    onboarding_step = 8,
    onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where user_id = actor_id
  returning * into learner_profile;

  return learner_profile;
end;
$$;

revoke all on function public.complete_learner_onboarding()
from public, anon, authenticated;
grant execute on function public.complete_learner_onboarding()
to authenticated;

commit;

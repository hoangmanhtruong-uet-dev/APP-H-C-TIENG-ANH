begin;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  locale text not null default 'vi-VN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length_check check (
    display_name is null
    or (
      char_length(display_name) between 1 and 100
      and display_name = btrim(display_name)
    )
  ),
  constraint profiles_timezone_length_check check (
    char_length(timezone) between 1 and 100
  ),
  constraint profiles_locale_length_check check (
    char_length(locale) between 2 and 35
  )
);

comment on table public.profiles is
  'Private learner profiles linked one-to-one with Supabase Auth users.';
comment on column public.profiles.display_name is
  'Learner-facing name. Email remains sourced from auth.users.';

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

create policy "Authenticated users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Authenticated users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_profile_updated_at() from public, anon, authenticated;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profile_updated_at();

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_display_name text;
begin
  profile_display_name := nullif(
    btrim(
      left(
        coalesce(
          new.raw_user_meta_data ->> 'display_name',
          new.raw_user_meta_data ->> 'full_name',
          ''
        ),
        100
      )
    ),
    ''
  );

  insert into public.profiles (id, display_name)
  values (new.id, profile_display_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

insert into public.profiles (id, display_name, created_at, updated_at)
select
  users.id,
  nullif(
    btrim(
      left(
        coalesce(
          users.raw_user_meta_data ->> 'display_name',
          users.raw_user_meta_data ->> 'full_name',
          ''
        ),
        100
      )
    ),
    ''
  ),
  coalesce(users.created_at, now()),
  coalesce(users.updated_at, users.created_at, now())
from auth.users as users
on conflict (id) do nothing;

commit;

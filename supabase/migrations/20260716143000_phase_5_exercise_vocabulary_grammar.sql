begin;

create table public.exercise_sets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  domain text not null,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_sets_slug_check check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 1 and 100
  ),
  constraint exercise_sets_domain_check check (
    domain in ('vocabulary', 'grammar')
  ),
  constraint exercise_sets_display_order_check check (
    display_order between 1 and 10000
  )
);

create table public.exercise_set_versions (
  id uuid primary key default gen_random_uuid(),
  exercise_set_id uuid not null references public.exercise_sets (id) on delete restrict,
  version integer not null,
  title text not null,
  summary text not null,
  instructions_markdown text not null,
  difficulty text not null,
  status text not null default 'draft',
  allow_review boolean not null default true,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_set_versions_version_check check (version between 1 and 10000),
  constraint exercise_set_versions_title_check check (
    btrim(title) <> '' and char_length(title) <= 180
  ),
  constraint exercise_set_versions_summary_check check (
    btrim(summary) <> '' and char_length(summary) <= 1200
  ),
  constraint exercise_set_versions_instructions_check check (
    btrim(instructions_markdown) <> ''
    and char_length(instructions_markdown) <= 10000
  ),
  constraint exercise_set_versions_difficulty_check check (
    difficulty in ('beginner', 'intermediate', 'advanced')
  ),
  constraint exercise_set_versions_status_check check (
    status in ('draft', 'in_review', 'published', 'archived')
  ),
  constraint exercise_set_versions_publication_check check (
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
  constraint exercise_set_versions_set_version_unique unique (exercise_set_id, version),
  constraint exercise_set_versions_set_id_id_unique unique (exercise_set_id, id)
);

create unique index exercise_set_versions_one_published_idx
on public.exercise_set_versions (exercise_set_id)
where status = 'published';

create table public.exercise_questions (
  id uuid primary key default gen_random_uuid(),
  exercise_set_version_id uuid not null references public.exercise_set_versions (id) on delete restrict,
  position integer not null,
  question_type text not null,
  prompt_markdown text not null,
  points smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_questions_position_check check (position between 1 and 1000),
  constraint exercise_questions_type_check check (
    question_type in ('single_choice', 'multiple_choice', 'true_false', 'short_text')
  ),
  constraint exercise_questions_prompt_check check (
    btrim(prompt_markdown) <> '' and char_length(prompt_markdown) <= 10000
  ),
  constraint exercise_questions_points_check check (points between 1 and 100),
  constraint exercise_questions_version_position_unique unique (
    exercise_set_version_id,
    position
  ),
  constraint exercise_questions_version_id_id_unique unique (
    exercise_set_version_id,
    id
  )
);

create table public.exercise_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.exercise_questions (id) on delete restrict,
  position integer not null,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_options_position_check check (position between 1 and 100),
  constraint exercise_options_label_check check (
    btrim(label) <> '' and char_length(label) <= 1000
  ),
  constraint exercise_options_question_position_unique unique (question_id, position),
  constraint exercise_options_question_id_id_unique unique (question_id, id)
);

create table private.exercise_answer_keys (
  question_id uuid primary key references public.exercise_questions (id) on delete restrict,
  case_sensitive boolean not null default false,
  explanation_markdown text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_answer_keys_explanation_check check (
    btrim(explanation_markdown) <> ''
    and char_length(explanation_markdown) <= 10000
  )
);

create table private.exercise_correct_options (
  question_id uuid not null,
  option_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (question_id, option_id),
  constraint exercise_correct_options_option_fkey foreign key (question_id, option_id)
    references public.exercise_options (question_id, id) on delete restrict,
  constraint exercise_correct_options_key_fkey foreign key (question_id)
    references private.exercise_answer_keys (question_id) on delete restrict
);

create table private.exercise_correct_text_answers (
  question_id uuid not null references private.exercise_answer_keys (question_id) on delete restrict,
  answer_text text not null,
  normalized_answer text not null,
  created_at timestamptz not null default now(),
  primary key (question_id, normalized_answer),
  constraint exercise_correct_text_answers_text_check check (
    btrim(answer_text) <> '' and char_length(answer_text) <= 1000
  ),
  constraint exercise_correct_text_answers_normalized_check check (
    btrim(normalized_answer) <> '' and char_length(normalized_answer) <= 1000
  )
);

create table public.vocabulary_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  normalized_term text not null,
  part_of_speech text not null,
  sense_key text not null default 'default',
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vocabulary_entries_slug_check check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 1 and 100
  ),
  constraint vocabulary_entries_normalized_term_check check (
    normalized_term = lower(btrim(normalized_term))
    and normalized_term <> ''
    and char_length(normalized_term) <= 160
  ),
  constraint vocabulary_entries_part_of_speech_check check (
    part_of_speech in (
      'noun', 'verb', 'adjective', 'adverb', 'preposition',
      'conjunction', 'pronoun', 'determiner', 'phrase'
    )
  ),
  constraint vocabulary_entries_sense_key_check check (
    sense_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(sense_key) between 1 and 80
  ),
  constraint vocabulary_entries_display_order_check check (
    display_order between 1 and 10000
  ),
  constraint vocabulary_entries_canonical_unique unique (
    normalized_term,
    part_of_speech,
    sense_key
  )
);

create table public.vocabulary_entry_versions (
  id uuid primary key default gen_random_uuid(),
  vocabulary_entry_id uuid not null references public.vocabulary_entries (id) on delete restrict,
  version integer not null,
  term text not null,
  definition_vi text not null,
  example_sentence text not null,
  topic text not null,
  tags text[] not null default '{}',
  difficulty text not null,
  status text not null default 'draft',
  related_exercise_set_id uuid references public.exercise_sets (id) on delete set null,
  source_name text not null default 'Project-authored',
  licence text not null default 'Original project content',
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vocabulary_entry_versions_version_check check (version between 1 and 10000),
  constraint vocabulary_entry_versions_term_check check (
    btrim(term) <> '' and char_length(term) <= 160
  ),
  constraint vocabulary_entry_versions_definition_check check (
    btrim(definition_vi) <> '' and char_length(definition_vi) <= 2000
  ),
  constraint vocabulary_entry_versions_example_check check (
    btrim(example_sentence) <> '' and char_length(example_sentence) <= 2000
  ),
  constraint vocabulary_entry_versions_topic_check check (
    topic ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(topic) between 1 and 80
  ),
  constraint vocabulary_entry_versions_tags_check check (
    cardinality(tags) between 1 and 12
  ),
  constraint vocabulary_entry_versions_difficulty_check check (
    difficulty in ('beginner', 'intermediate', 'advanced')
  ),
  constraint vocabulary_entry_versions_status_check check (
    status in ('draft', 'in_review', 'published', 'archived')
  ),
  constraint vocabulary_entry_versions_source_check check (
    btrim(source_name) <> '' and btrim(licence) <> ''
  ),
  constraint vocabulary_entry_versions_publication_check check (
    (status in ('draft', 'in_review') and published_at is null and archived_at is null)
    or (status = 'published' and published_at is not null and archived_at is null)
    or (
      status = 'archived' and published_at is not null and archived_at is not null
      and archived_at >= published_at
    )
  ),
  constraint vocabulary_entry_versions_entry_version_unique unique (
    vocabulary_entry_id,
    version
  )
);

create unique index vocabulary_entry_versions_one_published_idx
on public.vocabulary_entry_versions (vocabulary_entry_id)
where status = 'published';

create table public.grammar_topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grammar_topics_slug_check check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 1 and 100
  ),
  constraint grammar_topics_display_order_check check (
    display_order between 1 and 10000
  )
);

create table public.grammar_topic_versions (
  id uuid primary key default gen_random_uuid(),
  grammar_topic_id uuid not null references public.grammar_topics (id) on delete restrict,
  version integer not null,
  title text not null,
  explanation_markdown text not null,
  examples jsonb not null,
  common_mistakes jsonb not null,
  difficulty text not null,
  status text not null default 'draft',
  related_exercise_set_id uuid references public.exercise_sets (id) on delete set null,
  source_name text not null default 'Project-authored',
  licence text not null default 'Original project content',
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grammar_topic_versions_version_check check (version between 1 and 10000),
  constraint grammar_topic_versions_title_check check (
    btrim(title) <> '' and char_length(title) <= 180
  ),
  constraint grammar_topic_versions_explanation_check check (
    btrim(explanation_markdown) <> '' and char_length(explanation_markdown) <= 20000
  ),
  constraint grammar_topic_versions_examples_check check (
    jsonb_typeof(examples) = 'array' and jsonb_array_length(examples) between 1 and 20
  ),
  constraint grammar_topic_versions_mistakes_check check (
    jsonb_typeof(common_mistakes) = 'array'
    and jsonb_array_length(common_mistakes) between 1 and 20
  ),
  constraint grammar_topic_versions_difficulty_check check (
    difficulty in ('beginner', 'intermediate', 'advanced')
  ),
  constraint grammar_topic_versions_status_check check (
    status in ('draft', 'in_review', 'published', 'archived')
  ),
  constraint grammar_topic_versions_source_check check (
    btrim(source_name) <> '' and btrim(licence) <> ''
  ),
  constraint grammar_topic_versions_publication_check check (
    (status in ('draft', 'in_review') and published_at is null and archived_at is null)
    or (status = 'published' and published_at is not null and archived_at is null)
    or (
      status = 'archived' and published_at is not null and archived_at is not null
      and archived_at >= published_at
    )
  ),
  constraint grammar_topic_versions_topic_version_unique unique (
    grammar_topic_id,
    version
  )
);

create unique index grammar_topic_versions_one_published_idx
on public.grammar_topic_versions (grammar_topic_id)
where status = 'published';

create table public.learner_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_set_id uuid not null references public.exercise_sets (id) on delete restrict,
  exercise_set_version_id uuid not null,
  status text not null default 'in_progress',
  start_idempotency_key text not null,
  current_question_position integer not null default 1,
  score smallint,
  max_score smallint,
  started_at timestamptz not null default now(),
  last_saved_at timestamptz not null default now(),
  submitted_at timestamptz,
  scored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learner_attempts_version_fkey foreign key (
    exercise_set_id,
    exercise_set_version_id
  ) references public.exercise_set_versions (exercise_set_id, id) on delete restrict,
  constraint learner_attempts_id_version_unique unique (id, exercise_set_version_id),
  constraint learner_attempts_status_check check (
    status in ('in_progress', 'scored', 'abandoned')
  ),
  constraint learner_attempts_idempotency_check check (
    btrim(start_idempotency_key) <> '' and char_length(start_idempotency_key) <= 200
  ),
  constraint learner_attempts_position_check check (
    current_question_position between 1 and 1000
  ),
  constraint learner_attempts_score_check check (
    (score is null and max_score is null)
    or (score between 0 and max_score and max_score > 0)
  ),
  constraint learner_attempts_state_check check (
    (
      status = 'in_progress'
      and score is null and max_score is null
      and submitted_at is null and scored_at is null
    )
    or (
      status = 'scored'
      and score is not null and max_score is not null
      and submitted_at is not null and scored_at is not null
      and scored_at >= submitted_at
    )
    or (
      status = 'abandoned'
      and score is null and max_score is null
      and submitted_at is null and scored_at is null
    )
  ),
  constraint learner_attempts_user_start_key_unique unique (
    user_id,
    start_idempotency_key
  )
);

create unique index learner_attempts_one_active_set_idx
on public.learner_attempts (user_id, exercise_set_id)
where status = 'in_progress';

create table public.learner_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null,
  exercise_set_version_id uuid not null,
  question_id uuid not null,
  answer_text text,
  client_revision integer not null,
  is_correct boolean,
  awarded_points smallint,
  saved_at timestamptz not null default now(),
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learner_answers_attempt_version_fkey foreign key (
    attempt_id,
    exercise_set_version_id
  ) references public.learner_attempts (id, exercise_set_version_id) on delete cascade,
  constraint learner_answers_question_version_fkey foreign key (
    exercise_set_version_id,
    question_id
  ) references public.exercise_questions (exercise_set_version_id, id) on delete restrict,
  constraint learner_answers_attempt_question_unique unique (attempt_id, question_id),
  constraint learner_answers_attempt_question_id_unique unique (attempt_id, question_id, id),
  constraint learner_answers_text_check check (
    answer_text is null or char_length(answer_text) <= 2000
  ),
  constraint learner_answers_revision_check check (client_revision between 0 and 2147483647),
  constraint learner_answers_score_check check (
    (is_correct is null and awarded_points is null and finalized_at is null)
    or (is_correct is not null and awarded_points is not null and awarded_points >= 0 and finalized_at is not null)
  )
);

create table public.learner_answer_options (
  answer_id uuid not null,
  attempt_id uuid not null,
  question_id uuid not null,
  option_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (answer_id, option_id),
  constraint learner_answer_options_answer_fkey foreign key (
    attempt_id,
    question_id,
    answer_id
  ) references public.learner_answers (attempt_id, question_id, id) on delete cascade,
  constraint learner_answer_options_option_fkey foreign key (question_id, option_id)
    references public.exercise_options (question_id, id) on delete restrict
);

create index exercise_set_versions_status_idx
on public.exercise_set_versions (status, exercise_set_id, version desc);
create index exercise_questions_version_position_idx
on public.exercise_questions (exercise_set_version_id, position, id);
create index exercise_options_question_position_idx
on public.exercise_options (question_id, position, id);
create index vocabulary_entry_versions_catalog_idx
on public.vocabulary_entry_versions (status, topic, difficulty, vocabulary_entry_id);
create index grammar_topic_versions_catalog_idx
on public.grammar_topic_versions (status, difficulty, grammar_topic_id);
create index learner_attempts_user_status_recent_idx
on public.learner_attempts (user_id, status, updated_at desc);
create index learner_attempts_version_idx
on public.learner_attempts (exercise_set_version_id, user_id);
create index learner_answers_attempt_idx
on public.learner_answers (attempt_id, question_id);
create index learner_answer_options_attempt_idx
on public.learner_answer_options (attempt_id, question_id);

create trigger set_exercise_sets_updated_at before update on public.exercise_sets
for each row execute function public.set_profile_updated_at();
create trigger set_exercise_set_versions_updated_at before update on public.exercise_set_versions
for each row execute function public.set_profile_updated_at();
create trigger set_exercise_questions_updated_at before update on public.exercise_questions
for each row execute function public.set_profile_updated_at();
create trigger set_exercise_options_updated_at before update on public.exercise_options
for each row execute function public.set_profile_updated_at();
create trigger set_exercise_answer_keys_updated_at before update on private.exercise_answer_keys
for each row execute function public.set_profile_updated_at();
create trigger set_vocabulary_entries_updated_at before update on public.vocabulary_entries
for each row execute function public.set_profile_updated_at();
create trigger set_vocabulary_entry_versions_updated_at before update on public.vocabulary_entry_versions
for each row execute function public.set_profile_updated_at();
create trigger set_grammar_topics_updated_at before update on public.grammar_topics
for each row execute function public.set_profile_updated_at();
create trigger set_grammar_topic_versions_updated_at before update on public.grammar_topic_versions
for each row execute function public.set_profile_updated_at();
create trigger set_learner_attempts_updated_at before update on public.learner_attempts
for each row execute function public.set_profile_updated_at();
create trigger set_learner_answers_updated_at before update on public.learner_answers
for each row execute function public.set_profile_updated_at();

create function private.exercise_version_status_for_question(target_question_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select versions.status
  from public.exercise_questions as questions
  join public.exercise_set_versions as versions
    on versions.id = questions.exercise_set_version_id
  where questions.id = target_question_id;
$$;

revoke all on function private.exercise_version_status_for_question(uuid)
from public, anon, authenticated;

create function public.protect_exercise_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_status text;
  target_version_id uuid;
begin
  if tg_table_name = 'exercise_set_versions' then
    if tg_op = 'DELETE' and old.status in ('published', 'archived') then
      raise exception using errcode = '55000', message = 'published exercise versions are immutable';
    end if;
    if tg_op = 'UPDATE' and old.status = 'archived' then
      raise exception using errcode = '55000', message = 'archived exercise versions are immutable';
    end if;
    if tg_op = 'UPDATE' and old.status = 'published' then
      if new.status = 'archived'
        and new.exercise_set_id is not distinct from old.exercise_set_id
        and new.version is not distinct from old.version
        and new.title is not distinct from old.title
        and new.summary is not distinct from old.summary
        and new.instructions_markdown is not distinct from old.instructions_markdown
        and new.difficulty is not distinct from old.difficulty
        and new.allow_review is not distinct from old.allow_review
        and new.published_at is not distinct from old.published_at
        and new.archived_at is not null then
        return new;
      end if;
      raise exception using errcode = '55000', message = 'published exercise versions are immutable';
    end if;
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_table_name = 'exercise_questions' then
    target_version_id := case when tg_op = 'DELETE' then old.exercise_set_version_id else new.exercise_set_version_id end;
  elsif tg_table_name = 'exercise_options' then
    select questions.exercise_set_version_id into target_version_id
    from public.exercise_questions as questions
    where questions.id = case when tg_op = 'DELETE' then old.question_id else new.question_id end;
  else
    raise exception using errcode = 'P0001', message = 'unsupported exercise content table';
  end if;

  select versions.status into target_status
  from public.exercise_set_versions as versions
  where versions.id = target_version_id;

  if target_status in ('published', 'archived') then
    raise exception using errcode = '55000', message = 'published exercise content is immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.protect_exercise_content()
from public, anon, authenticated;

create trigger protect_exercise_set_versions
before update or delete on public.exercise_set_versions
for each row execute function public.protect_exercise_content();
create trigger protect_exercise_questions
before insert or update or delete on public.exercise_questions
for each row execute function public.protect_exercise_content();
create trigger protect_exercise_options
before insert or update or delete on public.exercise_options
for each row execute function public.protect_exercise_content();

create function private.protect_exercise_answers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_question_id uuid;
  target_status text;
begin
  target_question_id := case when tg_op = 'DELETE' then old.question_id else new.question_id end;
  target_status := private.exercise_version_status_for_question(target_question_id);
  if target_status in ('published', 'archived') then
    raise exception using errcode = '55000', message = 'published exercise answer keys are immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.protect_exercise_answers()
from public, anon, authenticated;

create trigger protect_exercise_answer_keys
before insert or update or delete on private.exercise_answer_keys
for each row execute function private.protect_exercise_answers();
create trigger protect_exercise_correct_options
before insert or update or delete on private.exercise_correct_options
for each row execute function private.protect_exercise_answers();
create trigger protect_exercise_correct_text_answers
before insert or update or delete on private.exercise_correct_text_answers
for each row execute function private.protect_exercise_answers();

create function public.validate_exercise_version_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  question_count integer;
  invalid_count integer;
begin
  if new.status <> 'published' or old.status = 'published' then
    return new;
  end if;

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
      (questions.question_type in ('single_choice', 'true_false') and (
        (select count(*) from public.exercise_options as options where options.question_id = questions.id) < 2
        or (select count(*) from private.exercise_correct_options as correct where correct.question_id = questions.id) <> 1
        or exists (select 1 from private.exercise_correct_text_answers as texts where texts.question_id = questions.id)
      ))
      or (questions.question_type = 'multiple_choice' and (
        (select count(*) from public.exercise_options as options where options.question_id = questions.id) < 2
        or (select count(*) from private.exercise_correct_options as correct where correct.question_id = questions.id) < 1
        or exists (select 1 from private.exercise_correct_text_answers as texts where texts.question_id = questions.id)
      ))
      or (questions.question_type = 'short_text' and (
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

  return new;
end;
$$;

revoke all on function public.validate_exercise_version_publication()
from public, anon, authenticated;

create trigger validate_exercise_version_before_publish
before update on public.exercise_set_versions
for each row execute function public.validate_exercise_version_publication();

create function public.protect_versioned_learning_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.status in ('published', 'archived') then
    raise exception using errcode = '55000', message = 'published learning content is immutable';
  end if;
  if tg_op = 'UPDATE' and old.status = 'archived' then
    raise exception using errcode = '55000', message = 'archived learning content is immutable';
  end if;
  if tg_op = 'UPDATE' and old.status = 'published' then
    if new.status = 'archived'
      and to_jsonb(new) - array['status', 'archived_at', 'updated_at']
        is not distinct from to_jsonb(old) - array['status', 'archived_at', 'updated_at']
      and new.archived_at is not null then
      return new;
    end if;
    raise exception using errcode = '55000', message = 'published learning content is immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.protect_versioned_learning_content()
from public, anon, authenticated;

create trigger protect_vocabulary_entry_versions
before update or delete on public.vocabulary_entry_versions
for each row execute function public.protect_versioned_learning_content();
create trigger protect_grammar_topic_versions
before update or delete on public.grammar_topic_versions
for each row execute function public.protect_versioned_learning_content();

alter table public.exercise_sets enable row level security;
alter table public.exercise_set_versions enable row level security;
alter table public.exercise_questions enable row level security;
alter table public.exercise_options enable row level security;
alter table public.vocabulary_entries enable row level security;
alter table public.vocabulary_entry_versions enable row level security;
alter table public.grammar_topics enable row level security;
alter table public.grammar_topic_versions enable row level security;
alter table public.learner_attempts enable row level security;
alter table public.learner_answers enable row level security;
alter table public.learner_answer_options enable row level security;

revoke all on table public.exercise_sets from anon, authenticated;
revoke all on table public.exercise_set_versions from anon, authenticated;
revoke all on table public.exercise_questions from anon, authenticated;
revoke all on table public.exercise_options from anon, authenticated;
revoke all on table public.vocabulary_entries from anon, authenticated;
revoke all on table public.vocabulary_entry_versions from anon, authenticated;
revoke all on table public.grammar_topics from anon, authenticated;
revoke all on table public.grammar_topic_versions from anon, authenticated;
revoke all on table public.learner_attempts from anon, authenticated;
revoke all on table public.learner_answers from anon, authenticated;
revoke all on table public.learner_answer_options from anon, authenticated;
revoke all on table private.exercise_answer_keys from public, anon, authenticated;
revoke all on table private.exercise_correct_options from public, anon, authenticated;
revoke all on table private.exercise_correct_text_answers from public, anon, authenticated;

grant select on table public.exercise_sets to authenticated;
grant select on table public.exercise_set_versions to authenticated;
grant select on table public.exercise_questions to authenticated;
grant select on table public.exercise_options to authenticated;
grant select on table public.vocabulary_entries to authenticated;
grant select on table public.vocabulary_entry_versions to authenticated;
grant select on table public.grammar_topics to authenticated;
grant select on table public.grammar_topic_versions to authenticated;
grant select on table public.learner_attempts to authenticated;
grant select on table public.learner_answers to authenticated;
grant select on table public.learner_answer_options to authenticated;

create function private.completed_learner_exists()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.learner_profiles
    where learner_profiles.user_id = (select auth.uid())
      and learner_profiles.onboarding_completed_at is not null
  );
$$;

create function private.exercise_version_is_accessible(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.exercise_set_versions as versions
    where versions.id = target_version_id
      and versions.status = 'published'
      and versions.published_at <= now()
      and (select private.completed_learner_exists())
  ) or exists (
    select 1 from public.learner_attempts as attempts
    where attempts.user_id = (select auth.uid())
      and attempts.exercise_set_version_id = target_version_id
  );
$$;

create function private.exercise_set_is_accessible(target_set_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.exercise_set_versions as versions
    where versions.exercise_set_id = target_set_id
      and (select private.exercise_version_is_accessible(versions.id))
  );
$$;

create function private.question_is_accessible(target_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.exercise_questions as questions
    where questions.id = target_question_id
      and (select private.exercise_version_is_accessible(questions.exercise_set_version_id))
  );
$$;

create function private.vocabulary_version_is_accessible(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vocabulary_entry_versions as versions
    where versions.id = target_version_id
      and versions.status = 'published'
      and versions.published_at <= now()
      and (select private.completed_learner_exists())
  );
$$;

create function private.grammar_version_is_accessible(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.grammar_topic_versions as versions
    where versions.id = target_version_id
      and versions.status = 'published'
      and versions.published_at <= now()
      and (select private.completed_learner_exists())
  );
$$;

revoke all on function private.completed_learner_exists() from public, anon, authenticated;
revoke all on function private.exercise_version_is_accessible(uuid) from public, anon, authenticated;
revoke all on function private.exercise_set_is_accessible(uuid) from public, anon, authenticated;
revoke all on function private.question_is_accessible(uuid) from public, anon, authenticated;
revoke all on function private.vocabulary_version_is_accessible(uuid) from public, anon, authenticated;
revoke all on function private.grammar_version_is_accessible(uuid) from public, anon, authenticated;

grant execute on function private.completed_learner_exists() to authenticated;
grant execute on function private.exercise_version_is_accessible(uuid) to authenticated;
grant execute on function private.exercise_set_is_accessible(uuid) to authenticated;
grant execute on function private.question_is_accessible(uuid) to authenticated;
grant execute on function private.vocabulary_version_is_accessible(uuid) to authenticated;
grant execute on function private.grammar_version_is_accessible(uuid) to authenticated;

create policy "Learners can read accessible exercise sets"
on public.exercise_sets for select to authenticated
using ((select private.exercise_set_is_accessible(id)));
create policy "Learners can read accessible exercise versions"
on public.exercise_set_versions for select to authenticated
using ((select private.exercise_version_is_accessible(id)));
create policy "Learners can read accessible exercise questions"
on public.exercise_questions for select to authenticated
using ((select private.exercise_version_is_accessible(exercise_set_version_id)));
create policy "Learners can read accessible exercise options"
on public.exercise_options for select to authenticated
using ((select private.question_is_accessible(question_id)));
create policy "Learners can read published vocabulary identities"
on public.vocabulary_entries for select to authenticated
using (exists (
  select 1 from public.vocabulary_entry_versions as versions
  where versions.vocabulary_entry_id = vocabulary_entries.id
    and (select private.vocabulary_version_is_accessible(versions.id))
));
create policy "Learners can read published vocabulary versions"
on public.vocabulary_entry_versions for select to authenticated
using ((select private.vocabulary_version_is_accessible(id)));
create policy "Learners can read published grammar identities"
on public.grammar_topics for select to authenticated
using (exists (
  select 1 from public.grammar_topic_versions as versions
  where versions.grammar_topic_id = grammar_topics.id
    and (select private.grammar_version_is_accessible(versions.id))
));
create policy "Learners can read published grammar versions"
on public.grammar_topic_versions for select to authenticated
using ((select private.grammar_version_is_accessible(id)));
create policy "Learners can read their own attempts"
on public.learner_attempts for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Learners can read their own answers"
on public.learner_answers for select to authenticated
using (exists (
  select 1 from public.learner_attempts as attempts
  where attempts.id = learner_answers.attempt_id
    and attempts.user_id = (select auth.uid())
));
create policy "Learners can read their own answer selections"
on public.learner_answer_options for select to authenticated
using (exists (
  select 1 from public.learner_attempts as attempts
  where attempts.id = learner_answer_options.attempt_id
    and attempts.user_id = (select auth.uid())
));

create function private.normalize_exact_answer(value text, case_sensitive boolean)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when value is null then null
    when case_sensitive then pg_catalog.regexp_replace(pg_catalog.btrim(value), '[[:space:]]+', ' ', 'g')
    else pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(value), '[[:space:]]+', ' ', 'g'))
  end;
$$;

revoke all on function private.normalize_exact_answer(text, boolean)
from public, anon, authenticated;

create function public.start_exercise_attempt(
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

  select sets.id, versions.id into target_set_id, target_version_id
  from public.exercise_sets as sets
  join public.exercise_set_versions as versions on versions.exercise_set_id = sets.id
  where sets.slug = p_exercise_slug
    and versions.status = 'published'
    and versions.published_at <= now();
  if target_version_id is null then
    raise exception using errcode = 'P0002', message = 'exercise not found';
  end if;

  select attempts.* into result
  from public.learner_attempts as attempts
  where attempts.user_id = actor_id
    and attempts.start_idempotency_key = p_idempotency_key;
  if found then return result; end if;

  insert into public.learner_attempts (
    user_id, exercise_set_id, exercise_set_version_id, start_idempotency_key
  ) values (
    actor_id, target_set_id, target_version_id, p_idempotency_key
  )
  on conflict (user_id, exercise_set_id) where status = 'in_progress'
  do update set last_saved_at = now(), updated_at = now()
  returning * into result;

  return result;
end;
$$;

create function public.save_exercise_answer(
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

  if target_question.question_type in ('single_choice', 'true_false') then
    if distinct_count <> 1 or nullif(btrim(coalesce(p_answer_text, '')), '') is not null then
      raise exception using errcode = '22023', message = 'one option is required';
    end if;
  elsif target_question.question_type = 'multiple_choice' then
    if distinct_count < 1 or nullif(btrim(coalesce(p_answer_text, '')), '') is not null then
      raise exception using errcode = '22023', message = 'one or more options are required';
    end if;
  elsif target_question.question_type = 'short_text' then
    if distinct_count <> 0 or nullif(btrim(coalesce(p_answer_text, '')), '') is null then
      raise exception using errcode = '22023', message = 'a text answer is required';
    end if;
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

create function public.submit_exercise_attempt(p_attempt_id uuid)
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
    if answer_record.question_type in ('single_choice', 'true_false', 'multiple_choice') then
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

create function public.get_exercise_attempt_result(p_attempt_id uuid)
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
    'submittedAt', target_attempt.submitted_at,
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

revoke all on function public.start_exercise_attempt(text, text) from public, anon, authenticated;
revoke all on function public.save_exercise_answer(uuid, uuid, uuid[], text, integer) from public, anon, authenticated;
revoke all on function public.submit_exercise_attempt(uuid) from public, anon, authenticated;
revoke all on function public.get_exercise_attempt_result(uuid) from public, anon, authenticated;
grant execute on function public.start_exercise_attempt(text, text) to authenticated;
grant execute on function public.save_exercise_answer(uuid, uuid, uuid[], text, integer) to authenticated;
grant execute on function public.submit_exercise_attempt(uuid) to authenticated;
grant execute on function public.get_exercise_attempt_result(uuid) to authenticated;

comment on table private.exercise_answer_keys is
  'Hidden scoring configuration. It is not exposed through the Data API and has no learner grants.';
comment on table public.learner_attempts is
  'Owner-scoped attempt snapshots. Score and state are written only by hardened database functions.';
comment on function public.submit_exercise_attempt(uuid) is
  'Idempotently locks and scores one owner attempt from its immutable published exercise version.';

commit;

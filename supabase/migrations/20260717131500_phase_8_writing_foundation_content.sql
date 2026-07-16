insert into public.writing_tasks (id, slug, display_order)
values
  ('81000000-0000-4000-8000-000000000001', 'community-green-spaces', 1),
  ('81000000-0000-4000-8000-000000000002', 'flexible-library-hours', 2)
on conflict (id) do nothing;

with published_content as (
  select
    '82000000-0000-4000-8000-000000000001'::uuid as id,
    '81000000-0000-4000-8000-000000000001'::uuid as writing_task_id,
    1::smallint as version,
    'task_2'::text as task_type,
    'academic'::text as test_type,
    'Community green spaces'::text as title,
    'Discuss how towns should balance shared green areas with other local needs.'::text as description,
    'Some towns are converting unused land into community green spaces. Others argue that the same land should be used for housing or local businesses. To what extent do you agree that creating green spaces is the best use of unused urban land?'::text as prompt_text,
    'Write a clear position, support it with relevant reasons and examples, and organise your response into paragraphs. Aim for at least 250 words.'::text as instructions,
    'intermediate'::text as difficulty,
    250::integer as word_target,
    250::integer as minimum_words,
    1000::integer as maximum_words,
    2400::integer as time_limit_seconds,
    'published'::text as status,
    'IELTS Flow original content'::text as source_name,
    'Original educational content; all rights reserved by the project authors'::text as licence,
    '2026-07-16 00:00:00+00'::timestamptz as published_at
)
insert into public.writing_task_versions (
  id,
  writing_task_id,
  version,
  task_type,
  test_type,
  title,
  description,
  prompt_text,
  instructions,
  difficulty,
  word_target,
  minimum_words,
  maximum_words,
  time_limit_seconds,
  status,
  source_name,
  licence,
  content_checksum,
  published_at
)
select
  id,
  writing_task_id,
  version,
  task_type,
  test_type,
  title,
  description,
  prompt_text,
  instructions,
  difficulty,
  word_target,
  minimum_words,
  maximum_words,
  time_limit_seconds,
  status,
  source_name,
  licence,
  encode(
    extensions.digest(
      convert_to(
        concat_ws(
          E'\n',
          task_type,
          test_type,
          title,
          description,
          prompt_text,
          instructions,
          difficulty,
          word_target::text,
          minimum_words::text,
          maximum_words::text,
          time_limit_seconds::text
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  ),
  published_at
from published_content
on conflict (id) do nothing;

with draft_content as (
  select
    '82000000-0000-4000-8000-000000000002'::uuid as id,
    '81000000-0000-4000-8000-000000000002'::uuid as writing_task_id,
    1::smallint as version,
    'task_2'::text as task_type,
    'both'::text as test_type,
    'Flexible library hours'::text as title,
    'Unpublished fixture used to verify that learners cannot read draft Writing content.'::text as description,
    'A local library is considering changing its opening hours. Discuss possible benefits and drawbacks.'::text as prompt_text,
    'This task remains unpublished and must never be visible to learners.'::text as instructions,
    'beginner'::text as difficulty,
    250::integer as word_target,
    250::integer as minimum_words,
    1000::integer as maximum_words,
    2400::integer as time_limit_seconds,
    'draft'::text as status,
    'IELTS Flow original content'::text as source_name,
    'Original educational content; all rights reserved by the project authors'::text as licence
)
insert into public.writing_task_versions (
  id,
  writing_task_id,
  version,
  task_type,
  test_type,
  title,
  description,
  prompt_text,
  instructions,
  difficulty,
  word_target,
  minimum_words,
  maximum_words,
  time_limit_seconds,
  status,
  source_name,
  licence,
  content_checksum
)
select
  id,
  writing_task_id,
  version,
  task_type,
  test_type,
  title,
  description,
  prompt_text,
  instructions,
  difficulty,
  word_target,
  minimum_words,
  maximum_words,
  time_limit_seconds,
  status,
  source_name,
  licence,
  encode(
    extensions.digest(
      convert_to(
        concat_ws(
          E'\n',
          task_type,
          test_type,
          title,
          description,
          prompt_text,
          instructions,
          difficulty,
          word_target::text,
          minimum_words::text,
          maximum_words::text,
          time_limit_seconds::text
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  )
from draft_content
on conflict (id) do nothing;

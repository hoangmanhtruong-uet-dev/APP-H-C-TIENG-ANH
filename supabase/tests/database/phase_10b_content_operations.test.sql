begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

select extensions.ok(
  not exists (
    select lesson_id from public.lesson_versions where status = 'published' group by lesson_id having count(*) > 1
  ), 'Every lesson identity has at most one published version'
);
select extensions.ok(
  not exists (
    select exercise_set_id from public.exercise_set_versions where status = 'published' group by exercise_set_id having count(*) > 1
  ), 'Every exercise identity has at most one published version'
);
select extensions.ok(
  not exists (
    select writing_task_id from public.writing_task_versions where status = 'published' group by writing_task_id having count(*) > 1
  ), 'Every Writing identity has at most one published version'
);
select extensions.ok(
  not exists (
    select speaking_set_id from public.speaking_set_versions where status = 'published' group by speaking_set_id having count(*) > 1
  ), 'Every Speaking identity has at most one published version'
);
select extensions.ok(
  not exists (
    select mock_test_id from public.mock_test_versions where status = 'published' group by mock_test_id having count(*) > 1
  ), 'Every Mock Test identity has at most one published version'
);
select extensions.ok(
  not exists (
    select 1 from public.writing_task_versions
    where status = 'published' and (btrim(source_name) = '' or btrim(licence) = '' or content_checksum !~ '^[0-9a-f]{64}$')
  ), 'Published Writing content has provenance and checksum'
);
select extensions.ok(
  not exists (
    select 1 from public.speaking_set_versions
    where status = 'published' and (btrim(source_name) = '' or btrim(licence) = '' or content_checksum !~ '^[0-9a-f]{64}$')
  ), 'Published Speaking content has provenance and checksum'
);
select extensions.ok(
  not exists (
    select versions.id
    from public.mock_test_versions as versions
    left join public.mock_test_sections as sections on sections.mock_test_version_id = versions.id
    where versions.status = 'published'
    group by versions.id
    having count(*) <> 4 or count(distinct sections.section_type) <> 4
  ), 'Published Mock Tests contain exactly four distinct required skill sections'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'private.exercise_answer_keys', 'select')
  and (select relrowsecurity from pg_catalog.pg_class where oid = 'public.speaking_transcripts'::regclass)
  and exists (
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'speaking_transcripts'
      and roles = array['authenticated'::name]
      and qual like '%auth.uid()%'
  ),
  'Answer keys remain private and transcript reads remain owner-scoped by RLS'
);

select * from extensions.finish();
rollback;

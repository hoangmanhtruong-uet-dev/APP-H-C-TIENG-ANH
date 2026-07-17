insert into public.mock_tests (id, slug, display_order)
values
  ('a1000000-0000-4000-8000-000000000001', 'academic-foundation-mock', 1),
  ('a1000000-0000-4000-8000-000000000002', 'editorial-draft-mock', 2)
on conflict (id) do nothing;

insert into public.mock_test_versions (
  id, mock_test_id, version, title, description, test_type, difficulty,
  estimated_minutes, status, published_at
) values
  (
    'a1100000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 1,
    'Academic foundation mock test',
    'A compact original four-skill mock assembled from the project Reading, Listening, Writing and Speaking foundations.',
    'academic', 'intermediate', 78, 'draft', null
  ),
  (
    'a1100000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 1,
    'Editorial draft mock test',
    'An unpublished fixture used to prove that draft mock tests and their sections remain invisible to learners.',
    'academic', 'intermediate', 78, 'draft', null
  )
on conflict (id) do nothing;

insert into public.mock_test_sections (
  id, mock_test_version_id, section_type, section_order, time_limit_seconds, required,
  exercise_set_version_id, writing_task_version_id, speaking_set_version_id
) values
  ('a1200000-0000-4000-8000-000000000001', 'a1100000-0000-4000-8000-000000000001', 'reading', 1, 1200, true,
    '66000000-0000-4000-8000-000000000101', null, null),
  ('a1200000-0000-4000-8000-000000000002', 'a1100000-0000-4000-8000-000000000001', 'listening', 2, 600, true,
    '77000000-0000-4000-8000-000000000101', null, null),
  ('a1200000-0000-4000-8000-000000000003', 'a1100000-0000-4000-8000-000000000001', 'writing', 3, 2400, true,
    null, '82000000-0000-4000-8000-000000000001', null),
  ('a1200000-0000-4000-8000-000000000004', 'a1100000-0000-4000-8000-000000000001', 'speaking', 4, 480, true,
    null, null, '91100000-0000-4000-8000-000000000001'),
  ('a1200000-0000-4000-8000-000000000011', 'a1100000-0000-4000-8000-000000000002', 'reading', 1, 1200, true,
    '66000000-0000-4000-8000-000000000101', null, null),
  ('a1200000-0000-4000-8000-000000000012', 'a1100000-0000-4000-8000-000000000002', 'listening', 2, 600, true,
    '77000000-0000-4000-8000-000000000101', null, null),
  ('a1200000-0000-4000-8000-000000000013', 'a1100000-0000-4000-8000-000000000002', 'writing', 3, 2400, true,
    null, '82000000-0000-4000-8000-000000000001', null),
  ('a1200000-0000-4000-8000-000000000014', 'a1100000-0000-4000-8000-000000000002', 'speaking', 4, 480, true,
    null, null, '91100000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

update public.mock_test_versions
set status = 'published', published_at = '2026-07-16T00:00:00Z'::timestamptz
where id = 'a1100000-0000-4000-8000-000000000001'::uuid and status = 'draft';

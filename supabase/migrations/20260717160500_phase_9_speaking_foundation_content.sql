insert into public.speaking_sets (id, slug, display_order)
values
  ('91000000-0000-4000-8000-000000000001', 'everyday-choices', 1),
  ('91000000-0000-4000-8000-000000000002', 'neighbourhood-ideas-draft', 2);

insert into public.speaking_set_versions (
  id, speaking_set_id, version, title, description, instructions, test_type,
  difficulty, estimated_minutes, status, source_name, licence, content_checksum, published_at
) values (
  '91100000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000001',
  1,
  'Everyday choices',
  'A short speaking practice about routines, decisions and shared spaces.',
  'Answer naturally in your own words. The suggested timing is for practice, not an official test score.',
  'both', 'beginner', 8, 'published', 'English Learning Lab original content',
  'Original educational content - project use',
  'a7bfc1f5783b327b27fd1d17c022bcf23d9f2a42584d4f89d5eabda68add1234', now()
), (
  '91100000-0000-4000-8000-000000000002',
  '91000000-0000-4000-8000-000000000002',
  1,
  'Neighbourhood ideas',
  'Editorial draft for a future speaking practice.',
  'This draft must never be visible to learners.',
  'both', 'intermediate', 8, 'draft', 'English Learning Lab original content',
  'Original educational content - project use',
  'b8c0d2e6894c438c38fe2e28d133cdf34e0a3b53695e5f90e6fbceb79bee2345', null
);

insert into public.speaking_prompts (
  id, speaking_set_version_id, part, prompt_text, instructions, preparation_seconds,
  minimum_answer_seconds, maximum_answer_seconds, display_order, is_required
) values
  (
    '91200000-0000-4000-8000-000000000001', '91100000-0000-4000-8000-000000000001',
    'part_1', 'What part of your daily routine helps you feel ready for the day?',
    'Give a brief answer and one reason.', 0, 10, 45, 1, true
  ),
  (
    '91200000-0000-4000-8000-000000000002', '91100000-0000-4000-8000-000000000001',
    'part_1', 'Do you usually make plans early or decide at the last moment?',
    'Describe your usual approach with a small example.', 0, 10, 45, 2, true
  ),
  (
    '91200000-0000-4000-8000-000000000003', '91100000-0000-4000-8000-000000000001',
    'part_2', 'Describe a simple choice that improved one of your days. Say what you chose, why you chose it, and what changed afterwards.',
    'Use the preparation time to note two or three keywords. Speak from your own experience or create an original example.',
    30, 45, 120, 3, true
  ),
  (
    '91200000-0000-4000-8000-000000000004', '91100000-0000-4000-8000-000000000001',
    'part_3', 'How can schools or workplaces make everyday decisions easier for people?',
    'Develop one idea, explain its effect, and mention a possible drawback.', 0, 30, 90, 4, true
  ),
  (
    '91200000-0000-4000-8000-000000000005', '91100000-0000-4000-8000-000000000002',
    'part_1', 'Which shared place in your neighbourhood would you improve first?',
    'Editorial draft prompt.', 0, 10, 45, 1, true
  );

comment on table public.speaking_prompts is
  'Small original Phase 9 seed. These prompts are not copied from an official or copyrighted IELTS paper.';

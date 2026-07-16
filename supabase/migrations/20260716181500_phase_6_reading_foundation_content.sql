begin;

insert into public.reading_passages (id, slug, test_type, display_order)
select
  '66000000-0000-4000-8000-000000000001'::uuid,
  'cool-roofs-neighbourhood-pilot',
  'academic',
  1
where not exists (
  select 1
  from public.reading_passages
  where id = '66000000-0000-4000-8000-000000000001'::uuid
);

insert into public.reading_passage_versions (
  id,
  reading_passage_id,
  version,
  title,
  summary,
  difficulty,
  status,
  source_name,
  source_url,
  licence
)
select
  '66000000-0000-4000-8000-000000000002'::uuid,
  '66000000-0000-4000-8000-000000000001'::uuid,
  1,
  'Cool roofs: what one neighbourhood pilot actually showed',
  'An original short Academic Reading passage about a community heat-mitigation pilot and the limits of its evidence.',
  'intermediate',
  'draft',
  'IELTS Self-study project editorial team',
  null,
  'Original project-authored content'
where not exists (
  select 1
  from public.reading_passage_versions
  where id = '66000000-0000-4000-8000-000000000002'::uuid
);

insert into public.reading_passage_sections (
  id,
  reading_passage_version_id,
  position,
  heading,
  body_markdown
)
select seed.id::uuid, seed.version_id::uuid, seed.position, seed.heading, seed.body
from (values
  (
    '66000000-0000-4000-8000-000000000010',
    '66000000-0000-4000-8000-000000000002',
    1,
    'A',
    'On hot afternoons, a city street can remain warm long after nearby fields have begun to cool. Dark roofs and paved surfaces absorb solar energy during the day and release it slowly in the evening. This does not mean every part of a city is equally hot. Shade, building height, traffic and access to green space can produce noticeable differences over only a few blocks. For residents, those differences matter because indoor temperatures are influenced by the materials above and around their homes.'
  ),
  (
    '66000000-0000-4000-8000-000000000011',
    '66000000-0000-4000-8000-000000000002',
    2,
    'B',
    'A neighbourhood association in the fictional city of Bellwether tested a modest response. With permission from twelve homeowners, volunteers coated half of each selected roof with a pale, reflective finish while leaving the other half unchanged. Small sensors recorded surface temperature at fifteen-minute intervals for six weeks. The team also placed identical thermometers in the upper rooms below four of the roofs. This split-roof design did not remove every source of variation, but it allowed each treated surface to be compared with a nearby untreated surface exposed to almost the same weather.'
  ),
  (
    '66000000-0000-4000-8000-000000000012',
    '66000000-0000-4000-8000-000000000002',
    3,
    'C',
    'During clear midday periods, the coated areas were usually cooler at the surface. The difference was smaller after cloudy mornings and almost disappeared at night. Indoor measurements were less consistent: two rooms became slightly cooler, one changed very little, and one was affected by an open window that made comparison unreliable. The project therefore reported surface temperature as its strongest result rather than claiming a guaranteed reduction in household energy use.'
  ),
  (
    '66000000-0000-4000-8000-000000000013',
    '66000000-0000-4000-8000-000000000002',
    4,
    'D',
    'The volunteers also learned that installation was only part of the work. Dust reduced the brightness of several coated sections, and two roofs needed small repairs before coating. A follow-up inspection was scheduled for the next dry season to see whether cleaning and maintenance changed performance. Because the pilot involved few homes and lasted only six weeks, its organisers did not describe it as proof for the whole city. Instead, they treated it as a practical method for asking better questions before funding a larger study.'
  )
) as seed(id, version_id, position, heading, body)
where not exists (
  select 1
  from public.reading_passage_sections as existing
  where existing.id = seed.id::uuid
);

insert into public.exercise_sets (id, slug, domain, display_order)
select
  '66000000-0000-4000-8000-000000000100'::uuid,
  'academic-reading-cool-roofs',
  'reading',
  30
where not exists (
  select 1
  from public.exercise_sets
  where id = '66000000-0000-4000-8000-000000000100'::uuid
);

insert into public.exercise_set_versions (
  id,
  exercise_set_id,
  version,
  title,
  summary,
  instructions_markdown,
  difficulty,
  status,
  allow_review
)
select
  '66000000-0000-4000-8000-000000000101'::uuid,
  '66000000-0000-4000-8000-000000000100'::uuid,
  1,
  'Cool roofs neighbourhood pilot',
  'Read an original research-style passage and answer ten questions across four Reading task types.',
  'Read the passage carefully. Your answers are saved automatically. The countdown is guidance for this practice set; the database records the real start and submit times.',
  'intermediate',
  'draft',
  true
where not exists (
  select 1
  from public.exercise_set_versions
  where id = '66000000-0000-4000-8000-000000000101'::uuid
);

insert into public.reading_practice_versions (
  exercise_set_version_id,
  reading_passage_version_id,
  time_limit_seconds
)
select
  '66000000-0000-4000-8000-000000000101'::uuid,
  '66000000-0000-4000-8000-000000000002'::uuid,
  1200
where not exists (
  select 1
  from public.reading_practice_versions
  where exercise_set_version_id = '66000000-0000-4000-8000-000000000101'::uuid
);

insert into public.reading_question_groups (
  id,
  exercise_set_version_id,
  reading_passage_version_id,
  passage_section_id,
  position,
  group_type,
  title,
  instructions_markdown,
  max_answer_words
)
select
  seed.id::uuid,
  '66000000-0000-4000-8000-000000000101'::uuid,
  '66000000-0000-4000-8000-000000000002'::uuid,
  seed.section_id::uuid,
  seed.position,
  seed.group_type,
  seed.title,
  seed.instructions,
  seed.max_words
from (values
  (
    '66000000-0000-4000-8000-000000000110',
    null,
    1,
    'multiple_choice',
    'Questions 1–2',
    'Choose the correct answer. Question 2 has more than one correct option.',
    null::smallint
  ),
  (
    '66000000-0000-4000-8000-000000000111',
    null,
    2,
    'true_false_not_given',
    'Questions 3–5',
    'Choose **True** if the statement agrees with the passage, **False** if it contradicts the passage, or **Not Given** if the passage does not say.',
    null::smallint
  ),
  (
    '66000000-0000-4000-8000-000000000112',
    null,
    3,
    'matching_headings',
    'Questions 6–8',
    'Choose the best heading for each named section. One heading will not be used.',
    null::smallint
  ),
  (
    '66000000-0000-4000-8000-000000000113',
    '66000000-0000-4000-8000-000000000013',
    4,
    'summary_completion',
    'Questions 9–10',
    'Complete each sentence with **no more than two words** from the passage.',
    2::smallint
  )
) as seed(id, section_id, position, group_type, title, instructions, max_words)
where not exists (
  select 1
  from public.reading_question_groups as existing
  where existing.id = seed.id::uuid
);

insert into public.exercise_questions (
  id,
  exercise_set_version_id,
  position,
  question_type,
  prompt_markdown,
  points,
  reading_question_group_id
)
select
  seed.id::uuid,
  '66000000-0000-4000-8000-000000000101'::uuid,
  seed.position,
  seed.question_type,
  seed.prompt,
  1,
  seed.group_id::uuid
from (values
  ('66000000-0000-4000-8000-000000000201', 1, 'multiple_choice', 'What is the main purpose of paragraph B?', '66000000-0000-4000-8000-000000000110'),
  ('66000000-0000-4000-8000-000000000202', 2, 'multiple_choice', 'Which **two** features strengthened the comparison in the pilot?', '66000000-0000-4000-8000-000000000110'),
  ('66000000-0000-4000-8000-000000000203', 3, 'true_false_not_given', 'Every part of a city experiences the same afternoon temperature.', '66000000-0000-4000-8000-000000000111'),
  ('66000000-0000-4000-8000-000000000204', 4, 'true_false_not_given', 'The coated roof areas were generally cooler at midday on clear days.', '66000000-0000-4000-8000-000000000111'),
  ('66000000-0000-4000-8000-000000000205', 5, 'true_false_not_given', 'The association paid each homeowner to join the pilot.', '66000000-0000-4000-8000-000000000111'),
  ('66000000-0000-4000-8000-000000000206', 6, 'matching_headings', 'Section A', '66000000-0000-4000-8000-000000000112'),
  ('66000000-0000-4000-8000-000000000207', 7, 'matching_headings', 'Section B', '66000000-0000-4000-8000-000000000112'),
  ('66000000-0000-4000-8000-000000000208', 8, 'matching_headings', 'Section C', '66000000-0000-4000-8000-000000000112'),
  ('66000000-0000-4000-8000-000000000209', 9, 'summary_completion', 'The project described ________ as its strongest result.', '66000000-0000-4000-8000-000000000113'),
  ('66000000-0000-4000-8000-000000000210', 10, 'summary_completion', 'A later inspection will examine whether cleaning and ________ affect performance.', '66000000-0000-4000-8000-000000000113')
) as seed(id, position, question_type, prompt, group_id)
where not exists (
  select 1
  from public.exercise_questions as existing
  where existing.id = seed.id::uuid
);

insert into public.exercise_options (id, question_id, position, label)
select seed.id::uuid, seed.question_id::uuid, seed.position, seed.label
from (values
  ('66000000-0000-4000-8000-000000000301', '66000000-0000-4000-8000-000000000201', 1, 'To prove that reflective roofs reduce energy use in every home'),
  ('66000000-0000-4000-8000-000000000302', '66000000-0000-4000-8000-000000000201', 2, 'To describe how the neighbourhood comparison was organised'),
  ('66000000-0000-4000-8000-000000000303', '66000000-0000-4000-8000-000000000201', 3, 'To explain why the project was cancelled'),
  ('66000000-0000-4000-8000-000000000304', '66000000-0000-4000-8000-000000000201', 4, 'To compare Bellwether with nearby fields'),
  ('66000000-0000-4000-8000-000000000305', '66000000-0000-4000-8000-000000000202', 1, 'Each roof contained treated and untreated areas.'),
  ('66000000-0000-4000-8000-000000000306', '66000000-0000-4000-8000-000000000202', 2, 'Sensors recorded measurements at regular intervals.'),
  ('66000000-0000-4000-8000-000000000307', '66000000-0000-4000-8000-000000000202', 3, 'All homes had identical windows and insulation.'),
  ('66000000-0000-4000-8000-000000000308', '66000000-0000-4000-8000-000000000202', 4, 'The study continued for a full year.'),
  ('66000000-0000-4000-8000-000000000309', '66000000-0000-4000-8000-000000000203', 1, 'True'),
  ('66000000-0000-4000-8000-000000000310', '66000000-0000-4000-8000-000000000203', 2, 'False'),
  ('66000000-0000-4000-8000-000000000311', '66000000-0000-4000-8000-000000000203', 3, 'Not Given'),
  ('66000000-0000-4000-8000-000000000312', '66000000-0000-4000-8000-000000000204', 1, 'True'),
  ('66000000-0000-4000-8000-000000000313', '66000000-0000-4000-8000-000000000204', 2, 'False'),
  ('66000000-0000-4000-8000-000000000314', '66000000-0000-4000-8000-000000000204', 3, 'Not Given'),
  ('66000000-0000-4000-8000-000000000315', '66000000-0000-4000-8000-000000000205', 1, 'True'),
  ('66000000-0000-4000-8000-000000000316', '66000000-0000-4000-8000-000000000205', 2, 'False'),
  ('66000000-0000-4000-8000-000000000317', '66000000-0000-4000-8000-000000000205', 3, 'Not Given'),
  ('66000000-0000-4000-8000-000000000318', '66000000-0000-4000-8000-000000000206', 1, 'Why heat differs across a city'),
  ('66000000-0000-4000-8000-000000000319', '66000000-0000-4000-8000-000000000206', 2, 'A practical split-roof trial'),
  ('66000000-0000-4000-8000-000000000320', '66000000-0000-4000-8000-000000000206', 3, 'Evidence with important limits'),
  ('66000000-0000-4000-8000-000000000321', '66000000-0000-4000-8000-000000000206', 4, 'Maintenance after installation'),
  ('66000000-0000-4000-8000-000000000322', '66000000-0000-4000-8000-000000000207', 1, 'Why heat differs across a city'),
  ('66000000-0000-4000-8000-000000000323', '66000000-0000-4000-8000-000000000207', 2, 'A practical split-roof trial'),
  ('66000000-0000-4000-8000-000000000324', '66000000-0000-4000-8000-000000000207', 3, 'Evidence with important limits'),
  ('66000000-0000-4000-8000-000000000325', '66000000-0000-4000-8000-000000000207', 4, 'Maintenance after installation'),
  ('66000000-0000-4000-8000-000000000326', '66000000-0000-4000-8000-000000000208', 1, 'Why heat differs across a city'),
  ('66000000-0000-4000-8000-000000000327', '66000000-0000-4000-8000-000000000208', 2, 'A practical split-roof trial'),
  ('66000000-0000-4000-8000-000000000328', '66000000-0000-4000-8000-000000000208', 3, 'Evidence with important limits'),
  ('66000000-0000-4000-8000-000000000329', '66000000-0000-4000-8000-000000000208', 4, 'Maintenance after installation')
) as seed(id, question_id, position, label)
where not exists (
  select 1
  from public.exercise_options as existing
  where existing.id = seed.id::uuid
);

insert into private.exercise_answer_keys (
  question_id,
  case_sensitive,
  explanation_markdown
)
select seed.question_id::uuid, false, seed.explanation
from (values
  ('66000000-0000-4000-8000-000000000201', 'Paragraph B explains the split-roof design, sensors and comparison method.'),
  ('66000000-0000-4000-8000-000000000202', 'The treated and untreated halves shared nearly the same weather, and sensors recorded measurements every fifteen minutes.'),
  ('66000000-0000-4000-8000-000000000203', 'The passage says temperatures can differ over only a few blocks, so the statement contradicts the text.'),
  ('66000000-0000-4000-8000-000000000204', 'Paragraph C states that coated areas were usually cooler during clear midday periods.'),
  ('66000000-0000-4000-8000-000000000205', 'Homeowner payment is not mentioned.'),
  ('66000000-0000-4000-8000-000000000206', 'Section A explains the local factors that make urban heat uneven.'),
  ('66000000-0000-4000-8000-000000000207', 'Section B describes the practical split-roof experiment.'),
  ('66000000-0000-4000-8000-000000000208', 'Section C reports the result while explaining why the indoor evidence was limited.'),
  ('66000000-0000-4000-8000-000000000209', 'The exact phrase used in paragraph C is “surface temperature”.'),
  ('66000000-0000-4000-8000-000000000210', 'Paragraph D pairs cleaning with maintenance in the follow-up question.')
) as seed(question_id, explanation)
where not exists (
  select 1
  from private.exercise_answer_keys as existing
  where existing.question_id = seed.question_id::uuid
);

insert into private.exercise_correct_options (question_id, option_id)
select seed.question_id::uuid, seed.option_id::uuid
from (values
  ('66000000-0000-4000-8000-000000000201', '66000000-0000-4000-8000-000000000302'),
  ('66000000-0000-4000-8000-000000000202', '66000000-0000-4000-8000-000000000305'),
  ('66000000-0000-4000-8000-000000000202', '66000000-0000-4000-8000-000000000306'),
  ('66000000-0000-4000-8000-000000000203', '66000000-0000-4000-8000-000000000310'),
  ('66000000-0000-4000-8000-000000000204', '66000000-0000-4000-8000-000000000312'),
  ('66000000-0000-4000-8000-000000000205', '66000000-0000-4000-8000-000000000317'),
  ('66000000-0000-4000-8000-000000000206', '66000000-0000-4000-8000-000000000318'),
  ('66000000-0000-4000-8000-000000000207', '66000000-0000-4000-8000-000000000323'),
  ('66000000-0000-4000-8000-000000000208', '66000000-0000-4000-8000-000000000328')
) as seed(question_id, option_id)
where not exists (
  select 1
  from private.exercise_correct_options as existing
  where existing.question_id = seed.question_id::uuid
    and existing.option_id = seed.option_id::uuid
);

insert into private.exercise_correct_text_answers (
  question_id,
  answer_text,
  normalized_answer
)
select seed.question_id::uuid, seed.answer_text, lower(seed.answer_text)
from (values
  ('66000000-0000-4000-8000-000000000209', 'surface temperature'),
  ('66000000-0000-4000-8000-000000000209', 'surface temperatures'),
  ('66000000-0000-4000-8000-000000000210', 'maintenance')
) as seed(question_id, answer_text)
where not exists (
  select 1
  from private.exercise_correct_text_answers as existing
  where existing.question_id = seed.question_id::uuid
    and existing.normalized_answer = lower(seed.answer_text)
);

update public.reading_passage_versions
set status = 'published', published_at = '2026-07-16T00:00:00Z'::timestamptz
where id = '66000000-0000-4000-8000-000000000002'::uuid
  and status = 'draft';

update public.exercise_set_versions
set status = 'published', published_at = '2026-07-16T00:00:00Z'::timestamptz
where id = '66000000-0000-4000-8000-000000000101'::uuid
  and status = 'draft';

insert into public.reading_passages (id, slug, test_type, display_order)
select
  '66000000-0000-4000-8000-000000000901'::uuid,
  'draft-river-restoration-notes',
  'academic',
  99
where not exists (
  select 1
  from public.reading_passages
  where id = '66000000-0000-4000-8000-000000000901'::uuid
);

insert into public.reading_passage_versions (
  id,
  reading_passage_id,
  version,
  title,
  summary,
  difficulty,
  status,
  source_name,
  source_url,
  licence
)
select
  '66000000-0000-4000-8000-000000000902'::uuid,
  '66000000-0000-4000-8000-000000000901'::uuid,
  1,
  'Draft river restoration notes',
  'An unpublished fixture used only to verify draft isolation.',
  'intermediate',
  'draft',
  'IELTS Self-study project editorial team',
  null,
  'Original project-authored content'
where not exists (
  select 1
  from public.reading_passage_versions
  where id = '66000000-0000-4000-8000-000000000902'::uuid
);

insert into public.exercise_sets (id, slug, domain, display_order)
select
  '66000000-0000-4000-8000-000000000903'::uuid,
  'draft-academic-reading-river-restoration',
  'reading',
  99
where not exists (
  select 1
  from public.exercise_sets
  where id = '66000000-0000-4000-8000-000000000903'::uuid
);

insert into public.exercise_set_versions (
  id,
  exercise_set_id,
  version,
  title,
  summary,
  instructions_markdown,
  difficulty,
  status,
  allow_review
)
select
  '66000000-0000-4000-8000-000000000904'::uuid,
  '66000000-0000-4000-8000-000000000903'::uuid,
  1,
  'Draft Academic Reading fixture',
  'Unpublished exercise fixture for RLS verification.',
  'This content must never be visible to learners.',
  'intermediate',
  'draft',
  true
where not exists (
  select 1
  from public.exercise_set_versions
  where id = '66000000-0000-4000-8000-000000000904'::uuid
);

commit;

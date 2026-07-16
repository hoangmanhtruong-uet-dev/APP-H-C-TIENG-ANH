begin;

insert into public.exercise_sets (id, slug, domain, display_order)
select seed.id::uuid, seed.slug, seed.domain, seed.display_order
from (values
  ('30000000-0000-4000-8000-000000000001', 'academic-vocabulary-foundations', 'vocabulary', 1),
  ('30000000-0000-4000-8000-000000000002', 'grammar-accuracy-foundations', 'grammar', 2),
  ('30000000-0000-4000-8000-000000000003', 'draft-content-review', 'grammar', 99)
) as seed (id, slug, domain, display_order)
where not exists (
  select 1 from public.exercise_sets as existing where existing.id = seed.id::uuid
);

insert into public.exercise_set_versions (
  id, exercise_set_id, version, title, summary, instructions_markdown,
  difficulty, status, allow_review
)
select
  seed.id::uuid,
  seed.exercise_set_id::uuid,
  seed.version,
  seed.title,
  seed.summary,
  seed.instructions_markdown,
  seed.difficulty,
  seed.status,
  seed.allow_review
from (values
  (
    '31000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    1,
    'Academic Vocabulary Foundations',
    'Practice a small set of original academic words used in IELTS learning contexts.',
    'Answer all four questions. Your work is saved after each answer, and explanations open after submission.',
    'beginner',
    'draft',
    true
  ),
  (
    '31000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002',
    1,
    'Grammar Accuracy Foundations',
    'Check subject-verb agreement, articles and sentence control.',
    'Choose or type the most accurate answer. Scoring is exact and does not use AI.',
    'beginner',
    'draft',
    true
  ),
  (
    '31000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000003',
    1,
    'Draft Grammar Review',
    'Unpublished fixture used to prove draft content remains hidden.',
    'This content must never appear to learners before publication.',
    'beginner',
    'draft',
    false
  )
) as seed (
  id, exercise_set_id, version, title, summary, instructions_markdown,
  difficulty, status, allow_review
)
where not exists (
  select 1 from public.exercise_set_versions as existing where existing.id = seed.id::uuid
);

insert into public.exercise_questions (
  id, exercise_set_version_id, position, question_type, prompt_markdown, points
)
select
  seed.id::uuid,
  seed.exercise_set_version_id::uuid,
  seed.position,
  seed.question_type,
  seed.prompt_markdown,
  seed.points
from (values
  ('32000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 1, 'single_choice', 'Which meaning best matches **mitigate**?', 1),
  ('32000000-0000-4000-8000-000000000002', '31000000-0000-4000-8000-000000000001', 2, 'multiple_choice', 'Select the two words that can positively describe a well-written argument.', 2),
  ('32000000-0000-4000-8000-000000000003', '31000000-0000-4000-8000-000000000001', 3, 'true_false', '**Allocate** can mean to distribute a limited resource for a particular purpose.', 1),
  ('32000000-0000-4000-8000-000000000004', '31000000-0000-4000-8000-000000000001', 4, 'short_text', 'Complete with one seeded vocabulary word: “Better planning can ___ the risk of delay.”', 1),
  ('32000000-0000-4000-8000-000000000005', '31000000-0000-4000-8000-000000000002', 1, 'single_choice', 'Choose the sentence with correct subject-verb agreement.', 1),
  ('32000000-0000-4000-8000-000000000006', '31000000-0000-4000-8000-000000000002', 2, 'multiple_choice', 'Select both sentences with correct article use.', 2),
  ('32000000-0000-4000-8000-000000000007', '31000000-0000-4000-8000-000000000002', 3, 'true_false', 'Every uncountable noun should be preceded by **a** or **an**.', 1),
  ('32000000-0000-4000-8000-000000000008', '31000000-0000-4000-8000-000000000002', 4, 'short_text', 'Complete the sentence with the correct verb: “The evidence ___ that the policy is effective.”', 1)
) as seed (id, exercise_set_version_id, position, question_type, prompt_markdown, points)
where not exists (
  select 1 from public.exercise_questions as existing where existing.id = seed.id::uuid
);

insert into public.exercise_options (id, question_id, position, label)
select seed.id::uuid, seed.question_id::uuid, seed.position, seed.label
from (values
  ('33000000-0000-4000-8000-000000000001', '32000000-0000-4000-8000-000000000001', 1, 'To make a harmful effect less severe'),
  ('33000000-0000-4000-8000-000000000002', '32000000-0000-4000-8000-000000000001', 2, 'To measure something precisely'),
  ('33000000-0000-4000-8000-000000000003', '32000000-0000-4000-8000-000000000001', 3, 'To remove every limitation'),
  ('33000000-0000-4000-8000-000000000004', '32000000-0000-4000-8000-000000000002', 1, 'coherent'),
  ('33000000-0000-4000-8000-000000000005', '32000000-0000-4000-8000-000000000002', 2, 'compelling'),
  ('33000000-0000-4000-8000-000000000006', '32000000-0000-4000-8000-000000000002', 3, 'prevalent'),
  ('33000000-0000-4000-8000-000000000007', '32000000-0000-4000-8000-000000000002', 4, 'limited'),
  ('33000000-0000-4000-8000-000000000008', '32000000-0000-4000-8000-000000000003', 1, 'True'),
  ('33000000-0000-4000-8000-000000000009', '32000000-0000-4000-8000-000000000003', 2, 'False'),
  ('33000000-0000-4000-8000-000000000010', '32000000-0000-4000-8000-000000000005', 1, 'The number of applicants increases each year.'),
  ('33000000-0000-4000-8000-000000000011', '32000000-0000-4000-8000-000000000005', 2, 'The number of applicants increase each year.'),
  ('33000000-0000-4000-8000-000000000012', '32000000-0000-4000-8000-000000000005', 3, 'A range of options is available to students.'),
  ('33000000-0000-4000-8000-000000000013', '32000000-0000-4000-8000-000000000006', 1, 'The study offers a useful explanation.'),
  ('33000000-0000-4000-8000-000000000014', '32000000-0000-4000-8000-000000000006', 2, 'Education can improve social mobility.'),
  ('33000000-0000-4000-8000-000000000015', '32000000-0000-4000-8000-000000000006', 3, 'The education is always a solution.'),
  ('33000000-0000-4000-8000-000000000016', '32000000-0000-4000-8000-000000000006', 4, 'A evidence supports the claim.'),
  ('33000000-0000-4000-8000-000000000017', '32000000-0000-4000-8000-000000000007', 1, 'True'),
  ('33000000-0000-4000-8000-000000000018', '32000000-0000-4000-8000-000000000007', 2, 'False')
) as seed (id, question_id, position, label)
where not exists (
  select 1 from public.exercise_options as existing where existing.id = seed.id::uuid
);

insert into private.exercise_answer_keys (question_id, case_sensitive, explanation_markdown)
select seed.question_id::uuid, seed.case_sensitive, seed.explanation_markdown
from (values
  ('32000000-0000-4000-8000-000000000001', false, '**Mitigate** means to reduce the severity or impact of something harmful.'),
  ('32000000-0000-4000-8000-000000000002', false, '**Coherent** describes clear logical organization; **compelling** describes something persuasive.'),
  ('32000000-0000-4000-8000-000000000003', false, '**Allocate** commonly means to assign or distribute a resource for a purpose.'),
  ('32000000-0000-4000-8000-000000000004', false, '**Mitigate** fits because planning can reduce the risk rather than remove it completely.'),
  ('32000000-0000-4000-8000-000000000005', false, 'The head noun **number** is singular, so it takes **increases**.'),
  ('32000000-0000-4000-8000-000000000006', false, 'Use **a** for one non-specific countable explanation. General abstract **education** takes no article here.'),
  ('32000000-0000-4000-8000-000000000007', false, 'Uncountable nouns usually do not take **a/an**. Their determiner depends on meaning and context.'),
  ('32000000-0000-4000-8000-000000000008', false, 'The singular subject **evidence** takes the singular verb **suggests**.')
) as seed (question_id, case_sensitive, explanation_markdown)
where not exists (
  select 1 from private.exercise_answer_keys as existing
  where existing.question_id = seed.question_id::uuid
);

insert into private.exercise_correct_options (question_id, option_id)
select seed.question_id::uuid, seed.option_id::uuid
from (values
  ('32000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001'),
  ('32000000-0000-4000-8000-000000000002', '33000000-0000-4000-8000-000000000004'),
  ('32000000-0000-4000-8000-000000000002', '33000000-0000-4000-8000-000000000005'),
  ('32000000-0000-4000-8000-000000000003', '33000000-0000-4000-8000-000000000008'),
  ('32000000-0000-4000-8000-000000000005', '33000000-0000-4000-8000-000000000010'),
  ('32000000-0000-4000-8000-000000000006', '33000000-0000-4000-8000-000000000013'),
  ('32000000-0000-4000-8000-000000000006', '33000000-0000-4000-8000-000000000014'),
  ('32000000-0000-4000-8000-000000000007', '33000000-0000-4000-8000-000000000018')
) as seed (question_id, option_id)
where not exists (
  select 1 from private.exercise_correct_options as existing
  where existing.question_id = seed.question_id::uuid
    and existing.option_id = seed.option_id::uuid
);

insert into private.exercise_correct_text_answers (
  question_id, answer_text, normalized_answer
)
select seed.question_id::uuid, seed.answer_text, seed.normalized_answer
from (values
  ('32000000-0000-4000-8000-000000000004', 'mitigate', 'mitigate'),
  ('32000000-0000-4000-8000-000000000008', 'suggests', 'suggests')
) as seed (question_id, answer_text, normalized_answer)
where not exists (
  select 1 from private.exercise_correct_text_answers as existing
  where existing.question_id = seed.question_id::uuid
    and existing.normalized_answer = seed.normalized_answer
);

update public.exercise_set_versions
set status = 'published', published_at = '2026-07-16T00:00:00Z'
where id in (
  '31000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000002'
)
and status = 'draft';

insert into public.vocabulary_entries (
  id, slug, normalized_term, part_of_speech, sense_key, display_order
)
select
  seed.id::uuid,
  seed.slug,
  seed.normalized_term,
  seed.part_of_speech,
  seed.sense_key,
  seed.display_order
from (values
  ('40000000-0000-4000-8000-000000000001', 'sustainable', 'sustainable', 'adjective', 'long-term', 1),
  ('40000000-0000-4000-8000-000000000002', 'mitigate', 'mitigate', 'verb', 'reduce-harm', 2),
  ('40000000-0000-4000-8000-000000000003', 'prevalent', 'prevalent', 'adjective', 'widespread', 3),
  ('40000000-0000-4000-8000-000000000004', 'allocate', 'allocate', 'verb', 'assign-resource', 4),
  ('40000000-0000-4000-8000-000000000005', 'compelling', 'compelling', 'adjective', 'persuasive', 5),
  ('40000000-0000-4000-8000-000000000006', 'coherent', 'coherent', 'adjective', 'logical', 6),
  ('40000000-0000-4000-8000-000000000007', 'constraint', 'constraint', 'noun', 'limitation', 7),
  ('40000000-0000-4000-8000-000000000008', 'evaluate', 'evaluate', 'verb', 'assess', 8)
) as seed (id, slug, normalized_term, part_of_speech, sense_key, display_order)
where not exists (
  select 1 from public.vocabulary_entries as existing where existing.id = seed.id::uuid
);

insert into public.vocabulary_entry_versions (
  id, vocabulary_entry_id, version, term, definition_vi, example_sentence,
  topic, tags, difficulty, status, related_exercise_set_id
)
select
  seed.id::uuid,
  seed.vocabulary_entry_id::uuid,
  seed.version,
  seed.term,
  seed.definition_vi,
  seed.example_sentence,
  seed.topic,
  seed.tags,
  seed.difficulty,
  seed.status,
  seed.related_exercise_set_id::uuid
from (values
  ('41000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 1, 'sustainable', 'có thể duy trì lâu dài mà không làm cạn kiệt nguồn lực', 'The city needs a sustainable transport plan that remains affordable over time.', 'environment', array['academic', 'policy'], 'beginner', 'draft', '30000000-0000-4000-8000-000000000001'),
  ('41000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 1, 'mitigate', 'làm giảm mức độ nghiêm trọng hoặc tác hại', 'Early intervention can mitigate the effects of prolonged learning loss.', 'society', array['academic', 'cause-effect'], 'intermediate', 'draft', '30000000-0000-4000-8000-000000000001'),
  ('41000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 1, 'prevalent', 'phổ biến hoặc thường gặp trong một nhóm hay khu vực', 'Remote work is increasingly prevalent in knowledge-based industries.', 'work', array['academic', 'trend'], 'intermediate', 'draft', '30000000-0000-4000-8000-000000000001'),
  ('41000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004', 1, 'allocate', 'phân bổ nguồn lực cho một mục đích cụ thể', 'Schools should allocate enough time to guided reading practice.', 'education', array['academic', 'resource'], 'beginner', 'draft', '30000000-0000-4000-8000-000000000001'),
  ('41000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000005', 1, 'compelling', 'thuyết phục mạnh nhờ lý lẽ hoặc bằng chứng rõ', 'The writer presents a compelling case for safer public spaces.', 'writing', array['argument', 'evaluation'], 'intermediate', 'draft', '30000000-0000-4000-8000-000000000001'),
  ('41000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000006', 1, 'coherent', 'mạch lạc, có các ý kết nối theo trình tự hợp lý', 'A coherent paragraph develops one central idea from start to finish.', 'writing', array['cohesion', 'argument'], 'beginner', 'draft', '30000000-0000-4000-8000-000000000001'),
  ('41000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000007', 1, 'constraint', 'điều kiện hoặc giới hạn làm thu hẹp lựa chọn', 'Limited funding is a major constraint on the research programme.', 'research', array['academic', 'limitation'], 'intermediate', 'draft', '30000000-0000-4000-8000-000000000001'),
  ('41000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000008', 1, 'evaluate', 'đánh giá chất lượng hoặc giá trị dựa trên tiêu chí', 'Readers should evaluate whether each claim is supported by evidence.', 'study-skills', array['academic', 'critical-thinking'], 'beginner', 'draft', '30000000-0000-4000-8000-000000000001')
) as seed (
  id, vocabulary_entry_id, version, term, definition_vi, example_sentence,
  topic, tags, difficulty, status, related_exercise_set_id
)
where not exists (
  select 1 from public.vocabulary_entry_versions as existing where existing.id = seed.id::uuid
);

update public.vocabulary_entry_versions
set status = 'published', published_at = '2026-07-16T00:00:00Z'
where id between '41000000-0000-4000-8000-000000000001' and '41000000-0000-4000-8000-000000000008'
and status = 'draft';

insert into public.grammar_topics (id, slug, display_order)
select seed.id::uuid, seed.slug, seed.display_order
from (values
  ('50000000-0000-4000-8000-000000000001', 'subject-verb-agreement', 1),
  ('50000000-0000-4000-8000-000000000002', 'articles-in-academic-writing', 2),
  ('50000000-0000-4000-8000-000000000003', 'controlled-complex-sentences', 3)
) as seed (id, slug, display_order)
where not exists (
  select 1 from public.grammar_topics as existing where existing.id = seed.id::uuid
);

insert into public.grammar_topic_versions (
  id, grammar_topic_id, version, title, explanation_markdown, examples,
  common_mistakes, difficulty, status, related_exercise_set_id
)
select
  seed.id::uuid,
  seed.grammar_topic_id::uuid,
  seed.version,
  seed.title,
  seed.explanation_markdown,
  seed.examples::jsonb,
  seed.common_mistakes::jsonb,
  seed.difficulty,
  seed.status,
  seed.related_exercise_set_id::uuid
from (values
  (
    '51000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    1,
    'Subject-verb agreement',
    'Find the **head noun** of the subject before choosing the verb. Extra phrases between the subject and verb do not change the number of the head noun.',
    '[{"correct":"The number of applicants increases each year.","note":"The head noun number is singular."},{"correct":"A range of options is available.","note":"Range is the head noun."}]',
    '[{"wrong":"The number of applicants increase each year.","correction":"Use increases because number is singular."}]',
    'beginner',
    'draft',
    '30000000-0000-4000-8000-000000000002'
  ),
  (
    '51000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000002',
    1,
    'Articles in academic writing',
    'Use **a/an** for one non-specific countable noun, **the** for a specific or already identified noun, and no article for many general plural or uncountable ideas.',
    '[{"correct":"The study offers a useful explanation.","note":"Explanation is singular and non-specific."},{"correct":"Education can improve mobility.","note":"Education is a general uncountable idea."}]',
    '[{"wrong":"A evidence supports the claim.","correction":"Evidence is uncountable; do not use a."}]',
    'beginner',
    'draft',
    '30000000-0000-4000-8000-000000000002'
  ),
  (
    '51000000-0000-4000-8000-000000000003',
    '50000000-0000-4000-8000-000000000003',
    1,
    'Controlled complex sentences',
    'A complex sentence needs one independent clause and at least one dependent clause. Choose the relationship first, then use a connector that expresses it accurately.',
    '[{"correct":"Although the policy is costly, it may reduce long-term demand.","note":"Although introduces a contrast clause."},{"correct":"Cities invest in transit because congestion is expensive.","note":"Because introduces a reason."}]',
    '[{"wrong":"Although the policy is costly. It may reduce demand.","correction":"Join the dependent clause to the independent clause."}]',
    'intermediate',
    'draft',
    '30000000-0000-4000-8000-000000000002'
  )
) as seed (
  id, grammar_topic_id, version, title, explanation_markdown, examples,
  common_mistakes, difficulty, status, related_exercise_set_id
)
where not exists (
  select 1 from public.grammar_topic_versions as existing where existing.id = seed.id::uuid
);

update public.grammar_topic_versions
set status = 'published', published_at = '2026-07-16T00:00:00Z'
where id between '51000000-0000-4000-8000-000000000001' and '51000000-0000-4000-8000-000000000003'
and status = 'draft';

commit;

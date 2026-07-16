begin;

insert into public.listening_audio_assets (
  id, slug, asset_path, mime_type, duration_seconds, sha256,
  source_name, source_url, licence
)
select
  '77000000-0000-4000-8000-000000000001'::uuid,
  'community-library-visit',
  '/audio/listening/community-library-visit.wav',
  'audio/wav',
  108,
  'c1ddac5f8cf92cb9e869f6ae4a93fcf04a08cce5d3df0a61b9caf0269097d0a5',
  'IELTS Self-study project editorial team',
  null,
  'Original project-authored script and project-generated speech audio'
where not exists (
  select 1 from public.listening_audio_assets
  where id = '77000000-0000-4000-8000-000000000001'::uuid
);

insert into private.listening_transcripts (audio_asset_id, transcript_markdown)
select
  '77000000-0000-4000-8000-000000000001'::uuid,
  E'**Part 1**\n\nLibrarian: Good morning, Northfield Community Library. How can I help?\n\nStudent: Hello. I have just moved nearby and I would like to join the library.\n\nLibrarian: Of course. Please bring a photo identity card and something that shows your current address. Registration is free.\n\nStudent: Great. When can I come in?\n\nLibrarian: We open at nine thirty from Monday to Saturday. On Thursday we stay open until eight in the evening. Other days we close at six.\n\nStudent: Is there a quiet place where I can study with my laptop?\n\nLibrarian: Yes. The study room is on the second floor. You can book a desk for two hours, and power sockets are available beside every desk.\n\n**Part 2**\n\nSpeaker: Here are three notices for visitors this Saturday. First, the local history talk has moved from Room Two to the main hall because more people have registered. It begins at eleven fifteen. Second, the children''s craft session is full, but families may join a waiting list at the information desk. Finally, the cafe will close at three o''clock for maintenance. Drinks may still be bought from the machine near the front entrance. Please keep all drinks away from the computer area. Thank you.'
where not exists (
  select 1 from private.listening_transcripts
  where audio_asset_id = '77000000-0000-4000-8000-000000000001'::uuid
);

insert into public.exercise_sets (id, slug, domain, display_order)
select
  '77000000-0000-4000-8000-000000000100'::uuid,
  'academic-listening-community-library',
  'listening',
  40
where not exists (
  select 1 from public.exercise_sets
  where id = '77000000-0000-4000-8000-000000000100'::uuid
);

insert into public.exercise_set_versions (
  id, exercise_set_id, version, title, summary, instructions_markdown,
  difficulty, status, allow_review
)
select
  '77000000-0000-4000-8000-000000000101'::uuid,
  '77000000-0000-4000-8000-000000000100'::uuid,
  1,
  'Community library visit',
  'Listen to an original library conversation and announcement, then answer 8 questions.',
  'Use the audio controls as needed. Your answers are saved automatically. The countdown is derived from the database; late submission remains available and is recorded in your result.',
  'beginner',
  'draft',
  true
where not exists (
  select 1 from public.exercise_set_versions
  where id = '77000000-0000-4000-8000-000000000101'::uuid
);

insert into public.listening_practice_versions (
  exercise_set_version_id, audio_asset_id, test_type, time_limit_seconds
)
select
  '77000000-0000-4000-8000-000000000101'::uuid,
  '77000000-0000-4000-8000-000000000001'::uuid,
  'academic',
  600
where not exists (
  select 1 from public.listening_practice_versions
  where exercise_set_version_id = '77000000-0000-4000-8000-000000000101'::uuid
);

insert into public.listening_parts (
  id, exercise_set_version_id, position, title, instructions_markdown,
  audio_start_seconds, audio_end_seconds
)
select seed.id::uuid, '77000000-0000-4000-8000-000000000101'::uuid,
  seed.position, seed.title, seed.instructions, seed.start_second, seed.end_second
from (values
  (
    '77000000-0000-4000-8000-000000000110', 1, 'Part 1: Joining the library',
    'Questions 1–4 refer to the telephone conversation. Choose or type the requested details.',
    0, 64
  ),
  (
    '77000000-0000-4000-8000-000000000111', 2, 'Part 2: Saturday notices',
    'Questions 5–8 refer to the library announcement. Choose or type the requested details.',
    64, 108
  )
) as seed(id, position, title, instructions, start_second, end_second)
where not exists (
  select 1 from public.listening_parts as existing where existing.id = seed.id::uuid
);

insert into public.exercise_questions (
  id, exercise_set_version_id, position, question_type, prompt_markdown,
  points, listening_part_id
)
select seed.id::uuid, '77000000-0000-4000-8000-000000000101'::uuid,
  seed.position, seed.question_type, seed.prompt, 1, seed.part_id::uuid
from (values
  ('77000000-0000-4000-8000-000000000201', 1, 'single_choice', 'What time does the library open from Monday to Saturday?', '77000000-0000-4000-8000-000000000110'),
  ('77000000-0000-4000-8000-000000000202', 2, 'multiple_choice', 'Which **two** items must a new member bring?', '77000000-0000-4000-8000-000000000110'),
  ('77000000-0000-4000-8000-000000000203', 3, 'short_text', 'The study room is on the ________.', '77000000-0000-4000-8000-000000000110'),
  ('77000000-0000-4000-8000-000000000204', 4, 'single_choice', 'For how long can a student book a desk?', '77000000-0000-4000-8000-000000000110'),
  ('77000000-0000-4000-8000-000000000205', 5, 'single_choice', 'Where will the local history talk take place?', '77000000-0000-4000-8000-000000000111'),
  ('77000000-0000-4000-8000-000000000206', 6, 'short_text', 'The local history talk begins at ________.', '77000000-0000-4000-8000-000000000111'),
  ('77000000-0000-4000-8000-000000000207', 7, 'multiple_choice', 'Which **two** Saturday notices are correct?', '77000000-0000-4000-8000-000000000111'),
  ('77000000-0000-4000-8000-000000000208', 8, 'short_text', 'The drinks machine is near the ________.', '77000000-0000-4000-8000-000000000111')
) as seed(id, position, question_type, prompt, part_id)
where not exists (
  select 1 from public.exercise_questions as existing where existing.id = seed.id::uuid
);

insert into public.exercise_options (id, question_id, position, label)
select seed.id::uuid, seed.question_id::uuid, seed.position, seed.label
from (values
  ('77000000-0000-4000-8000-000000000301', '77000000-0000-4000-8000-000000000201', 1, '9:00'),
  ('77000000-0000-4000-8000-000000000302', '77000000-0000-4000-8000-000000000201', 2, '9:30'),
  ('77000000-0000-4000-8000-000000000303', '77000000-0000-4000-8000-000000000201', 3, '10:00'),
  ('77000000-0000-4000-8000-000000000304', '77000000-0000-4000-8000-000000000202', 1, 'A photo identity card'),
  ('77000000-0000-4000-8000-000000000305', '77000000-0000-4000-8000-000000000202', 2, 'Proof of the current address'),
  ('77000000-0000-4000-8000-000000000306', '77000000-0000-4000-8000-000000000202', 3, 'A registration payment'),
  ('77000000-0000-4000-8000-000000000307', '77000000-0000-4000-8000-000000000202', 4, 'A passport photograph'),
  ('77000000-0000-4000-8000-000000000308', '77000000-0000-4000-8000-000000000204', 1, '1 hour'),
  ('77000000-0000-4000-8000-000000000309', '77000000-0000-4000-8000-000000000204', 2, '2 hours'),
  ('77000000-0000-4000-8000-000000000310', '77000000-0000-4000-8000-000000000204', 3, 'All day'),
  ('77000000-0000-4000-8000-000000000311', '77000000-0000-4000-8000-000000000205', 1, 'Room Two'),
  ('77000000-0000-4000-8000-000000000312', '77000000-0000-4000-8000-000000000205', 2, 'The main hall'),
  ('77000000-0000-4000-8000-000000000313', '77000000-0000-4000-8000-000000000205', 3, 'The information desk'),
  ('77000000-0000-4000-8000-000000000314', '77000000-0000-4000-8000-000000000207', 1, 'The craft session still has places available.'),
  ('77000000-0000-4000-8000-000000000315', '77000000-0000-4000-8000-000000000207', 2, 'Families can join a waiting list for the craft session.'),
  ('77000000-0000-4000-8000-000000000316', '77000000-0000-4000-8000-000000000207', 3, 'The cafe closes at 3:00 for maintenance.'),
  ('77000000-0000-4000-8000-000000000317', '77000000-0000-4000-8000-000000000207', 4, 'Drinks are allowed in the computer area.')
) as seed(id, question_id, position, label)
where not exists (
  select 1 from public.exercise_options as existing where existing.id = seed.id::uuid
);

insert into private.exercise_answer_keys (question_id, case_sensitive, explanation_markdown)
select seed.question_id::uuid, false, seed.explanation
from (values
  ('77000000-0000-4000-8000-000000000201', 'The librarian says the library opens at nine thirty.'),
  ('77000000-0000-4000-8000-000000000202', 'A photo identity card and proof of the current address are required; registration is free.'),
  ('77000000-0000-4000-8000-000000000203', 'The librarian places the study room on the second floor.'),
  ('77000000-0000-4000-8000-000000000204', 'A desk can be booked for two hours.'),
  ('77000000-0000-4000-8000-000000000205', 'The announcement moves the talk from Room Two to the main hall.'),
  ('77000000-0000-4000-8000-000000000206', 'The announced start time is eleven fifteen.'),
  ('77000000-0000-4000-8000-000000000207', 'The craft waiting list is available and the cafe closes at three for maintenance.'),
  ('77000000-0000-4000-8000-000000000208', 'The drinks machine is near the front entrance.')
) as seed(question_id, explanation)
where not exists (
  select 1 from private.exercise_answer_keys as existing
  where existing.question_id = seed.question_id::uuid
);

insert into private.exercise_correct_options (question_id, option_id)
select seed.question_id::uuid, seed.option_id::uuid
from (values
  ('77000000-0000-4000-8000-000000000201', '77000000-0000-4000-8000-000000000302'),
  ('77000000-0000-4000-8000-000000000202', '77000000-0000-4000-8000-000000000304'),
  ('77000000-0000-4000-8000-000000000202', '77000000-0000-4000-8000-000000000305'),
  ('77000000-0000-4000-8000-000000000204', '77000000-0000-4000-8000-000000000309'),
  ('77000000-0000-4000-8000-000000000205', '77000000-0000-4000-8000-000000000312'),
  ('77000000-0000-4000-8000-000000000207', '77000000-0000-4000-8000-000000000315'),
  ('77000000-0000-4000-8000-000000000207', '77000000-0000-4000-8000-000000000316')
) as seed(question_id, option_id)
where not exists (
  select 1 from private.exercise_correct_options as existing
  where existing.question_id = seed.question_id::uuid
    and existing.option_id = seed.option_id::uuid
);

insert into private.exercise_correct_text_answers (question_id, answer_text, normalized_answer)
select seed.question_id::uuid, seed.answer_text, lower(seed.answer_text)
from (values
  ('77000000-0000-4000-8000-000000000203', 'second floor'),
  ('77000000-0000-4000-8000-000000000206', '11:15'),
  ('77000000-0000-4000-8000-000000000206', 'eleven fifteen'),
  ('77000000-0000-4000-8000-000000000208', 'front entrance')
) as seed(question_id, answer_text)
where not exists (
  select 1 from private.exercise_correct_text_answers as existing
  where existing.question_id = seed.question_id::uuid
    and existing.normalized_answer = lower(seed.answer_text)
);

update public.exercise_set_versions
set status = 'published', published_at = '2026-07-16T00:00:00Z'::timestamptz
where id = '77000000-0000-4000-8000-000000000101'::uuid
  and status = 'draft';

insert into public.listening_audio_assets (
  id, slug, asset_path, mime_type, duration_seconds, sha256,
  source_name, source_url, licence
)
select
  '77000000-0000-4000-8000-000000000901'::uuid,
  'draft-campus-tour',
  '/audio/listening/draft-campus-tour.wav',
  'audio/wav',
  60,
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'IELTS Self-study project editorial team',
  null,
  'Unpublished original fixture; no public binary is shipped'
where not exists (
  select 1 from public.listening_audio_assets
  where id = '77000000-0000-4000-8000-000000000901'::uuid
);

insert into private.listening_transcripts (audio_asset_id, transcript_markdown)
select '77000000-0000-4000-8000-000000000901'::uuid,
  'Draft transcript fixture. Learners must never receive this content.'
where not exists (
  select 1 from private.listening_transcripts
  where audio_asset_id = '77000000-0000-4000-8000-000000000901'::uuid
);

insert into public.exercise_sets (id, slug, domain, display_order)
select
  '77000000-0000-4000-8000-000000000902'::uuid,
  'draft-academic-listening-campus-tour',
  'listening',
  99
where not exists (
  select 1 from public.exercise_sets
  where id = '77000000-0000-4000-8000-000000000902'::uuid
);

insert into public.exercise_set_versions (
  id, exercise_set_id, version, title, summary, instructions_markdown,
  difficulty, status, allow_review
)
select
  '77000000-0000-4000-8000-000000000903'::uuid,
  '77000000-0000-4000-8000-000000000902'::uuid,
  1,
  'Draft campus tour fixture',
  'Unpublished Listening fixture for actor-real RLS verification.',
  'This draft must never be visible to learners.',
  'beginner',
  'draft',
  true
where not exists (
  select 1 from public.exercise_set_versions
  where id = '77000000-0000-4000-8000-000000000903'::uuid
);

insert into public.listening_practice_versions (
  exercise_set_version_id, audio_asset_id, test_type, time_limit_seconds
)
select
  '77000000-0000-4000-8000-000000000903'::uuid,
  '77000000-0000-4000-8000-000000000901'::uuid,
  'academic',
  300
where not exists (
  select 1 from public.listening_practice_versions
  where exercise_set_version_id = '77000000-0000-4000-8000-000000000903'::uuid
);

commit;

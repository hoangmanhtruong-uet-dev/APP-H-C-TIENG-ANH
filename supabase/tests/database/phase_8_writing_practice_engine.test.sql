begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'writing_feedback_signing_secret') then
    perform vault.create_secret('phase8-local-test-signing-secret', 'writing_feedback_signing_secret', 'Transaction-scoped Phase 8 test secret');
  end if;
end;
$$;

create function pg_temp.feedback_payload()
returns text
language sql
immutable
as $$
  select jsonb_build_object(
    'overallBandEstimate', 6.5,
    'confidence', 'medium',
    'summary', 'A useful draft with a clear position. This estimate is practice guidance, not an official IELTS score.',
    'criteria', jsonb_build_object(
      'taskResponse', jsonb_build_object('band', 6.5, 'comment', 'Position is clear.', 'evidence', jsonb_build_array('Urban green spaces improve daily life.')),
      'coherenceCohesion', jsonb_build_object('band', 6.5, 'comment', 'Ideas are connected.', 'evidence', jsonb_build_array('Urban green spaces improve daily life.')),
      'lexicalResource', jsonb_build_object('band', 6.0, 'comment', 'Vocabulary is generally clear.', 'evidence', jsonb_build_array('Urban green spaces improve daily life.')),
      'grammaticalRangeAccuracy', jsonb_build_object('band', 6.0, 'comment', 'Sentences are controlled.', 'evidence', jsonb_build_array('Urban green spaces improve daily life.'))
    ),
    'strengths', jsonb_build_array('A direct opening position.'),
    'priorityIssues', jsonb_build_array(
      jsonb_build_object('issue', 'Develop the housing comparison.', 'evidence', 'Urban green spaces improve daily life.'),
      jsonb_build_object('issue', 'Add a specific example.', 'evidence', 'Urban green spaces improve daily life.'),
      jsonb_build_object('issue', 'Vary sentence openings.', 'evidence', 'Urban green spaces improve daily life.')
    ),
    'revisionPlan', jsonb_build_array('Clarify the thesis.', 'Develop two body paragraphs.', 'Check links between ideas.'),
    'correctedExamples', jsonb_build_array(
      jsonb_build_object('source', 'Urban green spaces improve daily life.', 'revision', 'Well-planned urban green spaces can improve residents'' daily lives.')
    ),
    'meta', jsonb_build_object('provider', 'openai', 'modelLabel', 'phase8-test-model', 'inputTokens', 100, 'outputTokens', 200, 'latencyMs', 300)
  )::text;
$$;

create function pg_temp.feedback_signature(run_id uuid, expires_at timestamptz)
returns text
language sql
security definer
set search_path = ''
as $$
  select encode(
    extensions.hmac(
      convert_to(
        'writing-feedback-v1:' || run_id::text || ':' || runs.finalize_nonce::text || ':'
          || extract(epoch from expires_at)::bigint::text || ':' || pg_temp.feedback_payload(),
        'UTF8'
      ),
      convert_to(private.writing_signing_secret(), 'UTF8'),
      'sha256'
    ),
    'hex'
  )
  from public.writing_feedback_runs as runs
  where runs.id = run_id;
$$;

select extensions.has_table('public', 'writing_tasks', 'Writing task identities exist');
select extensions.has_table('public', 'writing_task_versions', 'Writing task versions exist');
select extensions.has_table('public', 'writing_submissions', 'Writing submissions exist');
select extensions.has_table('public', 'writing_feedback_runs', 'Writing feedback runs exist');
select extensions.has_table('public', 'writing_feedback', 'Validated Writing feedback exists');
select extensions.ok(
  (select bool_and(relrowsecurity) from pg_catalog.pg_class where oid in (
    'public.writing_tasks'::regclass,
    'public.writing_task_versions'::regclass,
    'public.writing_submissions'::regclass,
    'public.writing_feedback_runs'::regclass,
    'public.writing_feedback'::regclass
  )),
  'RLS is enabled on every Phase 8 public table'
);
select extensions.ok(
  has_table_privilege('authenticated', 'public.writing_tasks', 'select')
  and not has_table_privilege('authenticated', 'public.writing_tasks', 'insert')
  and not has_table_privilege('authenticated', 'public.writing_submissions', 'insert')
  and not has_table_privilege('authenticated', 'public.writing_submissions', 'update')
  and not has_table_privilege('authenticated', 'public.writing_feedback', 'insert'),
  'authenticated is read-only at table level and must mutate through RPCs'
);
select extensions.is_definer('public', 'start_writing_submission', array['text', 'text'], 'Writing start RPC is security definer');
select extensions.is_definer('public', 'save_writing_draft', array['uuid', 'text', 'integer'], 'Writing autosave RPC is security definer');
select extensions.is_definer('public', 'submit_writing_submission', array['uuid', 'text'], 'Writing submit RPC is security definer');
select extensions.results_eq(
  $$select count(*)::integer from public.writing_task_versions where status = 'published'$$,
  array[1],
  'seed has one original published Writing task'
);
select extensions.results_eq(
  $$select count(*)::integer from public.writing_task_versions where status = 'draft'$$,
  array[1],
  'seed has one draft visibility fixture'
);
select extensions.throws_ok(
  $$update public.writing_task_versions set prompt_text = 'Changed' where id = '82000000-0000-4000-8000-000000000001'$$,
  '55000', 'published writing content is immutable',
  'published Writing task snapshot cannot be edited'
);

insert into auth.users (id, email, raw_user_meta_data) values
  ('88111111-1111-4111-8111-111111111111', 'phase8-user-a@example.test', '{"display_name":"Phase 8 Learner A"}'::jsonb),
  ('88222222-2222-4222-8222-222222222222', 'phase8-user-b@example.test', '{"display_name":"Phase 8 Learner B"}'::jsonb),
  ('88333333-3333-4333-8333-333333333333', 'phase8-user-gt@example.test', '{"display_name":"Phase 8 GT Learner"}'::jsonb);

insert into public.learner_profiles (
  user_id, test_type, current_band, target_band, daily_study_minutes,
  study_days_per_week, priority_skills, primary_goal, onboarding_step, onboarding_completed_at
) values
  ('88111111-1111-4111-8111-111111111111', 'academic', 5.0, 7.0, 45, 5, array['writing']::text[], 'study_abroad', 8, now()),
  ('88222222-2222-4222-8222-222222222222', 'academic', 5.5, 7.0, 30, 4, array['writing']::text[], 'work', 8, now()),
  ('88333333-3333-4333-8333-333333333333', 'general_training', 5.0, 6.5, 30, 4, array['writing']::text[], 'work', 8, now());

set local role authenticated;
set local request.jwt.claim.sub = '88111111-1111-4111-8111-111111111111';

select extensions.results_eq($$select count(*)::integer from public.writing_tasks$$, array[1], 'Academic learner sees only accessible published Writing task');
select extensions.results_eq($$select count(*)::integer from public.writing_task_versions where status = 'draft'$$, array[0], 'learner cannot read draft Writing content');
select extensions.lives_ok($$select public.start_writing_submission('community-green-spaces', 'phase8-a-start-1')$$, 'learner starts published Writing task');
select extensions.lives_ok($$select public.start_writing_submission('community-green-spaces', 'phase8-a-start-1')$$, 'Writing start replays idempotently');
select extensions.results_eq($$select count(*)::integer from public.writing_submissions$$, array[1], 'idempotent start creates one draft');
select extensions.ok(
  (select expires_at = started_at + interval '2400 seconds'
      and server_revision = 0
   from public.writing_submissions where start_idempotency_key = 'phase8-a-start-1'),
  'Writing timer and initial revision are database-derived'
);
select extensions.throws_ok(
  $$select public.start_writing_feedback_request((select id from public.writing_submissions limit 1), 'phase8-feedback-too-early', 'writing-ai-v1')$$,
  '55000', 'feedback requires a submitted writing',
  'AI review remains closed before submit'
);
select extensions.lives_ok(
  $$select public.save_writing_draft((select id from public.writing_submissions limit 1), 'Urban green spaces improve daily life. ' || repeat('Supporting ideas need careful explanation and practical local examples. ', 45), 0)$$,
  'Writing draft autosaves through owner RPC'
);
select extensions.ok(
  (select server_revision = 1 and word_count > 250 and minimum_words_met
   from public.writing_submissions where start_idempotency_key = 'phase8-a-start-1'),
  'database owns revision, word count and minimum-word state'
);
select extensions.throws_ok(
  $$select public.save_writing_draft((select id from public.writing_submissions limit 1), 'Conflicting stale text', 0)$$,
  '40001', 'stale or conflicting writing revision',
  'stale autosave with a different payload is rejected'
);
select extensions.lives_ok(
  $$select public.submit_writing_submission((select id from public.writing_submissions limit 1), 'phase8-a-submit-1')$$,
  'Writing submit atomically snapshots the essay'
);
select extensions.lives_ok(
  $$select public.submit_writing_submission((select id from public.writing_submissions limit 1), 'phase8-a-submit-retry')$$,
  'Writing submit is idempotent after success'
);
select extensions.ok(
  (select status = 'submitted' and submitted_text = draft_text
      and submitted_at is not null and content_checksum ~ '^[0-9a-f]{64}$'
   from public.writing_submissions where start_idempotency_key = 'phase8-a-start-1'),
  'submitted essay is a database-timestamped immutable snapshot'
);
select extensions.throws_ok(
  $$select public.save_writing_draft((select id from public.writing_submissions limit 1), 'Changed after submit', 1)$$,
  '55000', 'submitted writing is immutable',
  'submitted essay cannot be edited'
);
select extensions.ok(public.get_writing_ai_configuration_state(), 'AI signing configuration state is available without exposing the secret');
select extensions.lives_ok(
  $$select public.start_writing_feedback_request((select id from public.writing_submissions limit 1), 'phase8-feedback-1', 'writing-ai-v1')$$,
  'owner starts optional AI feedback after submit'
);
select extensions.throws_ok(
  $$select public.finalize_writing_feedback((select id from public.writing_feedback_runs limit 1), pg_temp.feedback_payload(), now() + interval '2 minutes', repeat('0', 64))$$,
  '42501', 'invalid writing feedback signature',
  'learner cannot forge AI feedback'
);
select set_config('phase8.feedback_expires_at', (now() + interval '2 minutes')::text, true);
select extensions.lives_ok(
  $$select public.finalize_writing_feedback(
    (select id from public.writing_feedback_runs limit 1),
    pg_temp.feedback_payload(),
    current_setting('phase8.feedback_expires_at')::timestamptz,
    pg_temp.feedback_signature(
      (select id from public.writing_feedback_runs limit 1),
      current_setting('phase8.feedback_expires_at')::timestamptz
    )
  )$$,
  'valid server-signed structured feedback finalizes atomically'
);
select extensions.ok(
  (select runs.status = 'ready' and feedback.confidence = 'medium' and feedback.overall_band_estimate = 6.5
   from public.writing_feedback_runs as runs
   join public.writing_feedback as feedback on feedback.run_id = runs.id),
  'validated immutable feedback is readable after finalize'
);
select extensions.throws_ok(
  $$update public.writing_feedback set summary = 'Changed'$$,
  '42501', 'permission denied for table writing_feedback',
  'learner has no direct feedback mutation grant'
);

set local request.jwt.claim.sub = '88222222-2222-4222-8222-222222222222';
select extensions.results_eq($$select count(*)::integer from public.writing_submissions$$, array[0], 'user B cannot read user A submission');
select extensions.results_eq($$select count(*)::integer from public.writing_feedback$$, array[0], 'user B cannot read user A feedback');

set local request.jwt.claim.sub = '88333333-3333-4333-8333-333333333333';
select extensions.results_eq($$select count(*)::integer from public.writing_tasks$$, array[0], 'GT learner cannot read Academic-only Writing task');
select extensions.throws_ok(
  $$select public.start_writing_submission('community-green-spaces', 'phase8-gt-start-1')$$,
  'P0002', 'writing task not found',
  'GT learner cannot start Academic Writing task'
);

reset role;
set local role anon;
select extensions.throws_ok('select count(*) from public.writing_tasks', '42501', 'permission denied for table writing_tasks', 'anonymous cannot read Writing content');
select extensions.throws_ok(
  $$select public.start_writing_submission('community-green-spaces', 'phase8-anon-start')$$,
  '42501', 'permission denied for function start_writing_submission',
  'anonymous cannot start Writing submission'
);

reset role;
select * from extensions.finish();
rollback;
